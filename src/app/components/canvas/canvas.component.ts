import {
  Component, ElementRef, NgZone, OnDestroy, PLATFORM_ID,
  ViewChild, computed, inject, signal,
} from '@angular/core';
import { isPlatformBrowser, NgClass, NgStyle } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import { CarouselPreviewComponent } from '../carousel-preview/carousel-preview.component';
import type { AlignValue, CanvasElement, Row, Section, SectionType } from '../../models/page.model';

const GRID = 40;

type HeaderContentMode = 'none' | 'logo' | 'nav';
type FooterContentMode = 'none' | 'logo' | 'nav' | 'copyright';

interface ResizeState {
  id: string;
  handle: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  context: 'free' | 'section';
  rowId?: string;
  sectionId?: string;
}

interface HeightResizeState {
  startY: number;
  origHeight: number;
  target: 'header' | 'footer' | 'section';
  rowId?: string;
  sectionId?: string;
}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [NgClass, NgStyle, CarouselPreviewComponent],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.css',
})
export class CanvasComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('sectionFileInput') sectionFileInput!: ElementRef<HTMLInputElement>;

  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  readonly handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
  readonly alignOptions: AlignValue[] = ['left', 'center', 'right'];

  // Drag state
  isDraggingSection = signal(false);
  draggingExistingRowId = signal<string | null>(null);
  hoverRowId = signal<string | null>(null); // row being hovered for "add alongside"

  // Inline header/footer editing
  headerContentMode = signal<HeaderContentMode>('none');
  footerContentMode = signal<FooterContentMode>('none');

  // Image upload
  private pendingImageId: string | null = null;
  private pendingImageContext: 'free' | 'footer' | null = null;
  private pendingSectionImageRowId: string | null = null;
  private pendingSectionImageSectionId: string | null = null;
  private pendingSectionImageElementId: string | null = null;

  // Resize
  private resizeState: ResizeState | null = null;
  private isResizing = false;
  private heightResizeState: HeightResizeState | null = null;

  // ── Computed ──────────────────────────────────────────────────────────

  pageBgStyle = computed((): Record<string, string> => {
    const bg = this.es.activePage().background;
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value || '#ffffff' };
  });

  elementsAreaHeight = computed((): number => {
    const els = this.es.elements();
    if (!els.length) return 200;
    return Math.max(200, els.reduce((max, el) => Math.max(max, (el.y + el.height) * GRID), 0) + GRID * 2);
  });

  headerStyle = computed((): Record<string, string> => {
    const bg = this.es.activeHeader().background;
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value || '#2c3e7a' };
  });

  footerStyle = computed((): Record<string, string> => {
    const bg = this.es.activeFooter().background;
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value || '#313136' };
  });

  sectionBgStyle(section: Section): Record<string, string> {
    const bg = section.backgroundOverride;
    if (!bg) return {};
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value };
  }

  getElementStyle(el: CanvasElement): Record<string, string> {
    return {
      position: 'absolute',
      left: el.x * GRID + 'px',
      top: el.y * GRID + 'px',
      width: el.width * GRID + 'px',
      height: el.height * GRID + 'px',
      color: this.es.resolveColor(el.styles, 'color'),
      fontSize: (el.styles?.fontSize ?? 16) + 'px',
      backgroundColor: this.es.resolveColor(el.styles, 'backgroundColor'),
      borderRadius: (el.styles?.borderRadius ?? 0) + 'px',
    };
  }

  sectionWidthClass(section: Section): string {
    return 'section-width-' + section.width;
  }

  // ── Canvas drag/drop (elements area) ─────────────────────────────────

  onElementsAreaDragOver(event: DragEvent): void {
    event.preventDefault();
    const types = event.dataTransfer?.types ?? [];
    if (types.includes('sectiontype') || types.includes('reorderrowid')) {
      this.isDraggingSection.set(true);
      this.es.dragInsertIndex.set(this.calculateRowInsertIndex(event));
    }
  }

  onElementsAreaDragLeave(event: DragEvent): void {
    const rt = event.relatedTarget as HTMLElement | null;
    if (!rt || !(event.currentTarget as HTMLElement).contains(rt)) {
      this.isDraggingSection.set(false);
      this.draggingExistingRowId.set(null);
      this.es.dragInsertIndex.set(null);
    }
  }

  onElementsAreaDrop(event: DragEvent): void {
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;

    // Move existing free element
    const moveId = event.dataTransfer?.getData('moveElementId');
    if (moveId) {
      const ox = parseInt(event.dataTransfer?.getData('dragOffsetX') || '0', 10);
      const oy = parseInt(event.dataTransfer?.getData('dragOffsetY') || '0', 10);
      const areaEl = event.currentTarget as HTMLElement;
      const rect = areaEl.getBoundingClientRect();
      const gx = Math.max(0, Math.floor((event.clientX - rect.left) / GRID) - ox);
      const gy = Math.max(0, Math.floor((event.clientY - rect.top) / GRID) - oy);
      this.es.moveElement(moveId, gx, gy);
      return;
    }

    // New element from panel
    const elementType = event.dataTransfer?.getData('elementType');
    if (elementType) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const gx = Math.max(0, Math.floor((event.clientX - rect.left) / GRID));
      const gy = Math.max(0, Math.floor((event.clientY - rect.top) / GRID));
      const id = this.es.addElement(elementType as any, gx, gy);
      if (elementType === 'image') {
        this.pendingImageId = id;
        this.pendingImageContext = 'free';
        this.fileInput?.nativeElement.click();
      }
      return;
    }
  }

  onRowsDragOver(event: DragEvent): void {
    event.preventDefault();
    const types = event.dataTransfer?.types ?? [];
    if (types.includes('sectiontype') || types.includes('reorderrowid')) {
      this.isDraggingSection.set(true);
      this.es.dragInsertIndex.set(this.calculateRowInsertIndex(event));
    }
  }

  onRowsDrop(event: DragEvent): void {
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;

    const reorderRowId = event.dataTransfer?.getData('reorderRowId');
    if (reorderRowId) {
      const fromIndex = parseInt(event.dataTransfer?.getData('reorderRowIndex') || '0', 10);
      const insertIndex = this.es.dragInsertIndex() ?? this.es.rows().length;
      const toIndex = insertIndex > fromIndex ? Math.max(0, insertIndex - 1) : insertIndex;
      if (toIndex !== fromIndex) this.es.reorderRow(fromIndex, toIndex);
      this.isDraggingSection.set(false);
      this.draggingExistingRowId.set(null);
      this.es.dragInsertIndex.set(null);
      return;
    }

    const sectionType = event.dataTransfer?.getData('sectionType');
    if (sectionType) {
      const idx = this.es.dragInsertIndex() ?? this.es.rows().length;
      this.es.addSectionAsNewRow(sectionType as SectionType, idx);
      this.isDraggingSection.set(false);
      this.es.dragInsertIndex.set(null);
    }
  }

  // ── Drop onto existing section (add alongside) ────────────────────────

  onSectionBodyDragOver(event: DragEvent, rowId: string): void {
    event.preventDefault();
    event.stopPropagation();
    const types = event.dataTransfer?.types ?? [];
    if (types.includes('sectiontype')) {
      this.hoverRowId.set(rowId);
    } else if (types.includes('elementtype')) {
      // let through for element drop
    }
  }

  onSectionBodyDragLeave(event: DragEvent, rowId: string): void {
    const rt = event.relatedTarget as HTMLElement | null;
    if (!rt || !(event.currentTarget as HTMLElement).contains(rt)) {
      if (this.hoverRowId() === rowId) this.hoverRowId.set(null);
    }
  }

  onSectionBodyDrop(event: DragEvent, row: Row, section: Section): void {
    event.preventDefault();
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;

    // Section type: add alongside
    const sectionType = event.dataTransfer?.getData('sectionType');
    if (sectionType) {
      const currentRow = this.es.rows().find(r => r.id === row.id);
      if (currentRow && currentRow.sections.length < 3) {
        this.es.addSectionToRow(row.id, sectionType as SectionType);
      } else {
        this.es.addSectionAsNewRow(sectionType as SectionType, row.order + 1);
      }
      this.hoverRowId.set(null);
      return;
    }

    // Element type: add to section
    const elementType = event.dataTransfer?.getData('elementType');
    if (elementType) {
      const bodyEl = event.currentTarget as HTMLElement;
      const rect = bodyEl.getBoundingClientRect();
      const gx = Math.max(0, Math.floor((event.clientX - rect.left) / GRID));
      const gy = Math.max(0, Math.floor((event.clientY - rect.top) / GRID));
      const id = this.es.addElementToSection(row.id, section.id, elementType as any, gx, gy);
      if (elementType === 'image') {
        this.pendingSectionImageRowId = row.id;
        this.pendingSectionImageSectionId = section.id;
        this.pendingSectionImageElementId = id;
        this.sectionFileInput?.nativeElement.click();
      }
      return;
    }

    // Move existing section element
    const moveId = event.dataTransfer?.getData('moveSectionElementId');
    if (moveId) {
      const ox = parseInt(event.dataTransfer?.getData('dragOffsetX') || '0', 10);
      const oy = parseInt(event.dataTransfer?.getData('dragOffsetY') || '0', 10);
      const bodyEl = event.currentTarget as HTMLElement;
      const rect = bodyEl.getBoundingClientRect();
      const gx = Math.max(0, Math.floor((event.clientX - rect.left) / GRID) - ox);
      const gy = Math.max(0, Math.floor((event.clientY - rect.top) / GRID) - oy);
      this.es.moveElementInSection(row.id, section.id, moveId, gx, gy);
    }
  }

  // ── Element interactions ──────────────────────────────────────────────

  onFreeElementDragStart(event: DragEvent, el: CanvasElement): void {
    if (this.isResizing) { event.preventDefault(); return; }
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;
    event.dataTransfer?.setData('moveElementId', el.id);
    event.dataTransfer?.setData('dragOffsetX', String(Math.floor(event.offsetX / GRID)));
    event.dataTransfer?.setData('dragOffsetY', String(Math.floor(event.offsetY / GRID)));
  }

  onSectionElementDragStart(event: DragEvent, el: CanvasElement): void {
    if (this.isResizing) { event.preventDefault(); return; }
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;
    event.dataTransfer?.setData('moveSectionElementId', el.id);
    event.dataTransfer?.setData('dragOffsetX', String(Math.floor(event.offsetX / GRID)));
    event.dataTransfer?.setData('dragOffsetY', String(Math.floor(event.offsetY / GRID)));
  }

  onFreeElementClick(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.clearHeaderFooterMode();
    this.es.selectElement(id);
  }

  onSectionElementClick(event: MouseEvent, el: CanvasElement, rowId: string, sectionId: string): void {
    event.stopPropagation();
    this.clearHeaderFooterMode();
    this.es.selectElementInSection(el.id, rowId, sectionId);
  }

  onImagePlaceholderClick(event: MouseEvent, el: CanvasElement): void {
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;
    this.es.selectElement(el.id);
    this.pendingImageId = el.id;
    this.pendingImageContext = 'free';
    this.fileInput?.nativeElement.click();
  }

  onSectionImagePlaceholderClick(event: MouseEvent, el: CanvasElement, rowId: string, sectionId: string): void {
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;
    this.es.selectElementInSection(el.id, rowId, sectionId);
    this.pendingSectionImageRowId = rowId;
    this.pendingSectionImageSectionId = sectionId;
    this.pendingSectionImageElementId = el.id;
    this.sectionFileInput?.nativeElement.click();
  }

  onCanvasClick(): void {
    this.es.selectElement(null);
    this.es.selectSection(null);
    this.clearHeaderFooterMode();
  }

  // ── Section interactions ──────────────────────────────────────────────

  onSectionClick(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.clearHeaderFooterMode();
    this.es.selectSection(id);
  }

  onSectionDelete(event: MouseEvent, rowId: string, sectionId: string): void {
    event.stopPropagation();
    this.es.removeSectionFromRow(rowId, sectionId);
  }

  onSectionToggle(event: MouseEvent, rowId: string, sectionId: string): void {
    event.stopPropagation();
    this.es.toggleSectionEnabled(rowId, sectionId);
  }

  onSectionEdit(event: MouseEvent, sectionId: string): void {
    event.stopPropagation();
    this.es.selectSection(sectionId);
  }

  onRowDelete(event: MouseEvent, rowId: string): void {
    event.stopPropagation();
    this.es.deleteRow(rowId);
  }

  onRowHandleDragStart(event: DragEvent, row: Row): void {
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;
    event.dataTransfer?.setData('reorderRowId', row.id);
    event.dataTransfer?.setData('reorderRowIndex', String(row.order));
    event.dataTransfer?.setData('reorderrowid', row.id);
    this.isDraggingSection.set(true);
    this.draggingExistingRowId.set(row.id);
  }

  // ── Header inline editing ─────────────────────────────────────────────

  onHeaderLogoClick(event: MouseEvent): void {
    event.stopPropagation();
    this.footerContentMode.set('none');
    this.headerContentMode.set(this.headerContentMode() === 'logo' ? 'none' : 'logo');
  }

  onHeaderNavClick(event: MouseEvent): void {
    event.stopPropagation();
    this.footerContentMode.set('none');
    this.headerContentMode.set(this.headerContentMode() === 'nav' ? 'none' : 'nav');
  }

  setHeaderLogoAlignment(align: AlignValue): void { this.es.updateHeaderAlignment(align, undefined); }
  setHeaderNavAlignment(align: AlignValue): void { this.es.updateHeaderAlignment(undefined, align); }

  onHeaderHeightMouseDown(event: MouseEvent): void {
    event.stopPropagation(); event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    this.heightResizeState = { startY: event.clientY, origHeight: this.es.activeHeader().height, target: 'header' };
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onHeightMouseMove);
      document.addEventListener('mouseup', this.onHeightMouseUp);
    });
  }

  // ── Footer inline editing ─────────────────────────────────────────────

  onFooterLogoClick(event: MouseEvent): void {
    event.stopPropagation();
    this.headerContentMode.set('none');
    this.footerContentMode.set(this.footerContentMode() === 'logo' ? 'none' : 'logo');
  }

  onFooterNavClick(event: MouseEvent): void {
    event.stopPropagation();
    this.headerContentMode.set('none');
    this.footerContentMode.set(this.footerContentMode() === 'nav' ? 'none' : 'nav');
  }

  onFooterCopyrightClick(event: MouseEvent): void {
    event.stopPropagation();
    this.headerContentMode.set('none');
    this.footerContentMode.set(this.footerContentMode() === 'copyright' ? 'none' : 'copyright');
  }

  setFooterLogoAlignment(align: AlignValue): void { this.es.updateFooterAlignment(align, undefined, undefined); }
  setFooterNavAlignment(align: AlignValue): void { this.es.updateFooterAlignment(undefined, align, undefined); }
  setFooterCopyrightAlignment(align: AlignValue): void { this.es.updateFooterAlignment(undefined, undefined, align); }

  onFooterHeightMouseDown(event: MouseEvent): void {
    event.stopPropagation(); event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    this.heightResizeState = { startY: event.clientY, origHeight: this.es.activeFooter().height, target: 'footer' };
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onHeightMouseMove);
      document.addEventListener('mouseup', this.onHeightMouseUp);
    });
  }

  private onHeightMouseMove = (event: MouseEvent): void => {
    if (!this.heightResizeState) return;
    const rs = this.heightResizeState;
    const dy = event.clientY - rs.startY;
    this.ngZone.run(() => {
      if (rs.target === 'header') {
        this.es.updateHeader({ height: Math.max(32, rs.origHeight + dy) });
      } else if (rs.target === 'footer') {
        this.es.updateFooter({ height: Math.max(40, rs.origHeight + dy) });
      } else if (rs.target === 'section' && rs.rowId && rs.sectionId) {
        this.es.updateSection(rs.rowId, rs.sectionId, { height: Math.max(100, rs.origHeight + dy) });
      }
    });
  };

  private onHeightMouseUp = (): void => {
    this.heightResizeState = null;
    document.removeEventListener('mousemove', this.onHeightMouseMove);
    document.removeEventListener('mouseup', this.onHeightMouseUp);
  };

  onSectionHeightMouseDown(event: MouseEvent, row: Row, section: Section): void {
    event.stopPropagation(); event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    this.heightResizeState = {
      startY: event.clientY, origHeight: section.height, target: 'section',
      rowId: row.id, sectionId: section.id,
    };
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onHeightMouseMove);
      document.addEventListener('mouseup', this.onHeightMouseUp);
    });
  }

  // ── Element resize handles ────────────────────────────────────────────

  onFreeHandleMouseDown(event: MouseEvent, el: CanvasElement, handle: string): void {
    event.stopPropagation(); event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    this.isResizing = true;
    this.resizeState = {
      id: el.id, handle, startX: event.clientX, startY: event.clientY,
      origX: el.x, origY: el.y, origW: el.width, origH: el.height, context: 'free',
    };
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onDocMouseMove);
      document.addEventListener('mouseup', this.onDocMouseUp);
    });
  }

  onSectionHandleMouseDown(event: MouseEvent, el: CanvasElement, handle: string, rowId: string, sectionId: string): void {
    event.stopPropagation(); event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    this.isResizing = true;
    this.resizeState = {
      id: el.id, handle, startX: event.clientX, startY: event.clientY,
      origX: el.x, origY: el.y, origW: el.width, origH: el.height,
      context: 'section', rowId, sectionId,
    };
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onDocMouseMove);
      document.addEventListener('mouseup', this.onDocMouseUp);
    });
  }

  private onDocMouseMove = (event: MouseEvent): void => {
    if (!this.resizeState) return;
    const dx = Math.round((event.clientX - this.resizeState.startX) / GRID);
    const dy = Math.round((event.clientY - this.resizeState.startY) / GRID);
    const rs = this.resizeState;
    let x = rs.origX, y = rs.origY, w = rs.origW, h = rs.origH;
    if (rs.handle.includes('e')) w = Math.max(2, rs.origW + dx);
    if (rs.handle.includes('s')) h = Math.max(2, rs.origH + dy);
    if (rs.handle.includes('w')) { x = rs.origX + dx; w = Math.max(2, rs.origW - dx); }
    if (rs.handle.includes('n')) { y = rs.origY + dy; h = Math.max(2, rs.origH - dy); }
    const changes = { x: Math.max(0, x), y: Math.max(0, y), width: w, height: h };
    this.ngZone.run(() => {
      if (rs.context === 'free') {
        this.es.updateElement(rs.id, changes);
      } else if (rs.rowId && rs.sectionId) {
        this.es.updateElementInSection(rs.rowId, rs.sectionId, rs.id, changes);
      }
    });
  };

  private onDocMouseUp = (): void => {
    this.isResizing = false;
    this.resizeState = null;
    document.removeEventListener('mousemove', this.onDocMouseMove);
    document.removeEventListener('mouseup', this.onDocMouseUp);
  };

  // ── Insert index ──────────────────────────────────────────────────────

  private calculateRowInsertIndex(event: DragEvent): number {
    const rows = this.es.rows();
    if (!rows.length) return 0;
    const rowsEl = (event.currentTarget as HTMLElement);
    const rect = rowsEl.getBoundingClientRect();
    const relY = event.clientY - rect.top;
    let cumulative = 0;
    for (let i = 0; i < rows.length; i++) {
      const rowHeight = Math.max(...rows[i].sections.map(s => s.height), 100);
      if (relY <= cumulative + rowHeight / 2) return i;
      cumulative += rowHeight + 32; // 32 = section header bar height
    }
    return rows.length;
  }

  // ── File upload ───────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (this.pendingImageId && this.pendingImageContext === 'free') {
      const id = this.pendingImageId;
      this.pendingImageId = null;
      const reader = new FileReader();
      reader.onload = () => this.ngZone.run(() => this.es.updateElement(id, { src: reader.result as string }));
      reader.readAsDataURL(file);
    } else if (this.pendingImageId && this.pendingImageContext === 'footer') {
      const id = this.pendingImageId;
      this.pendingImageId = null;
      const reader = new FileReader();
      reader.onload = () => this.ngZone.run(() => this.es.updateFooterElement(id, { src: reader.result as string }));
      reader.readAsDataURL(file);
    }
    this.pendingImageContext = null;
  }

  onSectionFileSelected(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.pendingSectionImageRowId || !this.pendingSectionImageSectionId || !this.pendingSectionImageElementId) return;
    const rowId = this.pendingSectionImageRowId;
    const sectionId = this.pendingSectionImageSectionId;
    const elementId = this.pendingSectionImageElementId;
    this.pendingSectionImageRowId = null;
    this.pendingSectionImageSectionId = null;
    this.pendingSectionImageElementId = null;
    const reader = new FileReader();
    reader.onload = () => this.ngZone.run(() =>
      this.es.updateElementInSection(rowId, sectionId, elementId, { src: reader.result as string }));
    reader.readAsDataURL(file);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  isContentEmpty(el: CanvasElement): boolean {
    return (el.type === 'text' || el.type === 'button') && !el.content?.trim();
  }

  isFreeElementSelected(id: string): boolean {
    return this.es.selectedElementId() === id && !this.es.selectedElementSectionId();
  }

  isSectionElementSelected(id: string): boolean {
    return this.es.selectedElementId() === id && !!this.es.selectedElementSectionId();
  }

  alignIcon(align: AlignValue): string {
    return align === 'left' ? '⬤◯◯' : align === 'center' ? '◯⬤◯' : '◯◯⬤';
  }

  private clearHeaderFooterMode(): void {
    this.headerContentMode.set('none');
    this.footerContentMode.set('none');
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('mousemove', this.onDocMouseMove);
      document.removeEventListener('mouseup', this.onDocMouseUp);
      document.removeEventListener('mousemove', this.onHeightMouseMove);
      document.removeEventListener('mouseup', this.onHeightMouseUp);
    }
  }
}

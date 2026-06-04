import {
  Component, ElementRef, NgZone, OnDestroy, PLATFORM_ID,
  ViewChild, computed, inject, signal,
} from '@angular/core';
import { isPlatformBrowser, NgClass, NgStyle } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import { CarouselPreviewComponent } from '../carousel-preview/carousel-preview.component';
import type { CanvasElement, Section } from '../../models/page.model';

const GRID = 40;

interface ResizeState {
  id: string;
  handle: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
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
  @ViewChild('canvasSurface') canvasSurfaceRef!: ElementRef<HTMLElement>;

  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  readonly handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

  isDraggingSection = signal(false);
  private pendingImageId: string | null = null;
  private resizeState: ResizeState | null = null;
  private isResizing = false;

  pageBgStyle = computed((): Record<string, string> => {
    const bg = this.es.activePage().background;
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value || '#ffffff' };
  });

  elementsAreaHeight = computed((): number => {
    const els = this.es.elements();
    if (!els.length) return 200;
    return Math.max(200, els.reduce((max, el) => Math.max(max, (el.y + el.height) * GRID), 0) + GRID * 4);
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

  onCanvasDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    if (event.dataTransfer?.types.includes('sectiontype')) {
      this.isDraggingSection.set(true);
      this.es.dragInsertIndex.set(this.calculateInsertIndex(event));
    }
  }

  onCanvasDragLeave(event: DragEvent): void {
    const rt = event.relatedTarget as HTMLElement | null;
    if (!rt || !(event.currentTarget as HTMLElement).contains(rt)) {
      this.isDraggingSection.set(false);
      this.es.dragInsertIndex.set(null);
    }
  }

  onCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;

    const moveId = event.dataTransfer?.getData('moveElementId');
    if (moveId) {
      const ox = parseInt(event.dataTransfer?.getData('dragOffsetX') || '0', 10);
      const oy = parseInt(event.dataTransfer?.getData('dragOffsetY') || '0', 10);
      const areaEl = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('.elements-area');
      const rect = (areaEl ?? (event.currentTarget as HTMLElement)).getBoundingClientRect();
      const gx = Math.max(0, Math.floor((event.clientX - rect.left) / GRID) - ox);
      const gy = Math.max(0, Math.floor((event.clientY - rect.top) / GRID) - oy);
      this.es.moveElement(moveId, gx, gy);
      return;
    }

    const sectionType = event.dataTransfer?.getData('sectionType');
    if (sectionType) {
      const idx = this.es.dragInsertIndex() ?? this.es.sections().length;
      this.es.addSection(sectionType as any, idx);
      this.isDraggingSection.set(false);
      this.es.dragInsertIndex.set(null);
      return;
    }

    const elementType = event.dataTransfer?.getData('elementType');
    if (elementType) {
      const areaEl = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('.elements-area');
      const rect = (areaEl ?? (event.currentTarget as HTMLElement)).getBoundingClientRect();
      const gx = Math.max(0, Math.floor((event.clientX - rect.left) / GRID));
      const gy = Math.max(0, Math.floor((event.clientY - rect.top) / GRID));
      const id = this.es.addElement(elementType as any, gx, gy);
      if (elementType === 'image') {
        this.pendingImageId = id;
        if (this.fileInput?.nativeElement) {
          this.fileInput.nativeElement.value = '';
          this.fileInput.nativeElement.click();
        }
      }
    }
  }

  onElementDragStart(event: DragEvent, el: CanvasElement): void {
    if (this.isResizing) { event.preventDefault(); return; }
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;
    event.dataTransfer?.setData('moveElementId', el.id);
    event.dataTransfer?.setData('dragOffsetX', String(Math.floor(event.offsetX / GRID)));
    event.dataTransfer?.setData('dragOffsetY', String(Math.floor(event.offsetY / GRID)));
  }

  onElementClick(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.es.selectElement(id);
  }

  onSectionClick(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.es.selectSection(id);
  }

  onCanvasClick(): void {
    this.es.selectElement(null);
    this.es.selectSection(null);
  }

  onSectionDelete(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.es.deleteSection(id);
  }

  onSectionToggle(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.es.toggleSectionEnabled(id);
  }

  onSectionEdit(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.es.selectSection(id);
  }

  onSectionMoveUp(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.es.moveSectionUp(id);
  }

  onSectionMoveDown(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.es.moveSectionDown(id);
  }

  clickHeader(): void { this.es.setEditingMode('header'); }
  clickFooter(): void { this.es.setEditingMode('footer'); }

  onHandleMouseDown(event: MouseEvent, el: CanvasElement, handle: string): void {
    event.stopPropagation();
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    this.isResizing = true;
    this.resizeState = {
      id: el.id, handle, startX: event.clientX, startY: event.clientY,
      origX: el.x, origY: el.y, origW: el.width, origH: el.height,
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
    this.ngZone.run(() => {
      this.es.updateElement(rs!.id, { x: Math.max(0, x), y: Math.max(0, y), width: w, height: h });
    });
  };

  private onDocMouseUp = (): void => {
    this.isResizing = false;
    this.resizeState = null;
    document.removeEventListener('mousemove', this.onDocMouseMove);
    document.removeEventListener('mouseup', this.onDocMouseUp);
  };

  private calculateInsertIndex(event: DragEvent): number {
    const sections = this.es.sections();
    if (!sections.length) return 0;
    const canvas = event.currentTarget as HTMLElement;
    const canvasRect = canvas.getBoundingClientRect();
    const areaEl = canvas.querySelector<HTMLElement>('.elements-area');
    const elementsHeight = areaEl ? areaEl.offsetHeight : 0;
    const relY = (event.clientY - canvasRect.top) - elementsHeight;
    let cumulative = 0;
    for (let i = 0; i < sections.length; i++) {
      if (relY <= cumulative + sections[i].height / 2) return i;
      cumulative += sections[i].height;
    }
    return sections.length;
  }

  onFileSelected(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.pendingImageId) return;
    const id = this.pendingImageId;
    const reader = new FileReader();
    reader.onload = () => {
      this.ngZone.run(() => {
        this.es.updateElement(id, { src: reader.result as string });
        this.pendingImageId = null;
      });
    };
    reader.readAsDataURL(file);
  }

  isContentEmpty(el: CanvasElement): boolean {
    return (el.type === 'text' || el.type === 'button') && !el.content?.trim();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('mousemove', this.onDocMouseMove);
      document.removeEventListener('mouseup', this.onDocMouseUp);
    }
  }
}

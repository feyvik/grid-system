import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { isPlatformBrowser, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';
import type { CanvasElement, ElementType, FooterConfig } from '../../models/page.model';

const GRID = 40;

@Component({
  selector: 'app-footer-editor',
  standalone: true,
  imports: [NgStyle, FormsModule],
  templateUrl: './footer-editor.component.html',
  styleUrl: './footer-editor.component.css',
})
export class FooterEditorComponent implements OnDestroy {
  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bgImageInput') bgImageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected editorService = inject(EditorService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  private pendingImageId: string | null = null;

  footerElements = computed(() => this.editorService.activeFooter().elements);
  selectedFooterElementId = this.editorService.selectedFooterElementId;

  footerCanvasHeight = computed(() => {
    const els = this.footerElements();
    let max = 5;
    for (const el of els) {
      if (el.y + el.height > max) max = el.y + el.height;
    }
    return Math.max(200, (max + 2) * GRID);
  });

  get footer(): FooterConfig { return this.editorService.activeFooter(); }

  // ── Footer canvas background ─────────────────────────────────────────────

  getFooterCanvasBg(): Record<string, string> {
    const bg = this.footer.background;
    if (bg.type === 'image' && bg.value) {
      return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundColor: bg.value || '#313136' };
  }

  // ── Background settings ──────────────────────────────────────────────────

  get bgType(): 'color' | 'image' { return this.footer.background.type; }

  get bgColor(): string {
    return this.footer.background.type === 'color' ? this.footer.background.value : '#313136';
  }
  set bgColor(v: string) {
    this.editorService.updateFooter({ background: { type: 'color', value: v } });
  }

  selectBgType(type: 'color' | 'image'): void {
    if (type === 'color') {
      this.editorService.updateFooter({ background: { type: 'color', value: '#313136' } });
    } else {
      this.editorService.updateFooter({ background: { ...this.footer.background, type: 'image' } });
    }
  }

  onBgImageFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.editorService.updateFooter({ background: { type: 'image', value: reader.result as string } });
    reader.readAsDataURL(file);
  }

  // ── Logo ─────────────────────────────────────────────────────────────────

  triggerLogoUpload(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.logoInput?.nativeElement?.click();
  }

  onLogoFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.editorService.updateFooter({ logoSrc: reader.result as string });
    reader.readAsDataURL(file);
  }

  removeLogo(): void { this.editorService.updateFooter({ logoSrc: undefined }); }

  // ── Copyright ────────────────────────────────────────────────────────────

  get copyrightText(): string { return this.footer.copyrightText ?? ''; }
  set copyrightText(v: string) { this.editorService.updateFooter({ copyrightText: v }); }

  // ── Colors ───────────────────────────────────────────────────────────────

  get activeColor(): string { return this.footer.activeColor; }
  set activeColor(v: string) { this.editorService.updateFooter({ activeColor: v }); }

  get defaultColor(): string { return this.footer.defaultColor; }
  set defaultColor(v: string) { this.editorService.updateFooter({ defaultColor: v }); }

  // ── Navigation ───────────────────────────────────────────────────────────

  isPageInNav(pageId: string): boolean {
    return this.footer.navLinks.some(nl => nl.pageId === pageId);
  }

  toggleNavPage(pageId: string): void {
    const f = this.footer;
    if (this.isPageInNav(pageId)) {
      this.editorService.updateFooter({ navLinks: f.navLinks.filter(nl => nl.pageId !== pageId) });
    } else {
      const title = this.editorService.pages().find(p => p.id === pageId)?.title ?? '';
      this.editorService.updateFooter({ navLinks: [...f.navLinks, { pageId, label: title, visible: true }] });
    }
  }

  getNavLabel(pageId: string): string {
    return this.footer.navLinks.find(nl => nl.pageId === pageId)?.label ?? '';
  }

  setNavLabel(pageId: string, label: string): void {
    this.editorService.updateFooter({
      navLinks: this.footer.navLinks.map(nl => nl.pageId === pageId ? { ...nl, label } : nl),
    });
  }

  // ── Visibility ───────────────────────────────────────────────────────────

  get enabled(): boolean { return this.footer.enabled; }
  toggleEnabled(): void { this.editorService.updateFooter({ enabled: !this.footer.enabled }); }

  // ── Footer mini-canvas drop/drag ─────────────────────────────────────────

  onDragOver(event: DragEvent): void { event.preventDefault(); }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = event.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    const gridX = Math.max(0, Math.floor((event.clientX - rect.left) / GRID));
    const gridY = Math.max(0, Math.floor((event.clientY - rect.top) / GRID));

    const moveId = event.dataTransfer?.getData('moveFooterElementId');
    if (moveId) {
      const ox = parseInt(event.dataTransfer?.getData('dragOffsetX') || '0', 10);
      const oy = parseInt(event.dataTransfer?.getData('dragOffsetY') || '0', 10);
      this.editorService.moveFooterElement(moveId, Math.max(0, gridX - ox), Math.max(0, gridY - oy));
      return;
    }

    const type = event.dataTransfer?.getData('elementType') as ElementType | '';
    if (type) {
      const id = this.editorService.addFooterElement(type as ElementType, gridX, gridY);
      if (type === 'image') {
        this.pendingImageId = id;
        if (this.fileInput?.nativeElement) {
          this.fileInput.nativeElement.value = '';
          this.fileInput.nativeElement.click();
        }
      }
    }
  }

  onElementDragStart(event: DragEvent, el: CanvasElement): void {
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;
    event.dataTransfer?.setData('moveFooterElementId', el.id);
    event.dataTransfer?.setData('dragOffsetX', String(Math.floor(event.offsetX / GRID)));
    event.dataTransfer?.setData('dragOffsetY', String(Math.floor(event.offsetY / GRID)));
  }

  onElementClick(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.editorService.selectFooterElement(id);
  }

  onCanvasClick(): void {
    this.editorService.selectFooterElement(null);
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
        this.editorService.updateFooterElement(id, { src: reader.result as string });
        this.pendingImageId = null;
      });
    };
    reader.readAsDataURL(file);
  }

  // ── Element styles ───────────────────────────────────────────────────────

  getElementStyle(el: CanvasElement): Record<string, string> {
    return {
      left: el.x * GRID + 'px',
      top: el.y * GRID + 'px',
      width: el.width * GRID + 'px',
      height: el.height * GRID + 'px',
      color: el.styles?.color ?? '#ffffff',
      fontSize: (el.styles?.fontSize ?? 14) + 'px',
      backgroundColor: el.styles?.backgroundColor ?? 'transparent',
      borderRadius: (el.styles?.borderRadius ?? 0) + 'px',
    };
  }

  ngOnDestroy(): void {
    // nothing to clean since we don't attach document listeners
  }
}

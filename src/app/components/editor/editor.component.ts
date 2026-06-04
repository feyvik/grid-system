import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasComponent } from '../canvas/canvas.component';
import { ElementsPanelComponent } from '../elements-panel/elements-panel.component';
import { SettingsPanelComponent } from '../settings-panel/settings-panel.component';
import { HeaderEditorComponent } from '../header-editor/header-editor.component';
import { FooterEditorComponent } from '../footer-editor/footer-editor.component';
import { JsonPanelComponent } from '../json-panel/json-panel.component';
import { CarouselPreviewComponent } from '../carousel-preview/carousel-preview.component';
import { EditorService } from '../../services/editor.service';
import type { CanvasElement, Section } from '../../models/page.model';

const GRID = 40;

interface ContextMenuState { pageId: string; x: number; y: number; }

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    NgStyle, FormsModule,
    CanvasComponent, ElementsPanelComponent, SettingsPanelComponent,
    HeaderEditorComponent, FooterEditorComponent,
    JsonPanelComponent, CarouselPreviewComponent,
  ],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css',
})
export class EditorComponent {
  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  contextMenu = signal<ContextMenuState | null>(null);
  renamingPageId = signal<string | null>(null);
  renameValue = '';

  toggleGrid(): void { this.es.showGrid.update(v => !v); }
  togglePreview(): void { this.es.isPreviewMode.update(v => !v); }

  save(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log(this.es.getPageJSON());
    }
  }

  addPage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const title = window.prompt('Page title:', 'New Page');
    if (title?.trim()) this.es.addPage(title.trim());
  }

  onTabContextMenu(event: MouseEvent, pageId: string): void {
    event.preventDefault();
    this.contextMenu.set({ pageId, x: event.clientX, y: event.clientY });
  }

  closeContextMenu(): void { this.contextMenu.set(null); }

  ctxRename(pageId: string): void {
    const page = this.es.pages().find(p => p.id === pageId);
    if (!page) { this.closeContextMenu(); return; }
    this.renamingPageId.set(pageId);
    this.renameValue = page.title;
    this.closeContextMenu();
  }

  confirmRename(pageId: string): void {
    if (this.renameValue.trim()) this.es.updatePageTitle(pageId, this.renameValue.trim());
    this.renamingPageId.set(null);
  }

  cancelRename(): void { this.renamingPageId.set(null); }

  ctxDuplicate(pageId: string): void { this.es.duplicatePage(pageId); this.closeContextMenu(); }
  ctxToggleEnabled(pageId: string): void { this.es.togglePageEnabled(pageId); this.closeContextMenu(); }
  ctxDelete(pageId: string): void { this.es.deletePage(pageId); this.closeContextMenu(); }

  isPageEnabled(pageId: string): boolean {
    return this.es.pages().find(p => p.id === pageId)?.enabled ?? true;
  }

  // ── Preview helpers ───────────────────────────────────────────

  previewHeaderStyle(): Record<string, string> {
    const bg = this.es.activeHeader().background;
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value || '#2c3e7a' };
  }

  previewPageStyle(): Record<string, string> {
    const bg = this.es.activePage().background;
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value || '#ffffff' };
  }

  previewFooterStyle(): Record<string, string> {
    const bg = this.es.activeFooter().background;
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value || '#313136' };
  }

  previewSectionBg(section: Section): Record<string, string> {
    const bg = section.backgroundOverride;
    if (!bg) return {};
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value };
  }

  previewElementStyle(el: CanvasElement): Record<string, string> {
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
      overflow: 'hidden',
    };
  }
}

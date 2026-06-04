import { Component, ElementRef, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';
import type { HeaderConfig } from '../../models/page.model';

@Component({
  selector: 'app-header-editor',
  standalone: true,
  imports: [NgStyle, FormsModule],
  templateUrl: './header-editor.component.html',
  styleUrl: './header-editor.component.css',
})
export class HeaderEditorComponent {
  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;

  protected editorService = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  get header(): HeaderConfig { return this.editorService.activeHeader(); }

  getPreviewBg(): Record<string, string> {
    const bg = this.header.background;
    if (bg.type === 'image' && bg.value) {
      return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundColor: bg.value || '#2c3e7a' };
  }

  get bgColor(): string {
    return this.header.background.type === 'color' ? this.header.background.value : '#2c3e7a';
  }
  set bgColor(v: string) {
    this.editorService.updateHeader({ background: { type: 'color', value: v } });
  }

  get bgType(): 'color' | 'image' { return this.header.background.type; }

  selectBgType(type: 'color' | 'image'): void {
    if (type === 'color') {
      this.editorService.updateHeader({ background: { type: 'color', value: '#2c3e7a' } });
    } else {
      this.editorService.updateHeader({ background: { ...this.header.background, type: 'image' } });
    }
  }

  onBgImageFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.editorService.updateHeader({ background: { type: 'image', value: reader.result as string } });
    reader.readAsDataURL(file);
  }

  triggerLogoUpload(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.logoInput?.nativeElement?.click();
  }

  onLogoFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.editorService.updateHeader({ logoSrc: reader.result as string });
    reader.readAsDataURL(file);
  }

  removeLogo(): void { this.editorService.updateHeader({ logoSrc: undefined }); }

  get logoWidth(): number { return this.header.logoWidth ?? 120; }
  set logoWidth(v: number) { this.editorService.updateHeader({ logoWidth: Number(v) }); }

  get logoHeight(): number { return this.header.logoHeight ?? 40; }
  set logoHeight(v: number) { this.editorService.updateHeader({ logoHeight: Number(v) }); }

  get headerHeight(): number { return this.header.height ?? 64; }
  set headerHeight(v: number) { this.editorService.updateHeader({ height: Math.max(32, Number(v)) }); }

  get activeColor(): string { return this.header.activeColor; }
  set activeColor(v: string) { this.editorService.updateHeader({ activeColor: v }); }

  get defaultColor(): string { return this.header.defaultColor; }
  set defaultColor(v: string) { this.editorService.updateHeader({ defaultColor: v }); }

  isPageInNav(pageId: string): boolean {
    return this.header.navLinks.some(nl => nl.pageId === pageId);
  }

  toggleNavPage(pageId: string): void {
    const h = this.header;
    if (this.isPageInNav(pageId)) {
      this.editorService.updateHeader({ navLinks: h.navLinks.filter(nl => nl.pageId !== pageId) });
    } else {
      const pageTitle = this.editorService.pages().find(p => p.id === pageId)?.title ?? '';
      this.editorService.updateHeader({ navLinks: [...h.navLinks, { pageId, label: pageTitle, visible: true }] });
    }
  }

  getNavLabel(pageId: string): string {
    return this.header.navLinks.find(nl => nl.pageId === pageId)?.label ?? '';
  }

  setNavLabel(pageId: string, label: string): void {
    this.editorService.updateHeader({
      navLinks: this.header.navLinks.map(nl => nl.pageId === pageId ? { ...nl, label } : nl),
    });
  }

  get enabled(): boolean { return this.header.enabled; }
  toggleEnabled(): void { this.editorService.updateHeader({ enabled: !this.header.enabled }); }
}

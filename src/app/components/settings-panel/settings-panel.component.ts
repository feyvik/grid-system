import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';
import type { CanvasElement } from '../../models/page.model';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.css',
})
export class SettingsPanelComponent {
  protected editorService = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  activeTab = signal<'element' | 'page' | 'headerfooter'>('element');

  // The "current element" is page element or footer element depending on mode
  currentElement = computed(() => {
    if (this.editorService.editingMode() === 'footer') {
      return this.editorService.selectedFooterElement();
    }
    return this.editorService.selectedElement();
  });

  activePage = this.editorService.activePage;

  constructor() {
    // Auto-switch to header/footer tab when mode changes
    effect(() => {
      const mode = this.editorService.editingMode();
      if (mode === 'header' || mode === 'footer') {
        this.activeTab.set('headerfooter');
      }
    });
    // Auto-switch to element tab when an element is selected
    effect(() => {
      if (this.currentElement()) {
        this.activeTab.set('element');
      }
    });
  }

  // ── Unified element update ────────────────────────────────────────────────

  private updateCurrentElement(id: string, changes: Partial<CanvasElement>): void {
    if (this.editorService.editingMode() === 'footer') {
      this.editorService.updateFooterElement(id, changes);
    } else {
      this.editorService.updateElement(id, changes);
    }
  }

  updateContent(v: string): void {
    const el = this.currentElement();
    if (el) this.updateCurrentElement(el.id, { content: v });
  }

  get color(): string { return this.currentElement()?.styles?.color ?? '#000000'; }
  set color(v: string) {
    const el = this.currentElement();
    if (el) this.updateCurrentElement(el.id, { styles: { ...el.styles, color: v } });
  }

  get backgroundColor(): string {
    const bg = this.currentElement()?.styles?.backgroundColor;
    return !bg || bg === 'transparent' ? '#ffffff' : bg;
  }
  set backgroundColor(v: string) {
    const el = this.currentElement();
    if (el) this.updateCurrentElement(el.id, { styles: { ...el.styles, backgroundColor: v } });
  }

  get fontSize(): number { return this.currentElement()?.styles?.fontSize ?? 16; }
  set fontSize(v: number) {
    const el = this.currentElement();
    if (el) this.updateCurrentElement(el.id, { styles: { ...el.styles, fontSize: Number(v) } });
  }

  get borderRadius(): number { return this.currentElement()?.styles?.borderRadius ?? 0; }
  set borderRadius(v: number) {
    const el = this.currentElement();
    if (el) this.updateCurrentElement(el.id, { styles: { ...el.styles, borderRadius: Number(v) } });
  }

  get elWidth(): number { return this.currentElement()?.width ?? 4; }
  set elWidth(v: number) {
    const el = this.currentElement();
    if (el) this.updateCurrentElement(el.id, { width: Math.max(2, Number(v)) });
  }

  get elHeight(): number { return this.currentElement()?.height ?? 2; }
  set elHeight(v: number) {
    const el = this.currentElement();
    if (el) this.updateCurrentElement(el.id, { height: Math.max(2, Number(v)) });
  }

  get elX(): number { return this.currentElement()?.x ?? 0; }
  set elX(v: number) {
    const el = this.currentElement();
    if (el) this.updateCurrentElement(el.id, { x: Math.max(0, Number(v)) });
  }

  get elY(): number { return this.currentElement()?.y ?? 0; }
  set elY(v: number) {
    const el = this.currentElement();
    if (el) this.updateCurrentElement(el.id, { y: Math.max(0, Number(v)) });
  }

  deleteCurrentElement(): void {
    const mode = this.editorService.editingMode();
    if (mode === 'footer') {
      const id = this.editorService.selectedFooterElementId();
      if (id) this.editorService.deleteFooterElement(id);
    } else {
      const id = this.editorService.selectedElementId();
      if (id) this.editorService.deleteElement(id);
    }
  }

  triggerImageUpload(): void {
    const el = this.currentElement();
    if (!el || !isPlatformBrowser(this.platformId)) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => this.updateCurrentElement(el.id, { src: reader.result as string });
      reader.readAsDataURL(file);
    };
    input.click();
  }

  // ── Page tab ──────────────────────────────────────────────────────────────

  get pageTitle(): string { return this.activePage().title; }
  set pageTitle(v: string) { this.editorService.updatePageTitle(this.activePage().id, v); }

  get pageSlug(): string { return this.activePage().slug; }
  set pageSlug(v: string) { this.editorService.updatePageSlug(this.activePage().id, v); }

  get bgColor(): string {
    const bg = this.activePage().background;
    return bg.type === 'color' ? bg.value : '#ffffff';
  }
  set bgColor(v: string) {
    this.editorService.updatePageBackground(this.activePage().id, { type: 'color', value: v });
  }

  get bgType(): 'color' | 'image' { return this.activePage().background.type; }

  selectBgType(type: 'color' | 'image'): void {
    if (type === 'color') {
      this.editorService.updatePageBackground(this.activePage().id, { type: 'color', value: '#ffffff' });
    } else {
      this.editorService.updatePageBackground(this.activePage().id, { type: 'image', value: '' });
    }
  }

  onBgImageFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const id = this.activePage().id;
    const reader = new FileReader();
    reader.onload = () => this.editorService.updatePageBackground(id, { type: 'image', value: reader.result as string });
    reader.readAsDataURL(file);
  }

  duplicatePage(): void { this.editorService.duplicatePage(this.activePage().id); }
  deletePage(): void {
    if (this.editorService.pages().length > 1) this.editorService.deletePage(this.activePage().id);
  }

  // ── Header/Footer quick settings ──────────────────────────────────────────

  get hfBgColor(): string {
    const mode = this.editorService.editingMode();
    const bg = mode === 'footer'
      ? this.editorService.activeFooter().background
      : this.editorService.activeHeader().background;
    return bg.type === 'color' ? bg.value : '#000000';
  }
  set hfBgColor(v: string) {
    const mode = this.editorService.editingMode();
    if (mode === 'footer') this.editorService.updateFooter({ background: { type: 'color', value: v } });
    else this.editorService.updateHeader({ background: { type: 'color', value: v } });
  }

  get hfActiveColor(): string {
    const mode = this.editorService.editingMode();
    return mode === 'footer'
      ? this.editorService.activeFooter().activeColor
      : this.editorService.activeHeader().activeColor;
  }
  set hfActiveColor(v: string) {
    const mode = this.editorService.editingMode();
    if (mode === 'footer') this.editorService.updateFooter({ activeColor: v });
    else this.editorService.updateHeader({ activeColor: v });
  }

  get hfDefaultColor(): string {
    const mode = this.editorService.editingMode();
    return mode === 'footer'
      ? this.editorService.activeFooter().defaultColor
      : this.editorService.activeHeader().defaultColor;
  }
  set hfDefaultColor(v: string) {
    const mode = this.editorService.editingMode();
    if (mode === 'footer') this.editorService.updateFooter({ defaultColor: v });
    else this.editorService.updateHeader({ defaultColor: v });
  }

  get hfEnabled(): boolean {
    const mode = this.editorService.editingMode();
    return mode === 'footer'
      ? this.editorService.activeFooter().enabled
      : this.editorService.activeHeader().enabled;
  }
  toggleHfEnabled(): void {
    const mode = this.editorService.editingMode();
    if (mode === 'footer') this.editorService.updateFooter({ enabled: !this.editorService.activeFooter().enabled });
    else this.editorService.updateHeader({ enabled: !this.editorService.activeHeader().enabled });
  }
}

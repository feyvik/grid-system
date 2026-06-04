import { Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';
import { SectionEditorComponent } from '../section-editor/section-editor.component';
import type { CanvasElement, GlobalColors } from '../../models/page.model';

type PanelTab = 'element' | 'page' | 'colors';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [FormsModule, SectionEditorComponent],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.css',
})
export class SettingsPanelComponent {
  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  activeTab = signal<PanelTab>('page');

  activePage = this.es.activePage;

  readonly colorKeys: { key: keyof GlobalColors; label: string }[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent1', label: 'Accent 1' },
    { key: 'accent2', label: 'Accent 2' },
    { key: 'accent3', label: 'Accent 3' },
    { key: 'accent4', label: 'Accent 4' },
  ];

  constructor() {
    effect(() => {
      if (this.es.selectedElement()) this.activeTab.set('element');
    });
  }

  // ── Element tab ────────────────────────────────────────────

  get el() { return this.es.selectedElement(); }

  updateContent(v: string): void {
    const e = this.el;
    if (e) this.es.updateElement(e.id, { content: v });
  }

  get color(): string { return this.el?.styles?.color ?? '#000000'; }
  set color(v: string) {
    const e = this.el;
    if (e) this.es.updateElement(e.id, { styles: { ...e.styles, color: v, useGlobalColor: null } });
  }

  get backgroundColor(): string {
    const bg = this.el?.styles?.backgroundColor;
    return !bg || bg === 'transparent' ? '#ffffff' : bg;
  }
  set backgroundColor(v: string) {
    const e = this.el;
    if (e) this.es.updateElement(e.id, { styles: { ...e.styles, backgroundColor: v, useGlobalBackground: null } });
  }

  get fontSize(): number { return this.el?.styles?.fontSize ?? 16; }
  set fontSize(v: number) {
    const e = this.el;
    if (e) this.es.updateElement(e.id, { styles: { ...e.styles, fontSize: Number(v) } });
  }

  get borderRadius(): number { return this.el?.styles?.borderRadius ?? 0; }
  set borderRadius(v: number) {
    const e = this.el;
    if (e) this.es.updateElement(e.id, { styles: { ...e.styles, borderRadius: Number(v) } });
  }

  get elWidth(): number { return this.el?.width ?? 4; }
  set elWidth(v: number) {
    const e = this.el;
    if (e) this.es.updateElement(e.id, { width: Math.max(2, Number(v)) });
  }

  get elHeight(): number { return this.el?.height ?? 2; }
  set elHeight(v: number) {
    const e = this.el;
    if (e) this.es.updateElement(e.id, { height: Math.max(2, Number(v)) });
  }

  get elX(): number { return this.el?.x ?? 0; }
  set elX(v: number) {
    const e = this.el;
    if (e) this.es.updateElement(e.id, { x: Math.max(0, Number(v)) });
  }

  get elY(): number { return this.el?.y ?? 0; }
  set elY(v: number) {
    const e = this.el;
    if (e) this.es.updateElement(e.id, { y: Math.max(0, Number(v)) });
  }

  deleteCurrentElement(): void {
    const id = this.es.selectedElementId();
    if (id) this.es.deleteElement(id);
  }

  triggerImageUpload(): void {
    const e = this.el;
    if (!e || !isPlatformBrowser(this.platformId)) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => this.es.updateElement(e.id, { src: reader.result as string });
      reader.readAsDataURL(file);
    };
    input.click();
  }

  // ── Page tab ──────────────────────────────────────────────

  get pageTitle(): string { return this.activePage().title; }
  set pageTitle(v: string) { this.es.updatePageTitle(this.activePage().id, v); }

  get pageSlug(): string { return this.activePage().slug; }
  set pageSlug(v: string) { this.es.updatePageSlug(this.activePage().id, v); }

  get bgType(): 'color' | 'image' { return this.activePage().background.type; }

  get bgColor(): string {
    return this.activePage().background.type === 'color' ? this.activePage().background.value : '#ffffff';
  }
  set bgColor(v: string) {
    this.es.updatePageBackground(this.activePage().id, { type: 'color', value: v });
  }

  selectBgType(type: 'color' | 'image'): void {
    this.es.updatePageBackground(this.activePage().id,
      type === 'color' ? { type: 'color', value: '#ffffff' } : { type: 'image', value: '' });
  }

  onBgImageFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const id = this.activePage().id;
    const reader = new FileReader();
    reader.onload = () => this.es.updatePageBackground(id, { type: 'image', value: reader.result as string });
    reader.readAsDataURL(file);
  }

  duplicatePage(): void { this.es.duplicatePage(this.activePage().id); }
  deletePage(): void {
    if (this.es.pages().length > 1) this.es.deletePage(this.activePage().id);
  }

  // ── Global colors tab ────────────────────────────────────

  getColor(key: keyof GlobalColors): string { return this.es.globalColors()[key]; }
  setColor(key: keyof GlobalColors, value: string): void { this.es.updateGlobalColor(key, value); }
}

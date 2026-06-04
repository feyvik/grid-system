import { Component, PLATFORM_ID, computed, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';
import type { Section } from '../../models/page.model';

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './section-editor.component.html',
  styleUrl: './section-editor.component.css',
})
export class SectionEditorComponent {
  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  section = computed(() => this.es.selectedSection());

  get label(): string { return this.section()?.label ?? ''; }
  set label(v: string) { this.updateSection({ label: v }); }

  get height(): number { return this.section()?.height ?? 200; }
  set height(v: number) { this.updateSection({ height: Math.max(100, Number(v)) }); }

  get enabled(): boolean { return this.section()?.enabled ?? true; }
  toggleEnabled(): void { const s = this.section(); if (s) this.es.toggleSectionEnabled(s.id); }

  get bgOverrideType(): 'none' | 'color' | 'image' {
    const bg = this.section()?.backgroundOverride;
    if (!bg) return 'none';
    return bg.type;
  }

  setBgOverrideType(type: 'none' | 'color' | 'image'): void {
    if (type === 'none') {
      this.updateSection({ backgroundOverride: null });
    } else if (type === 'color') {
      this.updateSection({ backgroundOverride: { type: 'color', value: '#ffffff' } });
    } else {
      this.updateSection({ backgroundOverride: { type: 'image', value: '' } });
    }
  }

  get bgOverrideColor(): string {
    const bg = this.section()?.backgroundOverride;
    return (bg?.type === 'color' ? bg.value : '#ffffff');
  }
  set bgOverrideColor(v: string) {
    this.updateSection({ backgroundOverride: { type: 'color', value: v } });
  }

  onBgImageFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.updateSection({ backgroundOverride: { type: 'image', value: reader.result as string } });
    };
    reader.readAsDataURL(file);
  }

  deleteSection(): void {
    const s = this.section();
    if (s) this.es.deleteSection(s.id);
  }

  onCarouselImageUpload(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const s = this.section();
    if (files && s) this.es.addCarouselImages(s.id, files);
  }

  removeCarouselImage(imageId: string): void {
    const s = this.section();
    if (s) this.es.removeCarouselImage(s.id, imageId);
  }

  get carouselImages() {
    return [...(this.section()?.carouselImages ?? [])].sort((a, b) => a.order - b.order);
  }

  get scrollMode(): string { return this.section()?.carouselConfig?.scrollMode ?? 'click'; }
  set scrollMode(v: string) {
    const s = this.section();
    if (s) this.es.updateCarouselConfig(s.id, { scrollMode: v as any });
  }

  get autoInterval(): number { return this.section()?.carouselConfig?.autoScrollInterval ?? 3000; }
  set autoInterval(v: number) {
    const s = this.section();
    if (s) this.es.updateCarouselConfig(s.id, { autoScrollInterval: Number(v) * 1000 });
  }

  get showFocusedCenter(): boolean { return this.section()?.carouselConfig?.showFocusedCenter ?? true; }
  set showFocusedCenter(v: boolean) {
    const s = this.section();
    if (s) this.es.updateCarouselConfig(s.id, { showFocusedCenter: v });
  }

  updateCaption(imageId: string, caption: string): void {
    const s = this.section();
    if (!s) return;
    const imgs = (s.carouselImages ?? []).map(img => img.id === imageId ? { ...img, caption } : img);
    this.es.updateSection(s.id, { carouselImages: imgs });
  }

  private updateSection(changes: Partial<Section>): void {
    const s = this.section();
    if (s) this.es.updateSection(s.id, changes);
  }
}

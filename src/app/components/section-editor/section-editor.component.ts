import { Component, ElementRef, PLATFORM_ID, ViewChild, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';
import type { CarouselConfig, Row, Section, SectionWidth } from '../../models/page.model';

interface FaqItem { question: string; answer: string; }
interface AgendaItem { time: string; title: string; speaker: string; }
interface PricingTier { name: string; price: string; currency: string; features: string; cta: string; }

@Component({
  selector: 'app-section-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './section-editor.component.html',
  styleUrl: './section-editor.component.css',
})
export class SectionEditorComponent {
  @ViewChild('uploadAllInput') uploadAllInput!: ElementRef<HTMLInputElement>;
  @ViewChild('slotInput') slotInput!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;

  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  section = computed(() => this.es.selectedSection());
  row = computed(() => this.es.selectedSectionRow());

  readonly elementTypes = [
    { type: 'text', label: 'Text', icon: 'T' },
    { type: 'image', label: 'Image', icon: '🖼' },
    { type: 'button', label: 'Button', icon: '▭' },
    { type: 'shape', label: 'Shape', icon: '◼' },
    { type: 'divider', label: 'Divider', icon: '—' },
  ] as const;

  private pendingSlotIndex = signal<number | null>(null);

  // ─── Common section updates ──────────────────────────────────

  updateLabel(value: string): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.updateSection(row.id, section.id, { label: value });
  }

  updateHeight(value: number): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.updateSection(row.id, section.id, { height: Math.max(100, value) });
  }

  setWidth(width: SectionWidth): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.setSectionWidth(row.id, section.id, width);
  }

  toggleEnabled(): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.toggleSectionEnabled(row.id, section.id);
  }

  setBgNone(): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.updateSection(row.id, section.id, { backgroundOverride: null });
  }

  setBgColor(value: string): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.updateSection(row.id, section.id, { backgroundOverride: { type: 'color', value } });
  }

  setBgImage(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.es.updateSection(row.id, section.id, { backgroundOverride: { type: 'image', value: reader.result as string } });
    };
    reader.readAsDataURL(file);
  }

  deleteSection(): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.removeSectionFromRow(row.id, section.id);
    this.es.selectSection(null);
  }

  // ─── Carousel ────────────────────────────────────────────────

  get carouselImages() {
    return (this.section()?.carouselImages ?? []).slice().sort((a, b) => a.order - b.order);
  }

  get carouselCfg(): CarouselConfig {
    return this.section()?.carouselConfig ?? {
      scrollMode: 'click', autoScrollInterval: 3, showFocusedCenter: true,
      largeImageHeight: 400, thumbnailHeight: 80, thumbnailWidth: 120, visibleThumbnails: 6,
    };
  }

  getImageAtSlot(slotIndex: number) {
    return this.carouselImages.find(img => img.order === slotIndex) ?? null;
  }

  uploadAll(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    this.es.addCarouselImages(row.id, section.id, files);
  }

  onSlotClick(slotIndex: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.pendingSlotIndex.set(slotIndex);
    if (this.slotInput?.nativeElement) {
      this.slotInput.nativeElement.value = '';
      this.slotInput.nativeElement.click();
    }
  }

  onSlotFileSelected(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    const slotIndex = this.pendingSlotIndex();
    if (slotIndex === null) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.es.addCarouselImageAtSlot(row.id, section.id, slotIndex, file);
    this.pendingSlotIndex.set(null);
  }

  removeCarouselImage(imageId: string): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.removeCarouselImage(row.id, section.id, imageId);
  }

  updateScrollMode(mode: 'auto' | 'click' | 'both'): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.updateCarouselConfig(row.id, section.id, { scrollMode: mode });
  }

  updateCarouselField(field: keyof CarouselConfig, value: number | boolean): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.updateCarouselConfig(row.id, section.id, { [field]: value });
  }

  updateCaption(imageId: string, caption: string): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.updateSection(row.id, section.id, {
      carouselImages: (section.carouselImages ?? []).map(img =>
        img.id === imageId ? { ...img, caption } : img),
    });
  }

  // ─── Custom settings helpers ──────────────────────────────────

  getCustom(key: string, def: unknown = undefined): unknown {
    return this.section()?.customSettings?.[key] ?? def;
  }

  setCustom(key: string, value: unknown): void {
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    this.es.updateSection(row.id, section.id, {
      customSettings: { ...(section.customSettings ?? {}), [key]: value },
    });
  }

  // FAQ helpers
  get faqItems(): FaqItem[] { return (this.getCustom('faqItems', []) as FaqItem[]); }

  addFaqItem(): void {
    this.setCustom('faqItems', [...this.faqItems, { question: 'Question?', answer: 'Answer...' }]);
  }

  updateFaqItem(index: number, field: 'question' | 'answer', value: string): void {
    const items = [...this.faqItems];
    items[index] = { ...items[index], [field]: value };
    this.setCustom('faqItems', items);
  }

  deleteFaqItem(index: number): void {
    const items = this.faqItems.filter((_, i) => i !== index);
    this.setCustom('faqItems', items);
  }

  // Agenda helpers
  get agendaItems(): AgendaItem[] { return (this.getCustom('agendaItems', []) as AgendaItem[]); }

  addAgendaItem(): void {
    this.setCustom('agendaItems', [...this.agendaItems, { time: '9:00 AM', title: 'Session Title', speaker: '' }]);
  }

  updateAgendaItem(index: number, field: keyof AgendaItem, value: string): void {
    const items = [...this.agendaItems];
    items[index] = { ...items[index], [field]: value };
    this.setCustom('agendaItems', items);
  }

  deleteAgendaItem(index: number): void {
    this.setCustom('agendaItems', this.agendaItems.filter((_, i) => i !== index));
  }

  // Pricing helpers
  get pricingTiers(): PricingTier[] { return (this.getCustom('pricingTiers', [{ name: 'Basic', price: '0', currency: '$', features: '', cta: 'Get Started' }]) as PricingTier[]); }

  updatePricingField(index: number, field: keyof PricingTier, value: string): void {
    const tiers = [...this.pricingTiers];
    tiers[index] = { ...tiers[index], [field]: value };
    this.setCustom('pricingTiers', tiers);
  }

  setPricingCount(count: number): void {
    const current = this.pricingTiers;
    const newTiers: PricingTier[] = Array.from({ length: count }, (_, i) =>
      current[i] ?? { name: `Tier ${i + 1}`, price: '0', currency: '$', features: '', cta: 'Sign Up' });
    this.setCustom('pricingTiers', newTiers);
  }

  // Gallery
  uploadGalleryImages(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const { row, section } = this.getRowAndSection();
    if (!row || !section) return;
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const existing = (this.getCustom('galleryImages', []) as string[]);
        this.setCustom('galleryImages', [...existing, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  removeGalleryImage(index: number): void {
    const imgs = (this.getCustom('galleryImages', []) as string[]).filter((_, i) => i !== index);
    this.setCustom('galleryImages', imgs);
  }

  get galleryImages(): string[] { return this.getCustom('galleryImages', []) as string[]; }

  // Element drag from mini panel
  onElementDragStart(event: DragEvent, type: string): void {
    event.dataTransfer?.setData('elementType', type);
  }

  // ─── Helper ──────────────────────────────────────────────────

  private getRowAndSection(): { row: Row | null; section: Section | null } {
    return { row: this.row(), section: this.section() };
  }
}

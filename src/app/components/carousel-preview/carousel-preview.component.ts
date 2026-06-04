import {
  Component, Input, OnDestroy, OnInit, PLATFORM_ID, inject, signal, computed,
} from '@angular/core';
import { isPlatformBrowser, NgStyle } from '@angular/common';
import { EditorService, DEFAULT_CAROUSEL_CONFIG } from '../../services/editor.service';
import type { Section } from '../../models/page.model';

@Component({
  selector: 'app-carousel-preview',
  standalone: true,
  imports: [NgStyle],
  templateUrl: './carousel-preview.component.html',
  styleUrl: './carousel-preview.component.css',
})
export class CarouselPreviewComponent implements OnInit, OnDestroy {
  @Input() section!: Section;
  @Input() rowId!: string;

  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  focusedIndex = signal(0);
  thumbnailStartIndex = signal(0);
  isHovered = signal(false);

  private autoScrollTimer: ReturnType<typeof setInterval> | null = null;

  get cfg() {
    return this.section.carouselConfig ?? { ...DEFAULT_CAROUSEL_CONFIG };
  }

  get images() {
    return (this.section.carouselImages ?? []).slice().sort((a, b) => a.order - b.order);
  }

  get totalImages() { return this.images.length; }

  visibleThumbnails = computed(() => {
    const start = this.thumbnailStartIndex();
    return Array.from({ length: 6 }, (_, i) => {
      const idx = start + i;
      return { idx, image: this.images[idx] ?? null };
    });
  });

  largeImageSrc = computed(() => {
    const imgs = this.images;
    if (!imgs.length) return null;
    return (imgs[this.focusedIndex()] ?? imgs[0])?.src ?? null;
  });

  ngOnInit(): void {
    this.startAutoScroll();
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  startAutoScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const mode = this.cfg.scrollMode;
    if (mode !== 'auto' && mode !== 'both') return;
    const interval = (this.cfg.autoScrollInterval ?? 3) * 1000;
    this.autoScrollTimer = setInterval(() => {
      this.nextImage();
    }, interval);
  }

  stopAutoScroll(): void {
    if (this.autoScrollTimer !== null) {
      clearInterval(this.autoScrollTimer);
      this.autoScrollTimer = null;
    }
  }

  previousImage(): void {
    if (!this.totalImages) return;
    this.focusedIndex.update(i => (i - 1 + this.totalImages) % this.totalImages);
    this.scrollThumbnails();
  }

  nextImage(): void {
    if (!this.totalImages) return;
    this.focusedIndex.update(i => (i + 1) % this.totalImages);
    this.scrollThumbnails();
  }

  setFocused(idx: number): void {
    this.focusedIndex.set(idx);
    this.scrollThumbnails();
  }

  scrollThumbnails(): void {
    const fi = this.focusedIndex();
    const start = Math.max(0, fi - 2);
    this.thumbnailStartIndex.set(start);
  }

  onEditCarouselClick(event: MouseEvent): void {
    event.stopPropagation();
    this.es.selectSection(this.section.id);
  }

  isThumbnailActive(idx: number): boolean {
    return idx === this.focusedIndex();
  }
}

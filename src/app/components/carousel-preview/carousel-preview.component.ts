import {
  Component, Input, OnChanges, OnDestroy, PLATFORM_ID, SimpleChanges, inject, signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import type { Section } from '../../models/page.model';

@Component({
  selector: 'app-carousel-preview',
  standalone: true,
  imports: [],
  templateUrl: './carousel-preview.component.html',
  styleUrl: './carousel-preview.component.css',
})
export class CarouselPreviewComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) section!: Section;

  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  focusedIndex = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['section']) {
      this.resetAutoScroll();
    }
  }

  get images() {
    return [...(this.section.carouselImages ?? [])].sort((a, b) => a.order - b.order);
  }

  get config() {
    return this.section.carouselConfig ?? { scrollMode: 'click' as const, autoScrollInterval: 3000, showFocusedCenter: true };
  }

  private resetAutoScroll(): void {
    this.clearInterval();
    if (!isPlatformBrowser(this.platformId)) return;
    const cfg = this.config;
    if ((cfg.scrollMode === 'auto' || cfg.scrollMode === 'both') && this.images.length > 1) {
      this.intervalId = setInterval(() => {
        this.next();
      }, cfg.autoScrollInterval || 3000);
    }
  }

  prev(): void {
    const imgs = this.images;
    if (!imgs.length) return;
    this.focusedIndex.update(i => (i - 1 + imgs.length) % imgs.length);
  }

  next(): void {
    const imgs = this.images;
    if (!imgs.length) return;
    this.focusedIndex.update(i => (i + 1) % imgs.length);
  }

  setFocused(index: number): void {
    this.focusedIndex.set(index);
  }

  onCarouselClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.es.isPreviewMode()) {
      this.es.selectSection(this.section.id);
    }
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.clearInterval();
  }
}

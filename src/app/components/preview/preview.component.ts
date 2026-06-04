import { Component, Input, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgStyle } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { EditorService, SECTION_HEIGHTS } from '../../services/editor.service';
import type { CanvasElement, Section, SectionType } from '../../models/page.model';

const GRID = 40;

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [NgStyle],
  templateUrl: './preview.component.html',
  styleUrl: './preview.component.css',
})
export class PreviewComponent {
  @Input() inline = false;

  private route = inject(ActivatedRoute);
  protected editorService = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  readonly isBrowser = isPlatformBrowser(this.platformId);

  private routeSlug = toSignal(
    this.route.params.pipe(map(p => p['pageSlug'] as string | undefined)),
    { initialValue: undefined },
  );

  page = computed(() => {
    if (this.inline) return this.editorService.activePage();
    const slug = this.routeSlug();
    if (!slug) return this.editorService.activePage();
    return this.editorService.pages().find(p => p.slug === slug) ?? null;
  });

  readonly agendaRows = [
    { time: '9:00 AM', session: 'Opening Keynote', speaker: 'John Doe' },
    { time: '10:30 AM', session: 'Workshop: Innovation', speaker: 'Jane Smith' },
    { time: '12:00 PM', session: 'Lunch Break', speaker: '' },
    { time: '2:00 PM', session: 'Panel Discussion', speaker: 'Multiple Speakers' },
    { time: '4:00 PM', session: 'Closing Remarks', speaker: 'Event Chair' },
  ];

  readonly ticketTiers = [
    { name: 'Basic', price: '$49', features: ['Access to all talks', 'Digital materials', 'Networking'] },
    { name: 'Standard', price: '$99', features: ['Everything in Basic', 'Workshop access', 'Lunch included'] },
    { name: 'VIP', price: '$199', features: ['Everything in Standard', 'VIP seating', 'Speaker meet & greet'] },
  ];

  readonly personPlaceholders = [1, 2, 3, 4];
  readonly carouselItems = [1, 2, 3, 4];

  getPageStyle(bg: { type: 'color' | 'image'; value: string }): Record<string, string> {
    if (bg.type === 'image' && bg.value) {
      return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundColor: bg.value || '#ffffff' };
  }

  getHeaderStyle(): Record<string, string> {
    const bg = this.editorService.activeHeader().background;
    if (bg.type === 'image' && bg.value) {
      return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundColor: bg.value || '#2c3e7a' };
  }

  getFooterStyle(): Record<string, string> {
    const bg = this.editorService.activeFooter().background;
    if (bg.type === 'image' && bg.value) {
      return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundColor: bg.value || '#313136' };
  }

  getElementStyle(el: CanvasElement): Record<string, string> {
    return {
      left: el.x * GRID + 'px',
      top: el.y * GRID + 'px',
      width: el.width * GRID + 'px',
      height: el.height * GRID + 'px',
      color: el.styles?.color ?? '#000000',
      fontSize: (el.styles?.fontSize ?? 16) + 'px',
      backgroundColor: el.styles?.backgroundColor ?? 'transparent',
      borderRadius: (el.styles?.borderRadius ?? 0) + 'px',
    };
  }

  getFooterElStyle(el: CanvasElement): Record<string, string> {
    return {
      ...this.getElementStyle(el),
      color: el.styles?.color ?? '#ffffff',
    };
  }

  getSectionHeight(type: SectionType): number {
    return SECTION_HEIGHTS[type] ?? 280;
  }

  getElementsAreaHeight(elements: CanvasElement[]): number {
    let max = 20;
    for (const el of elements) {
      if (el.y + el.height > max) max = el.y + el.height;
    }
    return Math.max(800, (max + 4) * GRID);
  }
}

import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import type { ElementType, GlobalColors, SectionType } from '../../models/page.model';

@Component({
  selector: 'app-elements-panel',
  standalone: true,
  imports: [],
  templateUrl: './elements-panel.component.html',
  styleUrl: './elements-panel.component.css',
})
export class ElementsPanelComponent {
  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  readonly elementItems: { type: ElementType; label: string; icon: string }[] = [
    { type: 'text', label: 'Text', icon: 'T' },
    { type: 'image', label: 'Image', icon: '&#9638;' },
    { type: 'button', label: 'Button', icon: '&#9644;' },
    { type: 'shape', label: 'Shape', icon: '&#9632;' },
    { type: 'divider', label: 'Divider', icon: '&#8212;' },
  ];

  readonly sectionItems: { type: SectionType; label: string; icon: string }[] = [
    { type: 'blank', label: 'Blank', icon: '&#9633;' },
    { type: 'speaker-cards', label: 'Speaker Cards', icon: '&#9678;' },
    { type: 'carousel', label: 'Carousel', icon: '&#9655;' },
    { type: 'gallery', label: 'Gallery', icon: '&#9638;' },
    { type: 'faq', label: 'FAQ', icon: '?' },
    { type: 'pricing-cards', label: 'Pricing Cards', icon: '&#9672;' },
    { type: 'attendees', label: 'Attendees', icon: '&#9689;' },
    { type: 'agenda', label: 'Agenda', icon: '&#8801;' },
  ];

  readonly colorKeys: { key: keyof GlobalColors; label: string }[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent1', label: 'Accent 1' },
    { key: 'accent2', label: 'Accent 2' },
    { key: 'accent3', label: 'Accent 3' },
    { key: 'accent4', label: 'Accent 4' },
  ];

  onElementDragStart(event: DragEvent, type: ElementType): void {
    if (!isPlatformBrowser(this.platformId)) return;
    event.dataTransfer?.setData('elementType', type);
  }

  onSectionDragStart(event: DragEvent, type: SectionType): void {
    if (!isPlatformBrowser(this.platformId)) return;
    event.dataTransfer?.setData('sectionType', type);
    event.dataTransfer?.setData('sectiontype', type);
  }

  addCustomSection(): void {
    this.es.addSection('custom');
  }

  getColor(key: keyof GlobalColors): string {
    return this.es.globalColors()[key];
  }

  setColor(key: keyof GlobalColors, value: string): void {
    this.es.updateGlobalColor(key, value);
  }
}

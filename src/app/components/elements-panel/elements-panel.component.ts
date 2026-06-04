import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';
import { SectionEditorComponent } from '../section-editor/section-editor.component';
import type { GlobalColors } from '../../models/page.model';

@Component({
  selector: 'app-elements-panel',
  standalone: true,
  imports: [FormsModule, SectionEditorComponent],
  templateUrl: './elements-panel.component.html',
  styleUrl: './elements-panel.component.css',
})
export class ElementsPanelComponent {
  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  readonly elementItems = [
    { type: 'text', label: 'Text', icon: 'T' },
    { type: 'image', label: 'Image', icon: '🖼' },
    { type: 'button', label: 'Button', icon: '▭' },
    { type: 'shape', label: 'Shape', icon: '◼' },
    { type: 'divider', label: 'Divider', icon: '—' },
  ] as const;

  readonly sectionItems = [
    { type: 'blank', label: 'Blank' },
    { type: 'speaker-cards', label: 'Speaker Cards' },
    { type: 'carousel', label: 'Carousel' },
    { type: 'gallery', label: 'Gallery' },
    { type: 'faq', label: 'FAQ' },
    { type: 'pricing-cards', label: 'Pricing Cards' },
    { type: 'attendees', label: 'Attendees' },
    { type: 'agenda', label: 'Agenda' },
  ] as const;

  readonly colorKeys: (keyof GlobalColors)[] = ['primary', 'secondary', 'accent1', 'accent2', 'accent3', 'accent4'];
  readonly colorLabels: Record<keyof GlobalColors, string> = {
    primary: 'Primary', secondary: 'Secondary',
    accent1: 'Accent 1', accent2: 'Accent 2', accent3: 'Accent 3', accent4: 'Accent 4',
  };

  onElementDragStart(event: DragEvent, type: string): void {
    event.dataTransfer?.setData('elementType', type);
  }

  onSectionDragStart(event: DragEvent, type: string): void {
    event.dataTransfer?.setData('sectionType', type);
  }

  addCustomSection(): void {
    this.es.addSectionAsNewRow('custom', this.es.rows().length);
  }

  updateColor(key: keyof GlobalColors, value: string): void {
    this.es.updateGlobalColor(key, value);
  }
}

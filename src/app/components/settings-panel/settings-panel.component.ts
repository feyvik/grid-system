import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';
import type { CanvasElement, ElementStyles, GlobalColors, PageBackground } from '../../models/page.model';

type Tab = 'element' | 'page' | 'colors';

const COLOR_KEYS: (keyof GlobalColors)[] = ['primary', 'secondary', 'accent1', 'accent2', 'accent3', 'accent4'];
const COLOR_LABELS: Record<keyof GlobalColors, string> = {
  primary: 'Primary', secondary: 'Secondary',
  accent1: 'Accent 1', accent2: 'Accent 2', accent3: 'Accent 3', accent4: 'Accent 4',
};

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings-panel.component.html',
  styleUrl: './settings-panel.component.css',
})
export class SettingsPanelComponent {
  readonly Math = Math;
  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  activeTab = signal<Tab>('page');

  readonly colorKeys = COLOR_KEYS;
  readonly colorLabels = COLOR_LABELS;
  readonly colorTokenOptions = [null, ...COLOR_KEYS] as const;

  selectedElement = computed(() => this.es.selectedElement());
  activePage = computed(() => this.es.activePage());

  isFreeElement = computed(() => {
    const id = this.es.selectedElementId();
    if (!id) return false;
    return this.es.activePage().elements.some(el => el.id === id);
  });

  sectionContext = computed(() => {
    const sectionId = this.es.selectedElementSectionId();
    if (!sectionId) return null;
    for (const row of this.es.activePage().rows) {
      const sec = row.sections.find(s => s.id === sectionId);
      if (sec) return sec;
    }
    return null;
  });

  contextLabel = computed(() => {
    const el = this.selectedElement();
    if (!el) return null;
    if (this.isFreeElement()) return 'Free Element';
    const sec = this.sectionContext();
    return sec ? `In Section: ${sec.label}` : 'Section Element';
  });

  // Auto-select element tab when element is selected
  selectElementTab(): void {
    if (this.selectedElement()) this.activeTab.set('element');
  }

  // ─── Element updates ──────────────────────────────────────────

  updateElementField(changes: Partial<CanvasElement>): void {
    const el = this.selectedElement();
    if (!el) return;
    if (this.isFreeElement()) {
      this.es.updateElement(el.id, changes);
    } else {
      const rowId = this.es.selectedElementRowId();
      const sectionId = this.es.selectedElementSectionId();
      if (rowId && sectionId) {
        this.es.updateElementInSection(rowId, sectionId, el.id, changes);
      }
    }
  }

  updateStyles(changes: Partial<ElementStyles>): void {
    const el = this.selectedElement();
    if (!el) return;
    this.updateElementField({ styles: { ...(el.styles ?? {}), ...changes } });
  }

  setColorToken(property: 'useGlobalColor' | 'useGlobalBackground', token: keyof GlobalColors | null): void {
    this.updateStyles({ [property]: token });
  }

  setFixedColor(property: 'color' | 'backgroundColor', value: string): void {
    if (property === 'color') {
      this.updateStyles({ color: value, useGlobalColor: null });
    } else {
      this.updateStyles({ backgroundColor: value, useGlobalBackground: null });
    }
  }

  deleteElement(): void {
    const el = this.selectedElement();
    if (!el) return;
    if (this.isFreeElement()) {
      this.es.deleteElement(el.id);
    } else {
      const rowId = this.es.selectedElementRowId();
      const sectionId = this.es.selectedElementSectionId();
      if (rowId && sectionId) {
        this.es.deleteElementFromSection(rowId, sectionId, el.id);
      }
    }
  }

  // ─── Page updates ─────────────────────────────────────────────

  updatePageTitle(value: string): void {
    this.es.updatePageTitle(this.activePage().id, value);
  }

  updatePageSlug(value: string): void {
    this.es.updatePageSlug(this.activePage().id, value);
  }

  updatePageBackground(type: 'color' | 'image', value: string): void {
    this.es.updatePageBackground(this.activePage().id, { type, value });
  }

  onPageBgImageUpload(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.es.updatePageBackground(this.activePage().id, { type: 'image', value: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  resolvedColorPreview(token: keyof GlobalColors): string {
    return this.es.globalColors()[token];
  }

  colorTokenLabel(token: keyof GlobalColors | null): string {
    if (!token) return 'Fixed';
    return COLOR_LABELS[token] ?? token;
  }
}

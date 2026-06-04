import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type {
  AlignValue, CanvasElement, CarouselConfig, ElementStyles, ElementType,
  FooterConfig, GlobalColors, HeaderConfig, NavLink, Page, PageBackground,
  PageDefinition, Row, Section, SectionType, SectionWidth,
} from '../models/page.model';

export const SECTION_HEIGHTS: Record<SectionType, number> = {
  blank: 200, custom: 200, carousel: 480, gallery: 300,
  'speaker-cards': 250, 'pricing-cards': 250, attendees: 250, agenda: 250, faq: 250,
};

const SECTION_LABELS: Record<SectionType, string> = {
  blank: 'Blank Section', custom: 'Custom Section', carousel: 'Carousel',
  gallery: 'Gallery', 'speaker-cards': 'Speaker Cards', 'pricing-cards': 'Pricing Cards',
  attendees: 'Attendees', agenda: 'Agenda', faq: 'FAQ',
};

export const DEFAULT_CAROUSEL_CONFIG: CarouselConfig = {
  scrollMode: 'click', autoScrollInterval: 3, showFocusedCenter: true,
  largeImageHeight: 400, thumbnailHeight: 80, thumbnailWidth: 120, visibleThumbnails: 6,
};

const DEFAULT_COLORS: GlobalColors = {
  primary: '#313136', secondary: '#FFFFFF', accent1: '#27E2A8',
  accent2: '#4A73FC', accent3: '#FF0000', accent4: '#EDFF9F',
};

const PAGE_DEFS = [
  { id: 'page-home', title: 'Home', slug: 'home' },
  { id: 'page-attendees', title: 'Attendees', slug: 'attendees' },
  { id: 'page-speakers', title: 'Speakers', slug: 'speakers' },
  { id: 'page-agenda', title: 'Agenda', slug: 'agenda' },
  { id: 'page-tickets', title: 'Tickets', slug: 'tickets' },
  { id: 'page-registration', title: 'Registration', slug: 'registration' },
  { id: 'page-login', title: 'Login', slug: 'login' },
];

function makeSection(type: SectionType, order = 0, width: SectionWidth = 'full'): Section {
  return {
    id: 'sec-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    type, label: SECTION_LABELS[type], order, enabled: true,
    height: SECTION_HEIGHTS[type], width,
    elements: [],
    carouselConfig: (type === 'carousel' || type === 'gallery')
      ? { ...DEFAULT_CAROUSEL_CONFIG } : undefined,
    carouselImages: (type === 'carousel' || type === 'gallery') ? [] : undefined,
    backgroundOverride: null,
  };
}

function buildDefaultDef(): PageDefinition {
  const pages: Page[] = PAGE_DEFS.map((pd, i) => ({
    id: pd.id, title: pd.title, slug: pd.slug, enabled: true, isDefault: i === 0,
    background: { type: 'color' as const, value: '#FFFFFF' },
    elements: [], rows: [], canvasHeight: 800,
  }));
  const navLinks: NavLink[] = pages.map(p => ({ pageId: p.id, label: p.title, visible: true }));
  return {
    id: 'def-001', title: 'New Event', globalColors: { ...DEFAULT_COLORS },
    header: {
      enabled: true, background: { type: 'color', value: '#2c3e7a' },
      logoWidth: 120, logoHeight: 40, logoAlignment: 'left',
      navLinks: navLinks.map(n => ({ ...n })), navAlignment: 'right',
      activeColor: '#27E2A8', defaultColor: '#FFFFFF', height: 64,
    },
    footer: {
      enabled: true, background: { type: 'color', value: '#313136' },
      logoAlignment: 'left', copyrightText: '© 2024 Envlor', copyrightAlignment: 'right',
      navLinks: navLinks.map(n => ({ ...n })), navAlignment: 'center',
      activeColor: '#27E2A8', defaultColor: '#FFFFFF', elements: [], height: 80,
    },
    pages, activePageId: 'page-home',
  };
}

@Injectable({ providedIn: 'root' })
export class EditorService {
  private platformId = inject(PLATFORM_ID);

  pageDefinition = signal<PageDefinition>(buildDefaultDef());
  editingMode = signal<'page' | 'header' | 'footer'>('page');
  selectedElementId = signal<string | null>(null);
  selectedSectionId = signal<string | null>(null);
  /** rowId of the row containing the selectedSection; null for free elements */
  selectedElementRowId = signal<string | null>(null);
  selectedElementSectionId = signal<string | null>(null);
  showGrid = signal(true);
  isPreviewMode = signal(false);
  dragInsertIndex = signal<number | null>(null);

  activePage = computed(() => {
    const def = this.pageDefinition();
    return def.pages.find(p => p.id === def.activePageId) ?? def.pages[0];
  });

  activePageId = computed(() => this.pageDefinition().activePageId);
  elements = computed(() => this.activePage().elements);
  rows = computed(() => [...this.activePage().rows].sort((a, b) => a.order - b.order));

  selectedElement = computed(() => {
    const id = this.selectedElementId();
    if (!id) return null;
    // check free elements first
    const free = this.activePage().elements.find(el => el.id === id);
    if (free) return free;
    // check section elements
    for (const row of this.activePage().rows) {
      for (const sec of row.sections) {
        const el = sec.elements.find(e => e.id === id);
        if (el) return el;
      }
    }
    return null;
  });

  selectedSection = computed(() => {
    const id = this.selectedSectionId();
    if (!id) return null;
    for (const row of this.activePage().rows) {
      const sec = row.sections.find(s => s.id === id);
      if (sec) return sec;
    }
    return null;
  });

  selectedSectionRow = computed(() => {
    const id = this.selectedSectionId();
    if (!id) return null;
    return this.activePage().rows.find(r => r.sections.some(s => s.id === id)) ?? null;
  });

  resolvedGlobalColors = computed(() => this.pageDefinition().globalColors);
  pages = computed(() => this.pageDefinition().pages);
  globalColors = computed(() => this.pageDefinition().globalColors);
  activeHeader = computed(() => this.pageDefinition().header);
  activeFooter = computed(() => this.pageDefinition().footer);

  selectedFooterElementId = signal<string | null>(null);
  selectedFooterElement = computed(() => {
    const id = this.selectedFooterElementId();
    if (!id) return null;
    return this.pageDefinition().footer.elements.find(el => el.id === id) ?? null;
  });

  // ─── Color resolution ───────────────────────────────────────────────

  resolveColor(styles: ElementStyles | undefined, property: 'color' | 'backgroundColor'): string {
    const colors = this.pageDefinition().globalColors;
    if (property === 'color' && styles?.useGlobalColor) return colors[styles.useGlobalColor];
    if (property === 'backgroundColor' && styles?.useGlobalBackground) return colors[styles.useGlobalBackground];
    if (property === 'color') return styles?.color ?? colors.primary;
    return styles?.backgroundColor ?? 'transparent';
  }

  // ─── Page methods ────────────────────────────────────────────────────

  addPage(title: string): void {
    const id = 'page-' + Date.now();
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const page: Page = {
      id, title, slug, enabled: true, isDefault: false,
      background: { type: 'color', value: '#FFFFFF' },
      elements: [], rows: [], canvasHeight: 800,
    };
    this.pageDefinition.update(def => ({ ...def, pages: [...def.pages, page], activePageId: id }));
    this.syncNavLinks();
    this.clearSelection();
  }

  deletePage(id: string): void {
    this.pageDefinition.update(def => {
      if (def.pages.length <= 1) return def;
      const pages = def.pages.filter(p => p.id !== id);
      const activePageId = def.activePageId === id ? pages[0].id : def.activePageId;
      return { ...def, pages, activePageId };
    });
    this.syncNavLinks();
    this.clearSelection();
  }

  setActivePage(id: string): void {
    this.pageDefinition.update(def => ({ ...def, activePageId: id }));
    this.clearSelection();
  }

  updatePage(id: string, changes: Partial<Page>): void {
    this.pageDefinition.update(def => ({
      ...def, pages: def.pages.map(p => p.id === id ? { ...p, ...changes } : p),
    }));
  }

  updatePageTitle(id: string, title: string): void {
    this.updatePage(id, { title });
    this.syncNavLinks();
  }

  updatePageSlug(id: string, slug: string): void { this.updatePage(id, { slug }); }

  updatePageBackground(id: string, background: PageBackground): void {
    this.updatePage(id, { background });
  }

  duplicatePage(id: string): void {
    const page = this.pageDefinition().pages.find(p => p.id === id);
    if (!page) return;
    const newId = 'page-' + Date.now();
    const ts = Date.now();
    const copy: Page = {
      ...page, id: newId, title: page.title + ' (Copy)',
      slug: page.slug + '-copy', isDefault: false,
      rows: page.rows.map((row, ri) => ({
        ...row, id: 'row-' + (ts + ri),
        sections: row.sections.map((s, si) => ({ ...s, id: 'sec-' + (ts + ri * 100 + si) })),
      })),
      elements: page.elements.map((el, i) => ({ ...el, id: 'el-' + (ts + i + 10000) })),
    };
    this.pageDefinition.update(def => ({ ...def, pages: [...def.pages, copy], activePageId: newId }));
    this.syncNavLinks();
    this.clearSelection();
  }

  togglePageEnabled(id: string): void {
    this.pageDefinition.update(def => ({
      ...def, pages: def.pages.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p),
    }));
  }

  // ─── Free element methods ─────────────────────────────────────────────

  addElement(type: ElementType, x: number, y: number): string {
    const id = 'el-' + Date.now();
    const newEl: CanvasElement = {
      id, type, x, y, width: 4, height: 2,
      ...this.defaultElementProps(type),
    };
    this.updateActivePage(p => ({ ...p, elements: [...p.elements, newEl] }));
    this.selectedElementId.set(id);
    this.selectedSectionId.set(null);
    this.selectedElementRowId.set(null);
    this.selectedElementSectionId.set(null);
    return id;
  }

  deleteElement(id: string): void {
    this.updateActivePage(p => ({ ...p, elements: p.elements.filter(el => el.id !== id) }));
    this.selectedElementId.set(null);
    this.selectedElementRowId.set(null);
    this.selectedElementSectionId.set(null);
  }

  moveElement(id: string, x: number, y: number): void {
    this.updateActivePage(p => ({
      ...p, elements: p.elements.map(el => el.id === id ? { ...el, x, y } : el),
    }));
  }

  resizeElement(id: string, w: number, h: number): void {
    this.updateActivePage(p => ({
      ...p, elements: p.elements.map(el =>
        el.id === id ? { ...el, width: Math.max(2, w), height: Math.max(2, h) } : el),
    }));
  }

  updateElement(id: string, changes: Partial<CanvasElement>): void {
    this.updateActivePage(p => ({
      ...p, elements: p.elements.map(el => el.id === id ? { ...el, ...changes } : el),
    }));
  }

  selectElement(id: string | null): void {
    this.selectedElementId.set(id);
    if (id) this.selectedSectionId.set(null);
    // clear section-element context if free element
    if (id && this.activePage().elements.some(el => el.id === id)) {
      this.selectedElementRowId.set(null);
      this.selectedElementSectionId.set(null);
    }
  }

  // ─── Row methods ──────────────────────────────────────────────────────

  addRow(insertIndex: number): void {
    const rowId = 'row-' + Date.now();
    const newSection = makeSection('blank', 0, 'full');
    const newRow: Row = { id: rowId, order: insertIndex, sections: [newSection] };
    this.updateActivePage(p => {
      const rows = [...p.rows].sort((a, b) => a.order - b.order);
      rows.splice(insertIndex, 0, newRow);
      return { ...p, rows: rows.map((r, i) => ({ ...r, order: i })) };
    });
    this.selectedSectionId.set(newSection.id);
    this.selectedElementId.set(null);
  }

  deleteRow(rowId: string): void {
    this.updateActivePage(p => {
      const rows = p.rows.filter(r => r.id !== rowId).map((r, i) => ({ ...r, order: i }));
      return { ...p, rows };
    });
    this.clearSelection();
  }

  reorderRow(fromIndex: number, toIndex: number): void {
    this.updateActivePage(p => {
      const rows = [...p.rows].sort((a, b) => a.order - b.order);
      const [moved] = rows.splice(fromIndex, 1);
      rows.splice(toIndex, 0, moved);
      return { ...p, rows: rows.map((r, i) => ({ ...r, order: i })) };
    });
  }

  // ─── Section methods (within rows) ────────────────────────────────────

  addSectionToRow(rowId: string, type: SectionType): void {
    this.updateActivePage(p => {
      const rows = p.rows.map(r => {
        if (r.id !== rowId) return r;
        if (r.sections.length >= 3) return r;
        const newSection = makeSection(type, r.sections.length);
        const allSections = [...r.sections, newSection];
        const count = allSections.length;
        const width: SectionWidth = count === 1 ? 'full' : count === 2 ? 'half' : 'third';
        return { ...r, sections: allSections.map(s => ({ ...s, width })) };
      });
      return { ...p, rows };
    });
  }

  addSectionAsNewRow(type: SectionType, insertIndex: number): void {
    const rowId = 'row-' + Date.now();
    const newSection = makeSection(type, 0, 'full');
    const newRow: Row = { id: rowId, order: insertIndex, sections: [newSection] };
    this.updateActivePage(p => {
      const rows = [...p.rows].sort((a, b) => a.order - b.order);
      rows.splice(insertIndex, 0, newRow);
      return { ...p, rows: rows.map((r, i) => ({ ...r, order: i })) };
    });
    this.selectedSectionId.set(newSection.id);
    this.selectedElementId.set(null);
  }

  removeSectionFromRow(rowId: string, sectionId: string): void {
    this.updateActivePage(p => {
      let rows = p.rows.map(r => {
        if (r.id !== rowId) return r;
        const remaining = r.sections.filter(s => s.id !== sectionId);
        if (remaining.length === 0) return null;
        const count = remaining.length;
        const width: SectionWidth = count === 1 ? 'full' : count === 2 ? 'half' : 'third';
        return { ...r, sections: remaining.map(s => ({ ...s, width })) };
      }).filter((r): r is Row => r !== null);
      rows = rows.map((r, i) => ({ ...r, order: i }));
      return { ...p, rows };
    });
    if (this.selectedSectionId() === sectionId) this.selectedSectionId.set(null);
  }

  updateSection(rowId: string, sectionId: string, changes: Partial<Section>): void {
    this.updateActivePage(p => ({
      ...p, rows: p.rows.map(r =>
        r.id !== rowId ? r : {
          ...r, sections: r.sections.map(s => s.id === sectionId ? { ...s, ...changes } : s),
        }),
    }));
  }

  setSectionWidth(rowId: string, sectionId: string, width: SectionWidth): void {
    this.updateSection(rowId, sectionId, { width });
  }

  selectSection(id: string | null): void {
    this.selectedSectionId.set(id);
    if (id) {
      this.selectedElementId.set(null);
      this.selectedElementRowId.set(null);
      this.selectedElementSectionId.set(null);
    }
  }

  toggleSectionEnabled(rowId: string, sectionId: string): void {
    this.updateSection(rowId, sectionId, {
      enabled: !(this.activePage().rows
        .find(r => r.id === rowId)?.sections
        .find(s => s.id === sectionId)?.enabled ?? true),
    });
  }

  // ─── Element methods inside sections ──────────────────────────────────

  addElementToSection(rowId: string, sectionId: string, type: ElementType, x: number, y: number): string {
    const id = 'el-' + Date.now();
    const newEl: CanvasElement = { id, type, x, y, width: 4, height: 2, ...this.defaultElementProps(type) };
    this.updateActivePage(p => ({
      ...p, rows: p.rows.map(r =>
        r.id !== rowId ? r : {
          ...r, sections: r.sections.map(s =>
            s.id !== sectionId ? s : { ...s, elements: [...s.elements, newEl] }),
        }),
    }));
    this.selectedElementId.set(id);
    this.selectedElementRowId.set(rowId);
    this.selectedElementSectionId.set(sectionId);
    this.selectedSectionId.set(null);
    return id;
  }

  updateElementInSection(rowId: string, sectionId: string, elementId: string, changes: Partial<CanvasElement>): void {
    this.updateActivePage(p => ({
      ...p, rows: p.rows.map(r =>
        r.id !== rowId ? r : {
          ...r, sections: r.sections.map(s =>
            s.id !== sectionId ? s : {
              ...s, elements: s.elements.map(el => el.id === elementId ? { ...el, ...changes } : el),
            }),
        }),
    }));
  }

  deleteElementFromSection(rowId: string, sectionId: string, elementId: string): void {
    this.updateActivePage(p => ({
      ...p, rows: p.rows.map(r =>
        r.id !== rowId ? r : {
          ...r, sections: r.sections.map(s =>
            s.id !== sectionId ? s : { ...s, elements: s.elements.filter(el => el.id !== elementId) }),
        }),
    }));
    this.selectedElementId.set(null);
    this.selectedElementRowId.set(null);
    this.selectedElementSectionId.set(null);
  }

  moveElementInSection(rowId: string, sectionId: string, elementId: string, x: number, y: number): void {
    this.updateElementInSection(rowId, sectionId, elementId, { x, y });
  }

  resizeElementInSection(rowId: string, sectionId: string, elementId: string, w: number, h: number): void {
    this.updateElementInSection(rowId, sectionId, elementId, {
      width: Math.max(2, w), height: Math.max(2, h),
    });
  }

  selectElementInSection(elementId: string, rowId: string, sectionId: string): void {
    this.selectedElementId.set(elementId);
    this.selectedElementRowId.set(rowId);
    this.selectedElementSectionId.set(sectionId);
    this.selectedSectionId.set(null);
  }

  // ─── Carousel methods ──────────────────────────────────────────────────

  addCarouselImages(rowId: string, sectionId: string, files: FileList): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const sec = this.activePage().rows.find(r => r.id === rowId)?.sections.find(s => s.id === sectionId);
    if (!sec) return;
    let order = (sec.carouselImages ?? []).length;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const imageId = 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const imgOrder = order++;
      reader.onload = () => {
        this.updateActivePage(p => ({
          ...p, rows: p.rows.map(r =>
            r.id !== rowId ? r : {
              ...r, sections: r.sections.map(s =>
                s.id !== sectionId ? s : {
                  ...s, carouselImages: [
                    ...(s.carouselImages ?? []),
                    { id: imageId, src: reader.result as string, order: imgOrder },
                  ],
                }),
            }),
        }));
      };
      reader.readAsDataURL(file);
    });
  }

  addCarouselImageAtSlot(rowId: string, sectionId: string, slotIndex: number, file: File): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const reader = new FileReader();
    const imageId = 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    reader.onload = () => {
      this.updateActivePage(p => ({
        ...p, rows: p.rows.map(r =>
          r.id !== rowId ? r : {
            ...r, sections: r.sections.map(s => {
              if (s.id !== sectionId) return s;
              const imgs = [...(s.carouselImages ?? [])];
              const existingIdx = imgs.findIndex(img => img.order === slotIndex);
              if (existingIdx >= 0) {
                imgs[existingIdx] = { ...imgs[existingIdx], src: reader.result as string };
              } else {
                imgs.push({ id: imageId, src: reader.result as string, order: slotIndex });
                imgs.sort((a, b) => a.order - b.order);
              }
              return { ...s, carouselImages: imgs };
            }),
          }),
      }));
    };
    reader.readAsDataURL(file);
  }

  removeCarouselImage(rowId: string, sectionId: string, imageId: string): void {
    this.updateActivePage(p => ({
      ...p, rows: p.rows.map(r =>
        r.id !== rowId ? r : {
          ...r, sections: r.sections.map(s =>
            s.id !== sectionId ? s : {
              ...s, carouselImages: (s.carouselImages ?? [])
                .filter(img => img.id !== imageId)
                .map((img, i) => ({ ...img, order: i })),
            }),
        }),
    }));
  }

  reorderCarouselImages(rowId: string, sectionId: string, fromIndex: number, toIndex: number): void {
    this.updateActivePage(p => ({
      ...p, rows: p.rows.map(r =>
        r.id !== rowId ? r : {
          ...r, sections: r.sections.map(s => {
            if (s.id !== sectionId) return s;
            const imgs = [...(s.carouselImages ?? [])];
            const [moved] = imgs.splice(fromIndex, 1);
            imgs.splice(toIndex, 0, moved);
            return { ...s, carouselImages: imgs.map((img, i) => ({ ...img, order: i })) };
          }),
        }),
    }));
  }

  updateCarouselConfig(rowId: string, sectionId: string, config: Partial<CarouselConfig>): void {
    this.updateActivePage(p => ({
      ...p, rows: p.rows.map(r =>
        r.id !== rowId ? r : {
          ...r, sections: r.sections.map(s =>
            s.id !== sectionId ? s : {
              ...s, carouselConfig: { ...(s.carouselConfig ?? { ...DEFAULT_CAROUSEL_CONFIG }), ...config },
            }),
        }),
    }));
  }

  // ─── Header / Footer ──────────────────────────────────────────────────

  updateHeader(changes: Partial<HeaderConfig>): void {
    this.pageDefinition.update(def => ({ ...def, header: { ...def.header, ...changes } }));
  }

  updateHeaderAlignment(logoAlignment?: AlignValue, navAlignment?: AlignValue): void {
    const changes: Partial<HeaderConfig> = {};
    if (logoAlignment !== undefined) changes.logoAlignment = logoAlignment;
    if (navAlignment !== undefined) changes.navAlignment = navAlignment;
    this.updateHeader(changes);
  }

  updateFooter(changes: Partial<FooterConfig>): void {
    this.pageDefinition.update(def => ({ ...def, footer: { ...def.footer, ...changes } }));
  }

  updateFooterAlignment(logoAlignment?: AlignValue, navAlignment?: AlignValue, copyrightAlignment?: AlignValue): void {
    const changes: Partial<FooterConfig> = {};
    if (logoAlignment !== undefined) changes.logoAlignment = logoAlignment;
    if (navAlignment !== undefined) changes.navAlignment = navAlignment;
    if (copyrightAlignment !== undefined) changes.copyrightAlignment = copyrightAlignment;
    this.updateFooter(changes);
  }

  setEditingMode(mode: 'page' | 'header' | 'footer'): void {
    this.editingMode.set(mode);
    this.isPreviewMode.set(false);
  }

  // ─── Global colors ─────────────────────────────────────────────────────

  updateGlobalColors(changes: Partial<GlobalColors>): void {
    this.pageDefinition.update(def => ({ ...def, globalColors: { ...def.globalColors, ...changes } }));
  }

  updateGlobalColor(key: keyof GlobalColors, value: string): void {
    this.updateGlobalColors({ [key]: value });
  }

  // ─── Footer elements ──────────────────────────────────────────────────

  selectFooterElement(id: string | null): void { this.selectedFooterElementId.set(id); }

  addFooterElement(type: ElementType, x: number, y: number): string {
    const id = 'fel-' + Date.now();
    const newEl: CanvasElement = {
      id, type, x, y, width: 4, height: 2,
      content: type === 'text' ? 'Footer text' : type === 'button' ? 'Click Me' : '',
      styles: {
        color: '#FFFFFF', fontSize: 14,
        backgroundColor: type === 'button' ? '#4A73FC' : 'transparent',
        borderRadius: type === 'button' ? 6 : 0,
      },
    };
    this.pageDefinition.update(def => ({
      ...def, footer: { ...def.footer, elements: [...def.footer.elements, newEl] },
    }));
    this.selectedFooterElementId.set(id);
    return id;
  }

  moveFooterElement(id: string, x: number, y: number): void {
    this.pageDefinition.update(def => ({
      ...def, footer: {
        ...def.footer,
        elements: def.footer.elements.map(el => el.id === id ? { ...el, x, y } : el),
      },
    }));
  }

  updateFooterElement(id: string, changes: Partial<CanvasElement>): void {
    this.pageDefinition.update(def => ({
      ...def, footer: {
        ...def.footer,
        elements: def.footer.elements.map(el => el.id === id ? { ...el, ...changes } : el),
      },
    }));
  }

  deleteFooterElement(id: string): void {
    this.pageDefinition.update(def => ({
      ...def, footer: {
        ...def.footer,
        elements: def.footer.elements.filter(el => el.id !== id),
      },
    }));
    this.selectedFooterElementId.set(null);
  }

  resizeFooterElement(id: string, w: number, h: number): void {
    this.updateFooterElement(id, { width: Math.max(2, w), height: Math.max(2, h) });
  }

  // ─── Sync / JSON ──────────────────────────────────────────────────────

  syncNavLinks(): void {
    this.pageDefinition.update(def => {
      const pages = def.pages;
      const rebuildLinks = (existing: NavLink[]): NavLink[] => {
        const map = new Map(existing.map(nl => [nl.pageId, nl]));
        return pages.map(p => map.get(p.id) ?? { pageId: p.id, label: p.title, visible: true });
      };
      return {
        ...def,
        header: { ...def.header, navLinks: rebuildLinks(def.header.navLinks) },
        footer: { ...def.footer, navLinks: rebuildLinks(def.footer.navLinks) },
      };
    });
  }

  getPageJSON(): string {
    return JSON.stringify(this.pageDefinition(), null, 2);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private clearSelection(): void {
    this.selectedElementId.set(null);
    this.selectedSectionId.set(null);
    this.selectedElementRowId.set(null);
    this.selectedElementSectionId.set(null);
  }

  private defaultElementProps(type: ElementType): Partial<CanvasElement> {
    const map: Record<ElementType, Partial<CanvasElement>> = {
      text: { content: 'Edit this text', styles: { color: '#000000', fontSize: 16, backgroundColor: 'transparent', borderRadius: 0 } },
      image: { styles: { backgroundColor: 'transparent', borderRadius: 0 } },
      button: { content: 'Click Me', styles: { color: '#FFFFFF', fontSize: 16, backgroundColor: '#4A73FC', borderRadius: 6 } },
      shape: { styles: { backgroundColor: '#27E2A8', borderRadius: 0 } },
      divider: { styles: { backgroundColor: '#cccccc', borderRadius: 0 } },
    };
    return map[type] ?? {};
  }

  private updateActivePage(updater: (page: Page) => Page): void {
    const activeId = this.pageDefinition().activePageId;
    this.pageDefinition.update(def => ({
      ...def, pages: def.pages.map(p => p.id === activeId ? updater(p) : p),
    }));
  }
}

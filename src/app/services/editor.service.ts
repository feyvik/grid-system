import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type {
  CanvasElement, CarouselConfig, ElementStyles, ElementType,
  FooterConfig, GlobalColors, HeaderConfig, NavLink, Page, PageBackground,
  PageDefinition, Section, SectionType,
} from '../models/page.model';

export const SECTION_HEIGHTS: Record<SectionType, number> = {
  blank: 200, custom: 200, carousel: 300, gallery: 300,
  'speaker-cards': 250, 'pricing-cards': 250, attendees: 250, agenda: 250, faq: 250,
};

const SECTION_LABELS: Record<SectionType, string> = {
  blank: 'Blank Section', custom: 'Custom Section', carousel: 'Carousel',
  gallery: 'Gallery', 'speaker-cards': 'Speaker Cards', 'pricing-cards': 'Pricing Cards',
  attendees: 'Attendees', agenda: 'Agenda', faq: 'FAQ',
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

function buildDefaultDef(): PageDefinition {
  const pages: Page[] = PAGE_DEFS.map((pd, i) => ({
    id: pd.id, title: pd.title, slug: pd.slug, enabled: true, isDefault: i === 0,
    background: { type: 'color' as const, value: '#FFFFFF' }, elements: [], sections: [], canvasHeight: 800,
  }));
  const navLinks: NavLink[] = pages.map(p => ({ pageId: p.id, label: p.title, visible: true }));
  return {
    id: 'def-001', title: 'New Event', globalColors: { ...DEFAULT_COLORS },
    header: {
      enabled: true, background: { type: 'color', value: '#2c3e7a' },
      logoWidth: 120, logoHeight: 40, navLinks: navLinks.map(n => ({ ...n })),
      activeColor: '#27E2A8', defaultColor: '#FFFFFF', height: 64,
    },
    footer: {
      enabled: true, background: { type: 'color', value: '#313136' },
      copyrightText: '© 2024 Envlor', navLinks: navLinks.map(n => ({ ...n })),
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
  showGrid = signal(true);
  isPreviewMode = signal(false);
  dragInsertIndex = signal<number | null>(null);

  activePage = computed(() => {
    const def = this.pageDefinition();
    return def.pages.find(p => p.id === def.activePageId) ?? def.pages[0];
  });

  activePageId = computed(() => this.pageDefinition().activePageId);
  elements = computed(() => this.activePage().elements);
  sections = computed(() => [...this.activePage().sections].sort((a, b) => a.order - b.order));

  selectedElement = computed(() => {
    const id = this.selectedElementId();
    if (!id) return null;
    return this.activePage().elements.find(el => el.id === id) ?? null;
  });

  selectedSection = computed(() => {
    const id = this.selectedSectionId();
    if (!id) return null;
    return this.activePage().sections.find(s => s.id === id) ?? null;
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

  resolveColor(styles: ElementStyles | undefined, property: 'color' | 'backgroundColor'): string {
    const colors = this.pageDefinition().globalColors;
    if (property === 'color' && styles?.useGlobalColor) return colors[styles.useGlobalColor];
    if (property === 'backgroundColor' && styles?.useGlobalBackground) return colors[styles.useGlobalBackground];
    if (property === 'color') return styles?.color ?? colors.primary;
    return styles?.backgroundColor ?? 'transparent';
  }

  addPage(title: string): void {
    const id = 'page-' + Date.now();
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const page: Page = {
      id, title, slug, enabled: true, isDefault: false,
      background: { type: 'color', value: '#FFFFFF' }, elements: [], sections: [], canvasHeight: 800,
    };
    this.pageDefinition.update(def => ({ ...def, pages: [...def.pages, page], activePageId: id }));
    this.syncNavLinks();
    this.selectedElementId.set(null);
    this.selectedSectionId.set(null);
  }

  deletePage(id: string): void {
    this.pageDefinition.update(def => {
      if (def.pages.length <= 1) return def;
      const pages = def.pages.filter(p => p.id !== id);
      const activePageId = def.activePageId === id ? pages[0].id : def.activePageId;
      return { ...def, pages, activePageId };
    });
    this.syncNavLinks();
    this.selectedElementId.set(null);
    this.selectedSectionId.set(null);
  }

  setActivePage(id: string): void {
    this.pageDefinition.update(def => ({ ...def, activePageId: id }));
    this.selectedElementId.set(null);
    this.selectedSectionId.set(null);
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

  updatePageSlug(id: string, slug: string): void {
    this.updatePage(id, { slug });
  }

  updatePageBackground(id: string, background: PageBackground): void {
    this.updatePage(id, { background });
  }

  duplicatePage(id: string): void {
    const page = this.pageDefinition().pages.find(p => p.id === id);
    if (!page) return;
    const newId = 'page-' + Date.now();
    const ts = Date.now();
    const copy: Page = {
      ...page, id: newId, title: page.title + ' (Copy)', slug: page.slug + '-copy', isDefault: false,
      sections: page.sections.map((s, i) => ({ ...s, id: 'sec-' + (ts + i) })),
      elements: page.elements.map((el, i) => ({ ...el, id: 'el-' + (ts + i + 1000) })),
    };
    this.pageDefinition.update(def => ({ ...def, pages: [...def.pages, copy], activePageId: newId }));
    this.syncNavLinks();
    this.selectedElementId.set(null);
    this.selectedSectionId.set(null);
  }

  togglePageEnabled(id: string): void {
    this.pageDefinition.update(def => ({
      ...def, pages: def.pages.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p),
    }));
  }

  addElement(type: ElementType, x: number, y: number): string {
    const id = 'el-' + Date.now();
    const defaults: Partial<CanvasElement> = (({
      text: { content: 'Edit this text', styles: { color: '#000000', fontSize: 16, backgroundColor: 'transparent', borderRadius: 0 } },
      image: { styles: { backgroundColor: 'transparent', borderRadius: 0 } },
      button: { content: 'Click Me', styles: { color: '#FFFFFF', fontSize: 16, backgroundColor: '#4A73FC', borderRadius: 6 } },
      shape: { styles: { backgroundColor: '#27E2A8', borderRadius: 0 } },
      divider: { styles: { backgroundColor: '#cccccc', borderRadius: 0 } },
    }) as Record<ElementType, Partial<CanvasElement>>)[type] ?? {};
    const newEl: CanvasElement = { id, type, x, y, width: 4, height: 2, ...defaults };
    this.updateActivePage(p => ({ ...p, elements: [...p.elements, newEl] }));
    this.selectedElementId.set(id);
    this.selectedSectionId.set(null);
    return id;
  }

  deleteElement(id: string): void {
    this.updateActivePage(p => ({ ...p, elements: p.elements.filter(el => el.id !== id) }));
    this.selectedElementId.set(null);
  }

  moveElement(id: string, x: number, y: number): void {
    this.updateActivePage(p => ({
      ...p, elements: p.elements.map(el => el.id === id ? { ...el, x, y } : el),
    }));
  }

  resizeElement(id: string, w: number, h: number): void {
    this.updateActivePage(p => ({
      ...p, elements: p.elements.map(el => el.id === id ? { ...el, width: Math.max(2, w), height: Math.max(2, h) } : el),
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
  }

  addSection(type: SectionType, insertIndex?: number): void {
    const id = 'sec-' + Date.now();
    const sorted = [...this.activePage().sections].sort((a, b) => a.order - b.order);
    const order = insertIndex !== undefined ? insertIndex : sorted.length;
    const newSection: Section = {
      id, type, label: SECTION_LABELS[type], order, enabled: true,
      height: SECTION_HEIGHTS[type], elements: [],
      carouselConfig: (type === 'carousel' || type === 'gallery')
        ? { scrollMode: 'click', autoScrollInterval: 3000, showFocusedCenter: true }
        : undefined,
      carouselImages: (type === 'carousel' || type === 'gallery') ? [] : undefined,
      backgroundOverride: null,
    };
    sorted.splice(order, 0, newSection);
    const reordered = sorted.map((s, i) => ({ ...s, order: i }));
    this.updateActivePage(p => ({
      ...p, sections: reordered, canvasHeight: this.calcCanvasHeight(reordered, p.elements),
    }));
    this.selectedSectionId.set(id);
    this.selectedElementId.set(null);
  }

  deleteSection(id: string): void {
    this.updateActivePage(p => {
      const sections = p.sections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i }));
      return { ...p, sections, canvasHeight: this.calcCanvasHeight(sections, p.elements) };
    });
    if (this.selectedSectionId() === id) this.selectedSectionId.set(null);
  }

  updateSection(id: string, changes: Partial<Section>): void {
    this.updateActivePage(p => {
      const sections = p.sections.map(s => s.id === id ? { ...s, ...changes } : s);
      return { ...p, sections, canvasHeight: this.calcCanvasHeight(sections, p.elements) };
    });
  }

  reorderSection(fromIndex: number, toIndex: number): void {
    this.updateActivePage(p => {
      const sections = [...p.sections].sort((a, b) => a.order - b.order);
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      return { ...p, sections: sections.map((s, i) => ({ ...s, order: i })) };
    });
  }

  moveSectionUp(id: string): void {
    const idx = this.sections().findIndex(s => s.id === id);
    if (idx > 0) this.reorderSection(idx, idx - 1);
  }

  moveSectionDown(id: string): void {
    const secs = this.sections();
    const idx = secs.findIndex(s => s.id === id);
    if (idx < secs.length - 1) this.reorderSection(idx, idx + 1);
  }

  selectSection(id: string | null): void {
    this.selectedSectionId.set(id);
    if (id) this.selectedElementId.set(null);
  }

  toggleSectionEnabled(id: string): void {
    this.updateActivePage(p => ({
      ...p, sections: p.sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s),
    }));
  }

  addCarouselImages(sectionId: string, files: FileList): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const section = this.activePage().sections.find(s => s.id === sectionId);
    if (!section) return;
    const existing = section.carouselImages ?? [];
    let order = existing.length;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const imageId = 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const imgOrder = order++;
      reader.onload = () => {
        this.updateActivePage(p => ({
          ...p, sections: p.sections.map(s => s.id !== sectionId ? s : {
            ...s, carouselImages: [...(s.carouselImages ?? []), { id: imageId, src: reader.result as string, order: imgOrder }],
          }),
        }));
      };
      reader.readAsDataURL(file);
    });
  }

  removeCarouselImage(sectionId: string, imageId: string): void {
    this.updateActivePage(p => ({
      ...p, sections: p.sections.map(s => s.id !== sectionId ? s : {
        ...s, carouselImages: (s.carouselImages ?? []).filter(img => img.id !== imageId).map((img, i) => ({ ...img, order: i })),
      }),
    }));
  }

  reorderCarouselImages(sectionId: string, fromIndex: number, toIndex: number): void {
    this.updateActivePage(p => ({
      ...p, sections: p.sections.map(s => {
        if (s.id !== sectionId) return s;
        const imgs = [...(s.carouselImages ?? [])];
        const [moved] = imgs.splice(fromIndex, 1);
        imgs.splice(toIndex, 0, moved);
        return { ...s, carouselImages: imgs.map((img, i) => ({ ...img, order: i })) };
      }),
    }));
  }

  updateCarouselConfig(sectionId: string, config: Partial<CarouselConfig>): void {
    this.updateActivePage(p => ({
      ...p, sections: p.sections.map(s => s.id !== sectionId ? s : {
        ...s, carouselConfig: { ...(s.carouselConfig ?? { scrollMode: 'click' as const, autoScrollInterval: 3000, showFocusedCenter: true }), ...config },
      }),
    }));
  }

  updateHeader(changes: Partial<HeaderConfig>): void {
    this.pageDefinition.update(def => ({ ...def, header: { ...def.header, ...changes } }));
  }

  updateFooter(changes: Partial<FooterConfig>): void {
    this.pageDefinition.update(def => ({ ...def, footer: { ...def.footer, ...changes } }));
  }

  setEditingMode(mode: 'page' | 'header' | 'footer'): void {
    this.editingMode.set(mode);
    this.isPreviewMode.set(false);
  }

  updateGlobalColors(changes: Partial<GlobalColors>): void {
    this.pageDefinition.update(def => ({ ...def, globalColors: { ...def.globalColors, ...changes } }));
  }

  updateGlobalColor(key: keyof GlobalColors, value: string): void {
    this.updateGlobalColors({ [key]: value });
  }

  getPageJSON(): string {
    return JSON.stringify(this.pageDefinition(), null, 2);
  }

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

  private updateActivePage(updater: (page: Page) => Page): void {
    const activeId = this.pageDefinition().activePageId;
    this.pageDefinition.update(def => ({
      ...def, pages: def.pages.map(p => p.id === activeId ? updater(p) : p),
    }));
  }

  private calcCanvasHeight(sections: Section[], elements: CanvasElement[]): number {
    const sectionsH = sections.reduce((sum, s) => sum + s.height, 0);
    const maxElY = elements.reduce((max, el) => Math.max(max, (el.y + el.height) * 40), 0);
    return Math.max(800, sectionsH + maxElY + 100);
  }
}

export type ElementType = 'text' | 'image' | 'button' | 'shape' | 'divider';

export type SectionType =
  | 'blank'
  | 'speaker-cards'
  | 'carousel'
  | 'gallery'
  | 'faq'
  | 'pricing-cards'
  | 'attendees'
  | 'agenda'
  | 'custom';

export type SectionWidth = 'full' | 'half' | 'third';

export type CarouselScrollMode = 'auto' | 'click' | 'both';

export type AlignValue = 'left' | 'center' | 'right';

export interface CarouselImage {
  id: string;
  src: string;
  caption?: string;
  order: number;
}

export interface CarouselConfig {
  scrollMode: CarouselScrollMode;
  autoScrollInterval: number;
  showFocusedCenter: boolean;
  largeImageHeight: number;
  thumbnailHeight: number;
  thumbnailWidth: number;
  visibleThumbnails: number;
}

export interface GlobalColors {
  primary: string;
  secondary: string;
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
}

export interface ElementStyles {
  color?: string;
  fontSize?: number;
  backgroundColor?: string;
  borderRadius?: number;
  useGlobalColor?: keyof GlobalColors | null;
  useGlobalBackground?: keyof GlobalColors | null;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  styles?: ElementStyles;
}

export interface Section {
  id: string;
  type: SectionType;
  label: string;
  order: number;
  enabled: boolean;
  height: number;
  width: SectionWidth;
  elements: CanvasElement[];
  carouselConfig?: CarouselConfig;
  carouselImages?: CarouselImage[];
  backgroundOverride?: { type: 'color' | 'image'; value: string } | null;
  customSettings?: Record<string, unknown>;
}

export interface Row {
  id: string;
  order: number;
  sections: Section[];
}

export interface NavLink {
  pageId: string;
  label: string;
  visible: boolean;
}

export interface HeaderConfig {
  enabled: boolean;
  background: { type: 'color' | 'image'; value: string };
  logoSrc?: string;
  logoWidth: number;
  logoHeight: number;
  logoAlignment: AlignValue;
  navLinks: NavLink[];
  navAlignment: AlignValue;
  activeColor: string;
  defaultColor: string;
  height: number;
}

export interface FooterConfig {
  enabled: boolean;
  background: { type: 'color' | 'image'; value: string };
  logoSrc?: string;
  logoAlignment: AlignValue;
  copyrightText: string;
  copyrightAlignment: AlignValue;
  navLinks: NavLink[];
  navAlignment: AlignValue;
  activeColor: string;
  defaultColor: string;
  elements: CanvasElement[];
  height: number;
}

export interface PageBackground {
  type: 'color' | 'image';
  value: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  enabled: boolean;
  isDefault: boolean;
  background: PageBackground;
  elements: CanvasElement[];
  rows: Row[];
  canvasHeight: number;
}

export interface PageDefinition {
  id: string;
  title: string;
  globalColors: GlobalColors;
  header: HeaderConfig;
  footer: FooterConfig;
  pages: Page[];
  activePageId: string;
}

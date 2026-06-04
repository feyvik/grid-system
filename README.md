# Envlor Editor

A drag-and-drop event website builder built with Angular 19 and Angular Universal (SSR). Event organizers use the admin editor to visually build their event website. The result is a JSON page definition that Angular Universal renders as a fast, SEO-friendly public-facing webpage.

---

## What This Project Is

Envlor is an event management platform. Organizers log into the admin editor, drag elements and sections onto a canvas, customize colors and layouts, and publish their event website — all without writing code.

The project has two sides:

- **Admin Editor** — the drag-and-drop canvas where organizers build pages
- **Public Renderer** — Angular Universal reads the saved JSON and outputs clean HTML for visitors

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 19 |
| SSR | Angular Universal |
| Server | Express |
| State Management | Angular Signals |
| Styling | CSS (component-scoped) |
| Drag and Drop | HTML5 Drag and Drop API |
| Image Handling | FileReader API (base64) |

---

## Project Structure

```
envlor-editor/
│
├── src/
│   ├── app/
│   │   ├── models/
│   │   │   └── page.model.ts           # All TypeScript interfaces
│   │   │
│   │   ├── services/
│   │   │   └── editor.service.ts       # Central state using Angular signals
│   │   │
│   │   ├── components/
│   │   │   ├── editor/                 # Main shell layout
│   │   │   ├── canvas/                 # The droppable canvas surface
│   │   │   ├── elements-panel/         # Left sidebar elements and sections
│   │   │   ├── settings-panel/         # Right sidebar settings
│   │   │   ├── section-editor/         # Full edit view for sections
│   │   │   ├── header-editor/          # Header configuration editor
│   │   │   ├── footer-editor/          # Footer configuration editor
│   │   │   ├── carousel-preview/       # Interactive carousel component
│   │   │   └── json-panel/             # Live JSON output panel
│   │   │
│   │   ├── app.routes.ts
│   │   ├── app.config.ts
│   │   └── app.config.server.ts
│   │
│   ├── main.ts                         # Browser entry point
│   ├── main.server.ts                  # Server entry point
│   └── styles.css                      # Global styles
│
└── server.ts                           # Express server for SSR
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Angular CLI 19

### Install Angular CLI

```bash
npm install -g @angular/cli
```

### Install Dependencies

```bash
npm install
```

### Run in Development

```bash
ng serve
```

Open `http://localhost:4200` in your browser.

### Build for Production

```bash
ng build
```

### Run SSR Server

```bash
node dist/envlor-editor/server/server.mjs
```

Open `http://localhost:4000` in your browser.

---

## How the Editor Works

### The Canvas

The canvas is one unified surface between the header and footer. It has two types of content:

**Free Elements** — Text, Image, Button, Shape, Divider. These are dragged from the left panel and placed anywhere on the canvas using absolute positioning. Their position is stored as grid coordinates (x, y) where each grid unit is 40px.

**Sections** — Full-width content blocks that stack vertically in document flow. When a section is dropped onto the canvas, it detects the drop position and inserts the section at the correct place pushing everything below it downward. Sections can be reordered by dragging their header bar.

### The Grid System

Every element position is stored in grid units not pixels.

```
Grid unit = 40px

Element at x:2, y:3 = left: 80px, top: 120px
Element with width:4, height:2 = width: 160px, height: 80px
```

On drop, the left edge snaps to the nearest grid line. The right edge is free.

### Global Colors

Six global color tokens are defined at the page definition level:

| Token | Default | Usage |
|---|---|---|
| Primary | #313136 | Default text color |
| Secondary | #FFFFFF | Default background |
| Accent 1 | #27E2A8 | Active nav links, highlights |
| Accent 2 | #4A73FC | Buttons, interactive elements |
| Accent 3 | #FF0000 | Alerts, errors |
| Accent 4 | #EDFF9F | Accents |

Elements use global color tokens by default. An element with its own individual color set ignores the global token. Changing a global color instantly updates all elements linked to that token.

### The JSON Definition

Everything the organizer builds is saved as a `PageDefinition` JSON object:

```json
{
  "id": "page-def-001",
  "title": "My Event",
  "globalColors": {
    "primary": "#313136",
    "secondary": "#FFFFFF",
    "accent1": "#27E2A8",
    "accent2": "#4A73FC",
    "accent3": "#FF0000",
    "accent4": "#EDFF9F"
  },
  "header": { ... },
  "footer": { ... },
  "pages": [
    {
      "id": "page-home",
      "title": "Home",
      "slug": "home",
      "enabled": true,
      "background": { "type": "color", "value": "#FFFFFF" },
      "elements": [ ... ],
      "sections": [ ... ]
    }
  ],
  "activePageId": "page-home"
}
```

---

## Default Pages

When a new event is created these pages are generated automatically:

| Page | Slug | Purpose |
|---|---|---|
| Home | /home | Landing page |
| Attendees | /attendees | Attendee list |
| Speakers | /speakers | Speaker profiles |
| Agenda | /agenda | Event schedule |
| Tickets | /tickets | Ticket purchasing |
| Registration | /registration | Registration form |
| Login | /login | Attendee login |

Each page can be enabled, disabled, renamed, duplicated or deleted.

---

## Available Elements

Elements are freely positioned on the canvas:

| Element | Description |
|---|---|
| Text | Editable text block with font size and color controls |
| Image | Image container with file upload, scales proportionally |
| Button | Styled button with link, color and border radius controls |
| Shape | Colored rectangle or circle, acts as background layer |
| Divider | Horizontal rule for visual separation |

---

## Available Sections

Sections are full-width content blocks dropped into any page:

| Section | Description |
|---|---|
| Blank | Empty full-width section, add any elements inside |
| Speaker Cards | Grid of speaker profile cards with photo, name, title |
| Carousel | Image carousel with auto scroll, click navigation and focused center layout |
| Gallery | Image grid with configurable columns |
| FAQ | Accordion of question and answer pairs |
| Pricing Cards | Side-by-side pricing tier cards |
| Attendees | Grid of attendee profile cards |
| Agenda | Vertical timeline of sessions with time and speaker |
| Custom | Any custom section with a name you define |

---

## Carousel Configuration

The carousel section supports three scroll modes:

- **Auto Scroll** — advances automatically on a timer (configurable in seconds)
- **Click Only** — user navigates with arrows or thumbnail clicks
- **Both** — auto scrolls and is also manually clickable

Layout options:
- Standard horizontal strip
- Focused center view with large main image and thumbnail strip at bottom

---

## Header and Footer

The header and footer are global — they appear on every page. They are edited separately from the page canvas by clicking the Header or Footer buttons in the toolbar.

**Header settings:**
- Background color or image
- Logo upload with size controls
- Navigation links (auto-synced with your pages)
- Active link color and default link color
- Enable/disable globally

**Footer settings:**
- Same as header
- Copyright text
- Free elements area (add text, images, buttons)

On the page canvas the header and footer appear as locked previews. Hovering shows a lock indicator. Clicking opens the dedicated editor.

---

## Editing Modes

The editor has three modes controlled by the toolbar:

| Mode | What You See |
|---|---|
| Page | The canvas with elements and sections for the active page |
| Header | The header editor with live preview |
| Footer | The footer editor with live preview |

---

## Preview Mode

Click the Preview button to see exactly what visitors will see:

- All editor chrome disappears
- Header renders at top (if enabled)
- Page content renders cleanly
- Footer renders at bottom (if enabled)
- No grid, no handles, no labels
- Carousel works interactively
- Exit with the fixed Exit Preview button

---

## Settings Panel

The right panel has three tabs:

**Element tab** — shown when an element is selected. Edit content, colors, size, position and delete.

**Page tab** — edit page title, slug, visibility, background and duplicate or delete the page.

**Global Colors tab** — edit the six global color tokens. Changes immediately update all linked elements.

---

## SSR Architecture

Angular Universal renders the public-facing event pages on the server:

```
Visitor requests /event/my-event
        ↓
Express server receives request
        ↓
Angular Universal reads PageDefinition JSON
        ↓
Renders full HTML on the server
        ↓
Sends complete HTML to visitor's browser
        ↓
Angular hydrates in the browser for interactivity
```

This gives event pages fast first load and full SEO indexability.

All components use `isPlatformBrowser` to guard any browser-only APIs (FileReader, drag and drop, setInterval) so SSR rendering never errors on the server.

---

## Key Architectural Decisions

**Angular Signals for state** — all state lives in the EditorService as signals. Components read computed values. No BehaviorSubjects, no manual change detection.

**JSON as the single source of truth** — every action in the editor updates the JSON. The renderer only needs the JSON to produce the page. The admin and public sides are completely decoupled.

**Grid coordinates not pixels** — elements store x, y, width, height in grid units. This makes the JSON resolution-independent and easy to reason about.

**Global color tokens** — elements reference color token names not hex values. This makes global theme changes instant without touching individual elements.

---

## Contributing

This project is in active development. The admin editor is the current focus. The public SSR renderer is the next phase.

---

## License

MIT

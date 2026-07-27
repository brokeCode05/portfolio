# Design System — Stonerich Granite Construction and Supply

## Color Palette

### Primary Colors
| Token | Hex | Usage |
|---|---|---|
| `--color-deep-red` | #B71C1C | Accent, CTAs, brand elements, active states |
| `--color-white` | #FFFFFF | Backgrounds, text on dark |
| `--color-dark-charcoal` | #1E1E1E | Hero backgrounds, footer, dark sections |

### Neutral Colors
| Token | Hex | Usage |
|---|---|---|
| `--color-black` | #0A0A0A | Primary text |
| `--color-gray-900` | #1A1A1A | Dark backgrounds |
| `--color-gray-800` | #2D2D2D | Section backgrounds |
| `--color-gray-700` | #404040 | |
| `--color-gray-600` | #606060 | Secondary text |
| `--color-gray-500` | #808080 | |
| `--color-gray-400` | #A0A0A0 | Placeholder text |
| `--color-gray-300` | #C0C0C0 | Borders, dividers |
| `--color-gray-200` | #E0E0E0 | Light borders |
| `--color-gray-100` | #F0F0F0 | Light backgrounds |
| `--color-gray-50` | #F8F8F8 | Page backgrounds |

### Stone/Beige Accents
| Token | Hex | Usage |
|---|---|---|
| `--color-stone-beige` | #D4C5A9 | Stone texture backgrounds |
| `--color-concrete-gray` | #B8B8B8 | Industrial accents |
| `--color-light-gray` | #E8E8E8 | Content section backgrounds |

### Functional Colors
| Token | Hex | Usage |
|---|---|---|
| `--color-success` | #2E7D32 | Success messages |
| `--color-error` | #C62828 | Error states |
| `--color-warning` | #F9A825 | Warning states |
| `--color-info` | #1565C0 | Information |

## Typography

### Font Family
- **Headings:** Playfair Display (serif) — for premium, elegant headings
- **Body:** Inter (sans-serif) — for clean, readable body text
- **Navigation:** Inter (sans-serif), medium weight
- **Buttons:** Inter (sans-serif), semibold

### Type Scale
| Level | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|
| Display | 4rem (64px) | 700 | 1.1 | -0.02em |
| H1 | 3rem (48px) | 700 | 1.15 | -0.02em |
| H2 | 2.25rem (36px) | 600 | 1.2 | -0.01em |
| H3 | 1.5rem (24px) | 600 | 1.3 | 0 |
| H4 | 1.25rem (20px) | 600 | 1.35 | 0 |
| Body Large | 1.125rem (18px) | 400 | 1.6 | 0 |
| Body | 1rem (16px) | 400 | 1.6 | 0 |
| Body Small | 0.875rem (14px) | 400 | 1.5 | 0 |
| Caption | 0.75rem (12px) | 400 | 1.4 | 0.02em |
| Button | 0.9375rem (15px) | 600 | 1 | 0.03em |
| Nav Link | 0.9375rem (15px) | 500 | 1 | 0.02em |
| Overline | 0.75rem (12px) | 600 | 1 | 0.08em |

## Spacing System

| Token | Value |
|---|---|
| --space-xs | 0.25rem (4px) |
| --space-sm | 0.5rem (8px) |
| --space-md | 1rem (16px) |
| --space-lg | 1.5rem (24px) |
| --space-xl | 2rem (32px) |
| --space-2xl | 3rem (48px) |
| --space-3xl | 4rem (64px) |
| --space-4xl | 6rem (96px) |
| --space-5xl | 8rem (128px) |

## Border Radius

| Token | Value | Usage |
|---|---|---|
| --radius-none | 0 | Industrial elements |
| --radius-sm | 2px | Small UI elements |
| --radius-md | 4px | Cards, buttons |
| --radius-lg | 6px | Large components |
| --radius-full | 9999px | Pills, badges |

## Shadows

| Token | Value | Usage |
|---|---|---|
| --shadow-sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle depth |
| --shadow-md | 0 4px 6px rgba(0,0,0,0.07) | Card hover |
| --shadow-lg | 0 10px 15px rgba(0,0,0,0.1) | Dropdowns, modals |
| --shadow-xl | 0 20px 25px rgba(0,0,0,0.15) | Hero overlays |

## Transitions

| Token | Duration | Easing |
|---|---|---|
| --transition-fast | 150ms | ease |
| --transition-base | 300ms | ease |
| --transition-slow | 500ms | ease |

## Z-Index Scale

| Layer | Value |
|---|---|
| Base | 1 |
| Sticky Nav | 50 |
| Overlay | 100 |
| Modal | 110 |
| Toast/Notification | 120 |

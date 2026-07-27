# High-Level UI Layout — Stonerich Granite Construction and Supply

## Design Direction

Premium architecture firm meets industrial stone supplier. Clean, spacious, image-forward layouts with strategic typography hierarchy. Dark charcoal backgrounds for hero/footer sections, white/light gray for content areas. Red as a precise accent for CTAs and key information only.

## Page Layouts

### Home Page
- **Hero:** Full-viewport with high-contrast overlay, bold heading, two CTAs
- **Featured Products:** Horizontal scroll or grid of 6 category cards with imagery
- **Why Choose Us:** 3-column icon + text trust pillars
- **Services:** Grid with icons and brief descriptions
- **Projects:** Placeholder cards (Content Required)
- **Stone Categories:** Full-bleed grid with category names overlaid
- **Process:** Horizontal numbered steps
- **FAQ:** Accordion
- **CTA Banner:** Full-width with background image and quote button
- **Footer:** 4-column with links and contact

### Inner Pages
- Consistent page header with breadcrumb
- Content area with generous whitespace
- Sidebar on contact-heavy pages (optional)

### Product Pages
- Hero with product name and category
- Gallery grid with lightbox
- Specs table
- Applications list
- CTA section

### Quote Page
- Centered form with max-width container
- 2-column layout on desktop (field grouping)
- Full-width on mobile

## Responsive Behavior

| Breakpoint | Layout Changes |
|---|---|
| > 1024px | Multi-column grids, full hero |
| 768-1024px | 2-column grids, reduced hero height |
| < 768px | Single column, stacked navigation, hamburger menu, floating call button |

## UI States

- **Default:** Clean, minimal, plenty of whitespace
- **Hover:** Subtle lift/elevation on cards, color shift on buttons, underline on links
- **Active:** Button press state with transform
- **Focus:** Visible focus ring for accessibility
- **Loading:** Skeleton screens for images, spinner for form submission
- **Error:** Inline form validation with clear error messages
- **Empty:** Graceful empty states for project placeholders

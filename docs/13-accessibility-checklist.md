# Accessibility Checklist — Stonerich Granite Construction and Supply

## Perceivable

### Text Alternatives
- [ ] All images have meaningful alt text
- [ ] Decorative images have `aria-hidden="true"` or empty alt
- [ ] Icons have accessible labels
- [ ] Form inputs have associated labels

### Time-Based Media
- [ ] No auto-playing video/audio
- [ ] Video controls provided if present

### Adaptable
- [ ] Content maintains meaning when linearized (no CSS)
- [ ] Heading hierarchy is logical (h1→h2→h3, no skipping)
- [ ] Lists use proper `<ul>`/`<ol>` elements

### Distinguishable
- [ ] Color is not the only means of conveying information
- [ ] Color contrast meets WCAG AA minimum (4.5:1 text, 3:1 large text)
- [ ] Red (#B71C1C) on white passes contrast check
- [ ] Text on dark charcoal backgrounds passes contrast check
- [ ] Focus indicators are visible (2px outline + offset)

## Operable

### Keyboard Access
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order follows visual order
- [ ] No keyboard traps
- [ ] Skip to content link provided

### Enough Time
- [ ] No time limits on content
- [ ] Form sessions don't expire unexpectedly

### Seizure Prevention
- [ ] No flashing content (more than 3 flashes/second)
- [ ] No auto-playing animations

### Navigable
- [ ] Page has descriptive `<title>`
- [ ] Headings describe page structure
- [ ] Navigation is consistent across pages
- [ ] Multiple ways to find content (nav + sitemap)
- [ ] Breadcrumb navigation on inner pages
- [ ] Focus management in modals/lightboxes

## Understandable

### Readable
- [ ] Language attribute set on `<html>`
- [ ] Unusual words are defined
- [ ] Abbreviations are explained

### Predictable
- [ ] Navigation is consistent across all pages
- [ ] Components behave consistently
- [ ] No unexpected context changes on focus/input

### Input Assistance
- [ ] Form errors are clearly identified
- [ ] Error suggestions provided
- [ ] Required fields are indicated
- [ ] Form validation is descriptive and helpful

## Robust

### Compatible
- [ ] Valid HTML5
- [ ] ARIA landmarks used (`<nav>`, `<main>`, `<footer>`)
- [ ] ARIA attributes used correctly
- [ ] Tested with screen readers (NVDA, VoiceOver)

## Additional Targets

- [ ] Target: WCAG 2.1 Level AA
- [ ] Test with keyboard-only navigation
- [ ] Test with screen reader
- [ ] Test with browser zoom up to 200%
- [ ] Test on mobile devices
- [ ] Test reduced motion preferences

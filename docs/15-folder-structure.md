# Folder Structure — Stonerich Granite Construction and Supply

## Next.js Project Structure

```
stonerich-website/
├── public/
│   ├── images/
│   │   ├── products/
│   │   │   ├── granite/
│   │   │   ├── marble/
│   │   │   ├── quartz/
│   │   │   ├── solid-surface/
│   │   │   ├── sintered-stone/
│   │   │   ├── natural-stone/
│   │   │   ├── slate/
│   │   │   ├── pebbles/
│   │   │   └── concrete-pavers/
│   │   ├── services/
│   │   ├── gallery/
│   │   ├── projects/
│   │   ├── hero/
│   │   └── logo/
│   ├── fonts/
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (Home)
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── services/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── projects/
│   │   │   └── page.tsx
│   │   ├── gallery/
│   │   │   └── page.tsx
│   │   ├── faq/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   └── request-a-quote/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── MobileMenu.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── Breadcrumb.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Container.tsx
│   │   │   ├── Section.tsx
│   │   │   ├── Grid.tsx
│   │   │   ├── Heading.tsx
│   │   │   ├── Text.tsx
│   │   │   ├── Image.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Toast.tsx
│   │   ├── home/
│   │   │   ├── Hero.tsx
│   │   │   ├── FeaturedProducts.tsx
│   │   │   ├── WhyChooseUs.tsx
│   │   │   ├── ServicesOverview.tsx
│   │   │   ├── StoneCategories.tsx
│   │   │   ├── Process.tsx
│   │   │   ├── FAQAccordion.tsx
│   │   │   └── CTABanner.tsx
│   │   ├── products/
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── ProductFilter.tsx
│   │   │   └── ProductSpecs.tsx
│   │   ├── services/
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── ServiceDetail.tsx
│   │   │   └── ServiceProcess.tsx
│   │   ├── projects/
│   │   │   ├── ProjectCard.tsx
│   │   │   └── ProjectFilter.tsx
│   │   ├── gallery/
│   │   │   ├── MasonryGrid.tsx
│   │   │   └── GalleryImage.tsx
│   │   ├── contact/
│   │   │   ├── ContactInfo.tsx
│   │   │   └── ContactForm.tsx
│   │   ├── quote/
│   │   │   └── QuoteForm.tsx
│   │   └── faq/
│   │       └── FAQList.tsx
│   │
│   ├── data/
│   │   ├── products.ts
│   │   ├── services.ts
│   │   ├── faq.ts
│   │   └── navigation.ts
│   │
│   ├── lib/
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   └── styles/
│       └── globals.css
│
├── docs/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Key Architecture Decisions

- **App Router:** Next.js 14+ App Router for file-based routing
- **Static Generation:** All pages statically generated where possible
- **ISR:** Product/service pages use Incremental Static Regeneration
- **Components:** Atomic design principles (UI → Section → Page)
- **Data:** Static data files for products, services, FAQ content
- **Images:** External images stored in `/public` with `next/image`

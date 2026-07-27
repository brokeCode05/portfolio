# Performance Optimization Plan — Stonerich Granite Construction and Supply

## Core Web Vitals Targets

| Metric | Target |
|---|---|
| Largest Contentful Paint (LCP) | < 2.5s |
| First Input Delay (FID) | < 100ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Time to Interactive (TTI) | < 3.5s |
| First Contentful Paint (FCP) | < 1.8s |

## Image Optimization

### Strategy
- Use Next.js `next/image` for automatic optimization
- Serve WebP format with JPEG fallback
- Implement responsive images with `sizes` attribute
- Lazy load all images below the fold
- Use blur placeholder for image loading

### Image Sizes
| Usage | Max Width | Format |
|---|---|---|
| Hero background | 1920px | WebP |
| Product cards | 600px | WebP |
| Gallery full | 1200px | WebP |
| Thumbnails | 150px | WebP |

## Code Optimization

### JavaScript
- Code splitting by page route (Next.js automatic)
- Dynamic imports for heavy components (lightbox, gallery)
- Debounced scroll/resize handlers
- No render-blocking scripts

### CSS
- Tailwind CSS purge (removes unused styles)
- Critical CSS inlined for above-fold content
- Minimal custom CSS, prefer utility classes

### Fonts
- Self-host or use `next/font` for optimal loading
- Subset fonts for Latin characters only
- `font-display: swap` for text visibility

## Caching Strategy

- Static pages: CDN cache with long max-age
- Product pages: ISR (Incremental Static Regeneration)
- Images: CDN with immutable caching
- API responses: Network-first with cache fallback

## Network Optimization

- Enable HTTP/2 or HTTP/3
- Use CDN for asset delivery
- Preconnect to third-party origins
- Preload critical assets (hero image, fonts)
- Minimize third-party scripts

## Monitoring

- Lighthouse CI in deployment pipeline
- Web Vitals tracking via analytics
- Regular performance audits
- Bundle size monitoring

## Build Optimizations

- Enable Next.js standalone output
- Compress with Brotli/Gzip
- Remove source maps in production
- Tree-shake unused exports
- Optimize Lodash and other utility imports

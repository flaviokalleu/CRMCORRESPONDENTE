# Skill: Frontend Performance

## Purpose
Deliver fast, smooth user experiences through optimized rendering and loading.

## Rules

### Bundle Size
- Lazy load routes with `React.lazy` + `Suspense`
- Dynamic import heavy libraries only where used (`import('chart-library')`)
- Analyze bundle with `webpack-bundle-analyzer` or `source-map-explorer`
- Tree-shake unused exports — prefer named imports over namespace imports
- Avoid importing entire libraries: `import { Button } from '@mui/material'` not `import * as MUI`

### Rendering Optimization
- Use `React.memo` for components that re-render often with the same props
- Use `useCallback` for event handlers passed to memoized children
- Use `useMemo` for expensive filtering, sorting, or transformation
- Avoid creating objects/arrays inline in JSX: `style={{ color: 'red' }}` creates new object each render
- Key rule: measure before optimizing — use React DevTools Profiler

### Image Optimization
- Use WebP format with JPEG/PNG fallback
- Provide `width` and `height` attributes to prevent layout shift
- Lazy load below-the-fold images with `loading="lazy"`
- Use responsive images with `srcSet` for different screen sizes
- Compress images before upload (client-side or build pipeline)

### Network Performance
- Debounce rapid API calls (search, autocomplete) with 300ms delay
- Implement request cancellation with AbortController on unmount
- Show stale data while revalidating (stale-while-revalidate pattern)
- Prefetch data for likely next navigation
- Use pagination or infinite scroll for large lists

### CSS Performance
- Prefer Tailwind utility classes over custom CSS (smaller bundle, better purging)
- Avoid dynamic class generation: `bg-${color}-500` breaks purging
- Use `will-change` sparingly and only for elements that will animate
- Minimize use of `@apply` — it duplicates CSS instead of reusing utilities

### Core Web Vitals
- **LCP** (Largest Contentful Paint): optimize main image/hero, preload critical resources
- **FID/INP** (Interaction): keep event handlers fast, use web workers for heavy computation
- **CLS** (Cumulative Layout Shift): set dimensions on images/embeds, avoid inserting content above the fold

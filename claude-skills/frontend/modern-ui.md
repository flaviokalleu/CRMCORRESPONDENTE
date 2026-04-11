# Skill: Modern UI Design

## Purpose
Build polished, accessible, and responsive user interfaces with Tailwind CSS.

## Rules

### Layout
- Use Flexbox for 1D layouts, CSS Grid for 2D layouts
- Mobile-first responsive design: start with base styles, add `sm:`, `md:`, `lg:` breakpoints
- Consistent spacing scale: use Tailwind's spacing utilities (4, 6, 8 = 1rem, 1.5rem, 2rem)
- Max content width of 1280px for readability, centered with `mx-auto`
- Sidebar + content layout: fixed sidebar, scrollable content area

### Color System (Project Tokens)
```
caixa-primary: #0B1426 (navy — backgrounds, sidebar)
caixa-secondary: #162a4a (secondary navy)
caixa-orange: #F97316 (accent — CTAs, highlights)
caixa-light: #F97316 (interactive elements)
bg-caixa-gradient: navy gradient (dashboard backgrounds)
Neutral: gray-50 to gray-900 for text and borders
```

### Typography
- Plus Jakarta Sans for body text
- Cormorant Garamond for serif headings on landing page
- Font sizes: `text-sm` (labels), `text-base` (body), `text-lg` (subheadings), `text-2xl`+ (headings)
- Line height: `leading-relaxed` for body text, `leading-tight` for headings
- Limit line length to ~65 characters for readability

### Components
- Buttons: clear visual hierarchy (primary/secondary/ghost), minimum 44px touch target
- Cards: `rounded-xl shadow-md` with consistent padding `p-6`
- Forms: visible labels, clear focus states with `ring-2 ring-caixa-orange`, error states in red
- Tables: striped rows, sticky headers, horizontal scroll on mobile
- Modals: backdrop overlay, focus trap, close on Escape

### Animations (Framer Motion)
- Subtle entrance animations: fade + slight translateY
- Duration: 200-300ms for UI feedback, 400-600ms for page transitions
- Use `AnimatePresence` for exit animations
- Respect `prefers-reduced-motion` — disable animations when set
- Don't animate layout properties (width, height) — use `transform` and `opacity`

### Accessibility
- All interactive elements must be keyboard accessible
- Color contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Provide `aria-label` for icon-only buttons
- Use semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`
- Form inputs must have associated `<label>` elements
- Focus indicators must be visible (never `outline: none` without replacement)

### Responsive Breakpoints
- `sm` (640px): stack to row transitions
- `md` (768px): tablet layouts, show sidebar
- `lg` (1024px): full desktop layout
- `xl` (1280px): max-width containers
- Hide non-essential elements on mobile, don't just shrink them

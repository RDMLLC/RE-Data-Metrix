# RE Data Metrix Design Guidelines

## Design Approach
**Reference-Based**: Drawing inspiration from **Stripe** (financial credibility), **Linear** (clean typography and data presentation), and **Carta** (professional SaaS aesthetic) to create a trustworthy, sophisticated platform for real estate investment analysis.

## Color System (As Specified)
- **Primary Navy**: #1E3A8A - Headers, navigation, data tables, chart elements
- **Accent Gold**: #D4AF37 - CTAs, KPI highlights, section dividers, premium features
- **Success Emerald**: #0F7B49 - Positive financial indicators, success states, confirmations
- **Neutrals**: 
  - White #FFFFFF (backgrounds)
  - Charcoal #1F2937 (body text)
  - Light Gray #E5E7EB (borders, backgrounds)
  - Slate variants for secondary UI elements

## Typography
- **Headings**: Inter, 700-800 weight for h1/h2, 600 for h3/h4
  - H1: text-5xl lg:text-6xl
  - H2: text-4xl lg:text-5xl
  - H3: text-2xl lg:text-3xl
- **Body**: Inter, 400 weight, text-base lg:text-lg
- **Data/Numbers**: tabular-nums for financial figures, 600 weight for emphasis
- **Forms**: 500 weight labels, accessible 16px minimum input text

## Layout System
**Spacing**: Tailwind units of 4, 6, 8, 12, 16, 24 for consistent rhythm (p-4, gap-8, mt-12, py-24, etc.)

## Core Components

### Marketing Pages Layout

**Home Page**:
- Full-width hero section (min-h-[600px] lg:min-h-[700px]) with background video player, dark overlay (bg-black/40), centered white headline and gold CTA
- Prelaunch signup form below fold with navy card background, gold submit button, emerald success confirmation
- Value proposition section: 3-column grid (grid-cols-1 md:grid-cols-3) with icons, navy headings, charcoal descriptions
- Social proof section: centered stats in gold, emerald trend indicators
- Footer: navy background, gold divider line, white text, company details left-aligned, links right-aligned

**About Us / The Company**:
- Single-column prose layout (max-w-4xl mx-auto)
- Navy section headers with gold underline accent (border-b-2 border-[#D4AF37])
- Two-column split for mission/vision (grid-cols-1 lg:grid-cols-2 gap-12)
- Highlighted callouts: light gray background cards with emerald left border (border-l-4)

**Coming Soon Placeholders** (Deal Analysis, Lenders, Resources):
- Centered layout with large heading, descriptive text, image placeholder (aspect-video bg-gray-200)
- "Notify Me" mini-form: single email input with gold button

**Login Page**:
- Split layout: left 40% navy background with white text value prop, right 60% white with prelaunch form
- Form card: shadow-xl, rounded-lg, white background, navy headings

**Contact Us**:
- Two-column layout (grid-cols-1 lg:grid-cols-5 gap-16): form (col-span-3), contact info card (col-span-2)
- Contact card: navy background, gold icons, white text for address/company details
- Form: white background, light gray input borders, gold focus rings

### Forms Design
- **Inputs**: border border-gray-300, rounded-md, px-4 py-3, focus:ring-2 focus:ring-[#D4AF37]
- **Labels**: text-charcoal, font-medium, mb-2
- **Required indicators**: Gold asterisk
- **Checkboxes**: Custom styled with gold accent for checked state
- **Submit buttons**: Navy background, gold text, hover:bg-[#1E3A8A]/90
- **Success messages**: Emerald background (bg-[#0F7B49]/10), emerald border-l-4, emerald text, rounded-md, p-4

### Admin Lender/Product Sections
- **Data tables**: Navy headers, striped rows (even:bg-gray-50), gold sortable column indicators
- **Search filters**: Horizontal pill-style multi-select with navy selected state, gold border
- **Entry forms**: Multi-column layout (grid-cols-1 md:grid-cols-2 gap-6), grouped by category
- **Boolean toggles**: Switch components with gold active state
- **State checkboxes grid**: 5-column responsive grid (grid-cols-2 md:grid-cols-5), compact spacing

### Navigation
- **Marketing nav**: Navy background, white text, gold hover underline, sticky top
- **Admin nav**: Sidebar layout, navy background, white/gold active states, icons from Heroicons
- **Breadcrumbs**: Charcoal with gold separators

## Animations
- **Minimal use**: Smooth page transitions (150ms), form validation shake (200ms), hover scale on cards (scale-105)
- **Hero video**: Autoplay, muted, loop with subtle zoom animation on load

## Images
- **Hero**: Full-width video background showing modern office/data visualization/real estate imagery
- **About sections**: Professional team photo, office environment, or abstract financial graphics
- **Coming Soon placeholders**: Real estate/data analysis concept imagery (charts, buildings, handshakes)
- **All images**: Subtle overlay treatment when text overlays, optimized for web

## Accessibility
- WCAG AA contrast ratios maintained (navy/white, gold used only for accents not body text)
- Focus indicators: 2px gold ring on all interactive elements
- Form error states: Red text + icon, aria-invalid attributes
- Semantic HTML throughout, proper heading hierarchy

## Production Notes
- Gold used sparingly for maximum impact (CTAs, dividers, data highlights)
- Navy establishes authority and professionalism throughout
- Emerald reserved exclusively for positive financial indicators and success states
- White space generous to convey premium positioning
- Mobile-first responsive with breakpoints at md (768px) and lg (1024px)
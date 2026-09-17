---
name: Clinical Coordination & Operations
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#3755c3'
  on-secondary: '#ffffff'
  secondary-container: '#708cfd'
  on-secondary-container: '#00217a'
  tertiary: '#005a82'
  on-tertiary: '#ffffff'
  tertiary-container: '#0074a6'
  on-tertiary-container: '#e4f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c4ff'
  on-secondary-fixed: '#001453'
  on-secondary-fixed-variant: '#173bab'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.015em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.25rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system delivers an ultra-systematic, high-reliability operational environment engineered specifically for clinical coordinators, health network administrators, and care teams. Rooted in the visual precision of modern developer tooling and structured knowledge bases, it translates high-density medical workflows into calm, focused, and fatigue-reducing interfaces.

The aesthetic philosophy balances **Clinical Minimalism** with **Tactile Utility**:
- **Atmosphere:** Controlled, sterile yet humane, quiet, and dependable. The workspace reduces visual noise so critical signals—triage alerts, scheduling conflicts, and care transitions—surface instantly without sensory overload.
- **Visual Stance:** Crisp 1px hairline structural boundaries, strict Bento modularity, subtle elevation, and deliberate information hierarchy. High data density is achieved without cramped typography or chaotic visual weights.
- **User Trust:** Every interaction emphasizes precision and certainty. Latency-free visual feedback, legible operational states, and explicit spatial grouping provide total situational awareness across distributed healthcare teams.

## Colors

The color system enforces strict legibility and semantic predictability, ensuring high operational confidence in fast-paced clinical environments.

### Canvas & Surfaces
- **App Canvas:** `#F8FAFC` provides a calm, glare-free background that reduces eye strain during prolonged shifts.
- **Sub-canvas / Recessed Panels:** `#F1F5F9` is applied to utility sidebars, table headers, and inactive data wells.
- **Elevated Surfaces:** Pure `#FFFFFF` cards establish clean visual contrast against the canvas while encapsulating distinct clinical context units.
- **Structural Dividers:** Hairline borders use `#E2E8F0` to define surface thresholds without harsh division.

### Action & Navigation Tiers
- **Primary Operational (`#2563EB`):** Dedicated to primary action triggers, active navigation markers, keyboard focus rings, and confirmed selections.
- **Interactive Hover / Pressed (`#1E40AF`):** Provides unambiguous state transitions on interactive controls.
- **Supporting Accent (`#0EA5E9`):** Reserved for secondary clinical workflows, dynamic indicators, and supplementary metrics.

### Semantic Triage & Status Tokens
Statuses follow a three-token structure (solid mark, soft tint container, hairline border) for instant scanning:
- **Success / Active / Scheduled:** Text `#059669`, Surface `#ECFDF5`, Border `#A7F3D0`.
- **Warning / Pending / Attention:** Text `#D97706`, Surface `#FFFBEB`, Border `#FDE68A`.
- **Urgent / Conflict / Cancelled:** Text `#DC2626`, Surface `#FEF2F2`, Border `#FECACA`.
- **Informational / In-Progress:** Text `#2563EB`, Surface `#EFF6FF`, Border `#BFDBFE`.
- **Neutral / Draft / Archived:** Text `#475569`, Surface `#F1F5F9`, Border `#CBD5E1`.

### Text & Iconography Hierarchy
- **Primary Text:** `#0F172A` (900 slate) for clinical readings, patient IDs, and primary headings.
- **Secondary Text:** `#334155` (700 slate) for field labels, body copy, and secondary identifiers.
- **Muted Metadata:** `#64748B` (500 slate) for timestamps, helper text, and inactive iconography.
- **Disabled State:** `#94A3B8` (400 slate) text over `#F1F5F9` surface.

## Typography

Typography relies entirely on the Inter typeface family, configured for maximum scannability and structural clarity. The type system utilizes slight negative letter-spacing on headlines to enhance optical grouping, while smaller data labels employ positive tracking for crisp character separation.

### Type Rules
- **Tabular Figures:** Always apply OpenType tabular numbers (`tnum`) across all vitals, record counts, schedule time blocks, and financial indicators to preserve alignment across dense tables and Bento cards.
- **Section Headers:** Module headers use `headline-sm` with semibold weight, paired with `label-md` in `#64748B` for auxiliary context.
- **Micro-Labels:** Metadata keys, badge text, and table header tags enforce `label-sm` with uppercase rendering and strict letter-spacing.

## Layout & Spacing

The layout is built around a dense, high-efficiency Bento-box grid model designed for widescreen clinical dashboards, tablet ward units, and mobile emergency viewports.

### Grid & Canvas Structure
- **Desktop (1280px+):** Fixed collapsed/expanded utility sidebar (64px / 240px) with a 12-column dynamic main canvas. Gutters remain fixed at `gutter-lg` (`1.5rem` / `24px`) with outer canvas margin set to `margin-lg` (`2rem` / `32px`).
- **Tablet (768px - 1279px):** 6-column grid with `gutter-md` (`1.25rem` / `20px`) and `margin-md` (`1.5rem` / `24px`). Bento blocks collapse from 3-4 wide to 2-column configurations.
- **Mobile (<768px):** Single-column stacked stream with `gutter` (`1rem` / `16px`) and `margin` (`1rem` / `16px`). Secondary side panels convert into bottom sheets.

### Bento Modular Hierarchy
Cards within the grid are organized using structural spatial modules:
- **Card Padding:** Standard cards use `space-xl` (`1.5rem`) internal padding. High-density data tables and small metric tiles use `space-base` (`1rem`).
- **Zone Separators:** Card header, body, and footer zones are bounded with `1px` `#E2E8F0` horizontal rules, with `space-md` or `space-base` separation between actionable items.

## Elevation & Depth

Visual hierarchy is maintained via low-contrast structural boundaries paired with subtle ambient diffusion rather than deep drop shadows. This preserves clinical clarity and prevents visual dirtiness on multi-card dashboards.

### Layer Hierarchy
- **Level 0 (Recessed Background):** `#F8FAFC` default canvas or `#F1F5F9` container tracks.
- **Level 1 (Card & Module Surface):** Pure `#FFFFFF` background bound by a solid `1px` hairline stroke of `#E2E8F0`. Shadow: `0 1px 3px rgba(15, 23, 42, 0.04), 0 6px 16px -4px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Hovered / Focused State):** Applied when interactive Bento modules or table rows are engaged. Border shifts to `#CBD5E1` with shadow expanding to `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 12px 28px -6px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Flyouts, Menus & Tooltips):** Pure `#FFFFFF` with border `#CBD5E1`. Shadow: `0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Level 4 (Modals & Emergency Overlays):** Positioned over `#0F172A` backdrop with 40% opacity. Pure `#FFFFFF` surface with `0 20px 35px -10px rgba(15, 23, 42, 0.16)`.

## Shapes

The design uses balanced roundedness (`roundedness: 2`), applying `0.5rem` (8px) as the structural standard, scaled thoughtfully for larger modular containers.

### Boundary Matrix
- **Modular Bento Cards:** Use `rounded-lg` (`1rem` / `16px`) for primary dashboard cards, grouping disparate patient metadata into cohesive units.
- **Buttons, Text Inputs & Dropdowns:** Strictly anchored to base roundedness (`0.5rem` / `8px`) for a reliable, tool-like interaction feel.
- **Pills, Status Badges & Avatar Containers:** Fully rounded (`rounded-full` / `9999px`) to visually differentiate quick status chips and tags from interactive input rectangles.
- **Action Flyouts & Context Drawers:** Standardized at `rounded-lg` (`1rem` / `16px`) with matching interior nested controls at `0.5rem`.

## Components

### Buttons
- **Primary:** Background `#2563EB`, text `#FFFFFF`, font `label-lg`, height 36px (compact) or 40px (standard). Hover state uses `#1E40AF`. Active/pressed uses `#1D4ED8`. Focus-visible ring uses 2px `#2563EB` offset by 2px white gap.
- **Secondary / Outline:** Pure `#FFFFFF` surface, 1px `#E2E8F0` border, text `#0F172A`. Hover transitions background to `#F8FAFC` and border to `#CBD5E1`.
- **Ghost / Tertiary:** Transparent surface, text `#475569`. Hover reveals background `#F1F5F9` and text `#0F172A`.
- **Destructive:** Background `#FEF2F2`, border 1px `#FECACA`, text `#DC2626`. Hover state uses `#DC2626` text with `#FEE2E2` fill.

### Input Fields & Controls
- **Text Inputs:** Height 40px, surface `#FFFFFF`, border 1px `#E2E8F0`, corner radius `0.5rem` (8px), padding `0 12px`. Text is `body-md` in `#0F172A`, placeholder in `#94A3B8`. Focused state: border `#2563EB` with a `0 0 0 3px rgba(37, 99, 235, 0.15)` aura.
- **Checkboxes & Radios:** 16px square/circle, border 1.5px `#CBD5E1`, surface `#FFFFFF`. Checked state applies `#2563EB` fill with crisp white icon checkmark or center pip.

### Bento Cards & Grouped Modules
- **Frame:** `#FFFFFF` background, 1px `#E2E8F0` border, `1rem` (16px) corner radius.
- **Card Header:** Minimum height 48px, horizontal flex container with space-between layout, featuring title (`headline-sm`), contextual badge, and overflow action icon button.
- **Card Body:** Clean padding of `1.25rem` to `1.5rem`. Contains data grids, patient queues, or timeline events.
- **Card Footer:** Optional recessed container (`#F8FAFC`) with top border 1px `#E2E8F0`, providing quick navigation links or batch actions.

### Clinical Status Chips & Pills
- Inline items rendered with `height: 22px`, horizontal padding `8px`, font `label-sm`, and `9999px` full radius.
- Always include an interior 6px solid status dot aligned to the left of the label to preserve accessibility across monochrome viewports.

### Doctor Availability & Time-Block Grid
- Grid cells with minimum height 32px, bordered by 1px hairline dividers.
- **Available:** `#FFFFFF` background with subtle hover to `#EFF6FF`.
- **Booked / Busy:** `#F1F5F9` with diagonal muted hash or light `#64748B` label.
- **Selected / In-Review:** `#EFF6FF` background with `#2563EB` border and active primary indicator.

### QR Code & Patient Transfer Module
- Compact Bento tile containing an optical scannable QR zone with a high-contrast white plate, surrounded by patient metadata tags, validation timestamp, and encrypted transfer authorization status.
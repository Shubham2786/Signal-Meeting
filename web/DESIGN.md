# Signal Meetings — Design System

Aesthetic target: **calm command center** — Linear/Vercel-grade restraint with a
single warm accent (**indigo**). The Execution Board is the hero surface.

## Token system

All color is defined as CSS variables (RGB triplets) in `src/index.css` and
wired into Tailwind in `tailwind.config.js` via `rgb(var(--token) / <alpha>)`.
Components never use raw hex — only semantic token classes (`bg-surface`,
`text-muted`, `border-border`, `text-primary`, …).

Themes switch by toggling `.dark` on `<html>`; the initial theme is set before
paint (inline script in `index.html`) from `localStorage` else system
preference. Toggle is persisted (`signal-theme`).

### Color roles

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `bg` | app background | near-white cool | near-black |
| `surface` | cards, bars, inputs | white | raised charcoal |
| `surface-2` | insets, hovers, skeletons | light gray | deeper charcoal |
| `border` | hairlines, dividers | soft gray | low-contrast slate |
| `text` | primary text | near-black | near-white |
| `muted` | secondary text | slate | light slate |
| `primary` | the accent (actions, focus, in-progress) | indigo-600 | indigo-400 |
| `primary-fg` | text on primary | white | near-black |
| `success` | Done status | emerald | emerald |
| `warning` | needs review / medium confidence | amber | amber |
| `danger` | overdue / destructive | red | soft red |
| `focus` | focus ring | indigo | indigo |

60/30/10 balance: neutral surfaces dominate, text/borders are secondary, indigo
is the ~10% accent. Status colors: Open = slate (neutral), In Progress =
primary, Done = emerald; overdue uses a danger tint.

## Type scale

One family (**Inter**) for display + UI. Ramp (from `tailwind.config.js`):
`xs 12 / sm 14 / base 16 / lg 20 / xl 24 / 2xl 32 / 3xl 40`. Body line-height
1.5–1.6. Weights 400/500/600/700. Dates and counts use **tabular numerals**
(`.tnum`).

## Spacing, radius, elevation, motion

- **Spacing**: Tailwind's 4px scale (8pt grid: 2/3/4/6/8/12 = 8/12/16/24/32/48).
- **Radius**: `sm 6 / md 10 / lg 14 / xl 20`.
- **Elevation**: one shadow scale (`sm`, default, `md`, `lg`) tied to `--shadow`.
- **Motion**: 150–250ms `ease-out-soft`; via framer-motion, guarded by
  `prefers-reduced-motion` (also globally neutralized in CSS).

## Component inventory (`src/components/ui`)

| Primitive | Variants / states |
| --- | --- |
| `Button` | primary / secondary / ghost / danger; sizes sm/md; loading, disabled, focus |
| `Card` | base surface with border + shadow |
| `Badge` | neutral / primary / success / warning / danger |
| `Input` | default, focus, placeholder |
| `Textarea` | resizable, focus |
| `Select` | native, custom chevron, focus |
| `Modal` | portal, backdrop, escape-to-close, focus-in, animated |
| `EmptyState` | icon + title + description + action |
| `Skeleton` / `CardSkeleton` | loading placeholders (no layout shift) |
| `CommandPalette` | cmdk-powered, grouped actions, ⌘K |
| `ConfidenceBar` | subtle bar + pill (never alarming) |
| `StatusBadge` | Open / In Progress / Done with icon |
| `Avatar` | initials, generative tint, unassigned state |

## Feature composition (`src/features`)

- `submit/` — paste transcript or upload audio (Step 1).
- `review/` — human-in-the-loop confirm/edit/dismiss (Step 2).
- `board/` — the Execution Board hero: 3 status columns, toolbar
  (search/filter/sort), progress chip, source/edit/follow-up/export, keyboard
  shortcuts (`j`/`k` navigate, `e` edit, `1/2/3` status).
- `history/` — meeting history sidebar.

## Accessibility

Semantic elements (`button`, `nav`, `main`, `section`, `ul/li`, `label`);
visible `:focus-visible` rings on all interactive elements; icon-only buttons
carry `aria-label`; toasts announce via sonner's live region; contrast tuned for
WCAG 2.1 AA in both themes; touch targets ≥ 32–44px; motion respects
`prefers-reduced-motion`. See `.kiro/steering/accessibility.md`. Full conformance
still requires manual assistive-tech testing.

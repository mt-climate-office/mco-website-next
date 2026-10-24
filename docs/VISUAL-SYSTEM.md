# Visual system — climate.umt.edu

**Approved 24 October 2026.** Supersedes the visual direction implied by the
earlier reference comp.

Reference: `docs/design/homepage-reference.html` — a comp, not production code.
**This document is authoritative where the two disagree.**

---

## The problem being fixed

The site as built reads as an admin dashboard rather than a public website.
Measured on `next.climate.umt.edu`, 23 Oct 2026:

| | As built | Target |
|---|---|---|
| Section padding | 0–32px | **112px** |
| `h3` card title | 17px | **22px** |
| Body | 17px | 17px (correct, keep) |
| `h2` section | 32px | **42px** |
| `h1` | 48px | **clamp(38px, 5.4vw, 86px)** |
| Hero height | 341px | **min(70vh, 760px)** |
| Underlined links in `main` | 270 of 273 | **0 at rest** |
| Nav items | 12.48px in 1px bordered pills | **15px plain text** |
| Borders on the page | many | **two** |

The `h3`-equals-body collision is the worst of these: a card heading the same
size as its own body copy does not read as a heading.

Raising body to 17px was the right call and is not the problem. Density and
decoration are.

---

## The system

**Frameless.** Structure comes from space, type scale and alignment — not
from boxes, rules or pills. The whole page carries exactly two borders: one
above the footer, one under each text input. Both are functional. Nothing is
enclosed.

### Rhythm
- `112px` between sections.
- `56px` between a section heading and its content.
- `44–72px` grid gaps. The gap is the separator; there is no card.

### Scale
```
h1   clamp(38px, 5.4vw, 86px)   700   line-height 1.02   tracking -0.035em
h2   clamp(30px, 3.1vw, 46px)   700   line-height 1.12   tracking -0.025em
h3   22px                       600   line-height 1.25
lede 19px                       400   line-height 1.65
body 17px                       400   line-height 1.6
meta 12px  Space Mono, uppercase, letter-spacing 0.06em
figure clamp(42px, 4.2vw, 64px) 700   tracking -0.03em
```
`h3` must clear body by a visible step. That is the rule; 22px is how it is
met today.

### Links
No underline at rest. Underline on `:hover` only. Standalone links use
`--accent-line` at 600 weight. **Inline links inside prose keep their
underline** — that is the one exception.

### Navigation
Plain text, 15px. No border, no background, no radius, no pill. Current page
marked with a `2px` bottom border in `--accent-line` plus `aria-current="page"`.

### The tick
A `28 × 2px` rule in `--accent-line`, `18px` above each section heading. This
is the only ornament on the page. Frameless layouts drift without an anchor
at the left margin; this is that anchor. Do not add others.

### Hero
- `min(70vh, 760px)`, content bottom-aligned.
- Mosaic full-bleed behind everything.
- **Scrim runs bottom-up, not left-heavy:**
  `linear-gradient(180deg, rgba(15,19,25,.28) 0%, rgba(15,19,25,.10) 26%, rgba(15,19,25,.72) 62%, rgba(15,19,25,.96) 100%)`
  The previous comp ran 0.96 opacity across the left 40%, which hid the
  photographs the hero exists to show. That was the single worst visual
  decision in the old comp.
- The header sits over the mosaic; the light top of the scrim keeps it legible.

### Containers
```
max-width 1180px              default
max-width 1320px   ≥ 1700px
max-width 1440px   ≥ 2200px
padding-inline 48px  (20px below 760px)
```
Hero and map stay full-bleed. Prose never exceeds ~68ch.

### Surfaces
Use a surface change to mark a real boundary or not at all. Do not place two
sections of the same surface adjacent and expect separation — that was
happening on the built page and did nothing.

### Breakpoints
```
≤ 1080px   4-up grids → 2-up; tools 2-up → 1-up
≤ 760px    all grids → 1-up; section padding 64px; wrap padding 20px
```

---

## What this costs to implement

Roughly 80% CSS. **Confirm this before estimating:** is the content layer a
single stylesheet, or are styles scoped per Astro component? One stylesheet
means most of the below is one file. Per-component means touching all of them.

### CSS only — no markup changes
Section padding · type scale · link underlines · nav pills · card
borders/radius/padding · the `hr` rules in Tools · hero height, alignment and
scrim · surface banding.

That list is most of what makes it read as a dashboard.

### Needs markup

**Photo controls — a rewrite, not a restyle.** Currently a form: bordered date
input with `‹ ›` steppers, a bordered select, four toggle buttons. Target:
text fields with a hairline underneath, and direction as four words with the
active one underlined. The direction control changes from buttons to links,
which changes how state is set. Treat as a component.

**Station status — DOM order reverses.** Built as label-then-value; target is
the figure first with the mono label beneath. Change the `<dl>` order rather
than flipping visually with CSS, so screen-reader order matches.

**Two new hooks.** A `<span class="tick">` (or `::before`) on each section
heading, and `aria-current="page"` on the active nav item if absent.

### The question that decides everything

**Are the colours already `mco-web-style` custom properties, or hex literals?**
The comp hardcodes hex because it must stand alone. In the repo every one must
be a token, or the light and high-contrast themes break. If tokens are already
wired, both themes come free. If not, that is the real work hiding behind what
looks like a restyle — and it should be done first.

---

## Unchanged

Outfit and Space Mono. The logo. `--accent` and `--accent-line`. The MapLibre
map and `MCO.palette` for anything with a legend. The station-status numerals.
The mono metadata lines — `Oct 23, 3:00 PM MDT · facing north · 160 of 165
cameras` — which carry more of the site's character than anything else on it.

Kit tokens stay untouched inside data components so they keep matching the
tools. This system is a content layer sitting **above** the kit, not a
replacement for it.

---
name: redesign
description: Recreate index.html as a premium 3D redesign in home.html using installed design skills
---

# Redesign Skill

## Task

Read `index.html` and understand:
- The page concept, structure, and copy
- All images and assets used
- The color palette and branding

Then create a new `home.html` that:
- Recreates the same concept and uses the same copy and assets
- Is a fully 3D website — use Three.js or CSS 3D transforms for depth, perspective, and immersive effects
- Applies the design audit standards below (no generic AI slop)
- Is production-ready, complete code — no placeholders, no TODOs, no skipped sections
- Has smooth animations, 3D parallax, or scene elements where appropriate

Do not modify `index.html`. Output only `home.html`.

---

## Project Context (Spargo)

**Stack:** Vanilla HTML + CSS + JS. No React, no bundler, no npm.
- `index.html` — all markup, the source of truth to read first
- `css/style.css` — existing styles (do not edit; `home.html` uses its own `<style>` block or a new CSS file)
- `js/main.js` — existing carousel/reveal logic (may be reused or replaced)

**Brand:** Forest green `#2D7A3A`, DM Sans (body), DM Serif Display (headings), dark `#0f2e14`, bg `#f7faf7`.

---

## How to Approach the Redesign

1. **Scan** — Read `index.html` fully. Note sections, copy, component patterns, and assets.
2. **Diagnose** — Run through the Design Audit below. Identify every generic pattern to replace.
3. **Build** — Write `home.html` applying the 3D and premium upgrades. Keep Spargo's identity; discard AI-default patterns.

---

## Design Audit

### Typography

- **Browser default fonts or Inter everywhere.** Pair DM Serif Display (display/headlines) with a strong sans. Consider `Outfit` or `Cabinet Grotesk` if a different body voice is needed.
- **Headlines lack presence.** Tighten `letter-spacing`, reduce `line-height` to 1.05–1.1 for large display text.
- **Body text too wide.** Cap paragraphs at ~65ch. Use `max-width: 65ch` or `text-wrap: pretty`.
- **Only 400 and 700 weights.** Use 500 and 600 for subtle hierarchy in labels, captions, nav.
- **Numbers in proportional font.** Enable `font-variant-numeric: tabular-nums` for prices and stats.
- **Missing tracking.** Negative `letter-spacing` on large headers; positive on small caps/labels.
- **Orphaned words.** Fix with `text-wrap: balance` on headings.

### Color and Surfaces

- **Pure black backgrounds.** Use `#0a0a0a` or a dark green-tinted dark (`#07150a`) instead.
- **Oversaturated accents.** Keep saturation below 80% on accent colors.
- **Generic `box-shadow`.** Tint shadows with the background hue — e.g., `rgba(45,122,58,0.25)` instead of `rgba(0,0,0,0.1)`.
- **Flat sections.** Add subtle noise, grain overlays, or radial gradients. Pure flat feels sterile.
- **AI gradient fingerprint (purple/blue).** This project is green — stay in palette. Don't let 3D libraries default to blue/purple skyboxes.
- **Inconsistent lighting.** All shadows should imply a single consistent light source (top-left is conventional).

### Layout

- **Three equal card columns.** Break the features grid — try asymmetric sizes, overlapping, or a bento-style grid.
- **Everything centered and symmetrical.** Use offset margins, left-aligned headers, broken grid for sections.
- **`height: 100vh`.** Replace with `min-height: 100dvh` for mobile viewport stability.
- **No depth.** Elements sit flat. Layer with negative margins, `z-index`, and 3D transforms to create stacking and parallax.
- **Missing whitespace.** Double spacing on marketing sections. Let content breathe.
- **Uniform border-radius.** Vary: tighter on inner components, softer on containers.

### Interactivity and States

- **No active/pressed feedback.** Add `transform: scale(0.97)` on `:active` for every button.
- **Instant transitions.** All interactive elements get 160–250ms transitions.
- **Missing focus ring.** Visible `outline` or `box-shadow` focus state required.
- **`window.alert()` for mobile menu.** Replace with a real drawer — `clip-path` or `max-height` transition.
- **No indication of current section in nav.** Style active nav link on scroll.
- **Animations on `top`/`left`/`width`.** Only animate `transform` and `opacity`.

### Content

- **AI copywriting clichés.** Never use: "Seamless", "Elevate", "Unleash", "Next-Gen", "Game-changer", "Tapestry". Use Spargo's existing plain, specific copy.
- **Fake round numbers.** Use organic data: `$147/week`, `500+`, `117 results` — already done well in index.html, preserve it.
- **Exclamation marks in success states.** Remove. Be confident, not loud.
- **Lorem Ipsum.** Never. Write real copy.

### Component Patterns

- **Generic card (border + shadow + white).** Use elevated cards only where hierarchy demands it. Consider borderless with background color shifts.
- **3-card feature grid.** Replace or augment with a bento, asymmetric, or staggered layout.
- **Pill badges ("EXCLUSIVE", "COMING SOON").** Already styled in brand green — keep if tasteful.
- **Footer link farm.** Simplify to brand identity + legal + platform links.

### Code Quality

- **Semantic HTML.** Use `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`.
- **No inline styles mixed with classes.** All styles in `<style>` block or linked CSS.
- **Missing meta.** Include `<title>`, `<meta name="description">`, `og:image`, `og:title`.
- **Missing favicon.** Include a branded `<link rel="icon">`.
- **Arbitrary `z-index` values.** Use a defined scale (10, 20, 100, 200).
- **No `alt` text.** Every meaningful image needs descriptive alt.

### Strategic Omissions

- **No legal links.** Add privacy policy / terms links in footer.
- **No form validation.** Add inline client-side validation on the waitlist email input.
- **No skip-to-content link.** Add a visually hidden skip link for keyboard users.

---

## 3D Techniques to Apply

For the 3D requirement, choose the approach that fits each section's purpose:

### CSS 3D Transforms (no library, GPU-accelerated)
```css
.scene {
  perspective: 1200px;
  transform-style: preserve-3d;
}

.card {
  transform: rotateY(-10deg) rotateX(3deg) translateZ(20px);
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

.card:hover {
  transform: rotateY(0deg) rotateX(0deg) translateZ(40px);
}
```
Best for: phone mockups, feature cards, hero depth, floating elements.

### Three.js (for immersive scenes)
Load from CDN (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`). Use sparingly — one hero canvas or one section, not the whole page. Keep the canvas behind content with `position: fixed; z-index: -1` or scoped to a section.

Good uses: particle field in hero bg, animated logo mesh, 3D globe for location feature.

### Mouse-tracked parallax (vanilla JS)
```js
document.addEventListener('mousemove', (e) => {
  const rx = (e.clientY / window.innerHeight - 0.5) * 12;
  const ry = (e.clientX / window.innerWidth - 0.5) * -12;
  scene.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
});
```
Apply spring smoothing to avoid jitter — interpolate toward target each frame.

### Scroll-driven depth
Use `IntersectionObserver` + CSS custom properties to shift `translateZ` and `rotateX` as sections enter. Creates a "flying through" sensation without a 3D library.

---

## Animation Standards (from `[[emil-design-eng]]`)

- Only animate `transform` and `opacity`
- UI elements: ≤ 300ms. Marketing/hero: longer is fine
- `ease-out` for entering; `ease-in-out` for on-screen movement
- Custom easing: `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out)
- Never animate from `scale(0)` — start at `scale(0.95)` + `opacity: 0`
- Use `transition` (not `@keyframes`) for interruptible UI
- Stagger multi-element reveals: 30–80ms between items
- `prefers-reduced-motion`: keep opacity transitions, remove movement
- Hover animations only under `@media (hover: hover) and (pointer: fine)`
- `:active` scale: `transform: scale(0.97)` on every button

---

## Fix Priority Order

1. Font and typographic scale — biggest instant improvement
2. Color cleanup — shadows, surfaces, depth tinting
3. 3D hero / phone scene — the centrepiece of the redesign
4. Hover, active, and focus states — makes it feel alive
5. Layout asymmetry — break the 3-column feature grid
6. Scroll reveals and stagger — enter animations for every section
7. Final polish — grain overlay, tabular nums, text-wrap, meta tags

---

## Rules

- Do not modify `index.html`
- Work vanilla — no npm, no bundler, no React
- Three.js via CDN only if used; no other new libraries without strong justification
- No placeholders, no TODOs, no skipped sections in the output
- Keep Spargo's copy and branding — redesign the presentation, not the identity
- Production-ready means: real meta tags, favicon link, form validation, skip link, legal footer links
# Editor Fidelity Checklist

The complete 8-step canvas fidelity contract for block development. Following this checklist ensures that the WordPress block editor canvas accurately represents the frontend while maintaining accessibility and standard WordPress data flows.

## 1. Canvas shows real data
The editor canvas must reflect real data, including fonts, colors, images, and layout spacing. Do not use placeholder generic styling if specific theme styles exist. The editor must look as close to the frontend as possible.
The block's root boundary on the canvas uses the canonical White Summers dashed frame (`EDITOR_BLOCK_FRAME`: `mb-10 overflow-hidden rounded-[var(--radius-card)] outline outline-1 outline-offset-[-1px] outline-dashed outline-[color:var(--color-ink)]/30`) to visually delineate the block boundary on the canvas while keeping all inner elements 100% WYSIWYG.

## 2. Inspector has only config attrs, plus background media
The block sidebar (InspectorControls) contains configuration attributes (toggles, behavior settings, metadata) and background media. Direct content editing (text, links, buttons, and foreground/inline images) must happen on the canvas.
**Background Media lives in the sidebar** (decision reversed 2026-09-22): a `PanelBody title="Background Media"` holds `<AttachmentImageControl noStylesheet />` for select/replace/remove, with `<ImagePositionControl />` right under it for the focal point. The canvas shows only the passive full-bleed preview, no click target — there is nothing left on the canvas that could swallow a click meant for selecting the block. Foreground/inline images and repeater-item images are unaffected by this — they stay on the canvas as before.

## 3. No attribute mutation on mount/select
Never mutate block attributes implicitly when the block mounts or when it is selected. Attributes should only change in response to explicit user interaction. Implicit mutations cause dirty states and unexpected save prompts.

## 4. Measure CSS computed values match front-end
The computed CSS values in the editor canvas should precisely match the computed values on the frontend. Ensure that your editor stylesheets correctly account for any editor-specific wrappers (like `.editor-styles-wrapper`).

## 5. Cover every variant visually
If your block has multiple variants, styles, or states, ensure that changing the variant in the inspector immediately and accurately reflects the visual change on the canvas. 

## 6. Use native semantic elements where possible
Rely on native HTML semantics (`<article>`, `<section>`, `<nav>`, `<button>`) within the editor just as you would on the frontend. Avoid wrapping everything in generic `<div>` tags if a semantic tag is more appropriate.

## 7. Respect `prefers-reduced-motion`
Animations or heavy transitions in the editor canvas should respect the user's OS-level motion preferences. 
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 8. Accessibility: keyboard navigation, aria labels
The editor implementation of the block must be fully accessible. Ensure custom interactive controls in the canvas or inspector can be navigated via keyboard and are properly annotated with `aria-labels` and roles.

# Merge decisions: sage-site-kit into this kit

Working record for the `refactor` branch port. Base = our file; theirs only adds.
"Decided" = Luis chose; "Additive" = taken from theirs with no behavior change to ours.

## Already decided by Luis

| Topic | Kept |
|---|---|
| Site Settings | SCF everywhere (options page + `SiteSettings` accessor); `BlockMotion` leaves the Customizer |
| Design tokens | Our contract + their extras (`-on-dark`, grounds, contrast gate, style guide page) |
| Carousel | Swiper (ours); their `slider.js` is not ported |
| Background image | Sidebar (ours, e8cc9c1); `BACKGROUND_MEDIA_PANEL` is not ported |
| Padding | Ours (`PaddingControls`, `padding-presets`, `editorPaddingClasses`); their extra steps are not ported |
| Install | Theirs: `project-init` copies `theme/`, `kit-setup.mjs` fills placeholders |
| Verification | Conformance that fails blocks, two levels (error/warn), one line per failure, never edits |
| Examples | Both: our `examples.md` stays; their `examples/` + `_docs/patterns/` adapted, kit-only |
| Forms | Gravity Forms (`forms-gravity.css` ported) |

## Shared files

| File | Verdict | What changes |
|---|---|---|
| `ActionEditor.jsx` | Ours + additive | Take `sprintf` aria-label. Keep our stacked panel (39b5d1b) and no `fullWidth` on LinkPicker (7a9e232) |
| `AttachmentImageControl.jsx` | Ours + additive | Take `imageClassName`. Keep admin-document detection (619b372), hover X remove, core icon |
| `AutoGrowingTextarea.jsx` | Ours | Ours passes the string to `onChange` and carries the field reset; theirs passes the event. Their callers get adapted |
| `useAttachmentUrls.js` | Ours | Ours falls back through sizes and guid |
| `editorCanvas.js` | Ours + additive | Take `EDITOR_FIELD`, `fieldToneClass`, `fieldLabel`. Keep `EDITOR_BLOCK_FRAME` name; no `BACKGROUND_MEDIA_PANEL` |
| `entranceCanvas.js` | Ours + additive | Take `partIndexes()` |
| `EntranceControl.jsx` | Ours + additive | Take i18n labels and `printedSiteDefaults()` (SCF). Keep `{ value, onChange }` API |
| `ImagePositionControl.jsx` | Ours + additive | Take aria labels, `aria-pressed`, i18n |
| `ItemList.jsx` | Ours + additive | Take unmount cleanup (`stopRef`), `sprintf` labels. Keep core icons and `RemoveButton` (34fb4ba) |
| `LinkPicker.jsx` | Ours + additive | Take `namespaceURI` check, inspector `min-width` override, `useId` labelling, i18n |
| `ParagraphsField.jsx` | Theirs | Superset of ours: lists, links, bold/italic toolbar. Keep our focus ring class |
| `BlockCategories.php` | Theirs | Placeholders filled by `kit-setup` (install decision) |
| `BlockEntrance.php` | Ours + additive | Take `$extraStyle`, `esc_attr`, null default, `partIndexes()`, public `LIMITS` |
| `BlockImagePosition.php` | Ours + additive | Keep `objectClass()`; add `positions()` |
| `BlockPadding.php` | Ours | Padding decision |
| `blocks.php` | Ours + additive | Register `collection-paging` and `scroll-cue` handles; no `slider` |
| `entrance.js` / `entrance.css` | See open questions | Keep replay `transition: none` (57936ce) |

## Answered by Luis (2026-09-25)

| Question | Kept |
|---|---|
| `BlockManager` registration | Theirs: glob over `resources/blocks/*/block.json` + asset version stamp; `create-block` no longer edits `BlockManager` |
| Entrance defaults | Ours: 1000/250/250 ms, literal ease (Tailwind's `--ease-out` shadows it) |
| `ws-` names | Theirs: `entrance`, `data-row`, `data-drag-handle` |
| Per-item link | Ours: text on the canvas, destination in the sidebar for the active item (baaaabe); `ItemLinkTrigger` is not ported |
| `ItemList` remove confirm | Ours by the base rule: no confirm, Ctrl+Z undoes |
| Blade directives | Theirs: `App\Providers\BlockDirectivesServiceProvider`, added once to `functions.php`; Sage's `ThemeServiceProvider` stays stock |
| Canvas root | Theirs, adapted: `EditorSection` prints our `EDITOR_BLOCK_FRAME` and our `editorPaddingClasses()` |
| Canvas helpers | Theirs: `InlineField` (on our `AutoGrowingTextarea`), `CtaPreview`, `AddPrompt`, `InfoPanel`, `useRepeater` |
| Page title | Both: our `front-page.blade.php` (no page header on the home) + their `partials/page-header` (sr-only `<h1>` on singular pages, visible on archives/search) |

## Pending (Phase 4 button roles)

`btn-on-dark` (BlockAttributes::ctaButtonClass, ground.js) and `btn-link` (collection-paging partial) are their button role names; our contract has `.btn-primary` / `.btn-secondary`. Resolved with the button-role checkpoint.

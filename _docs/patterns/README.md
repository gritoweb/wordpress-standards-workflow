# Patterns

A pattern is a structure that recurs across sites, written down so a new block
or a new piece of chrome starts from the same parts every time. `create-block`
reads the closest page here before it builds, and the header, footer, and 404
pages tell phase 3 and phase 5 of `figma-design-system` what to build from a
comp.

A pattern is not code to copy. Each page gives the skeleton, the shared
components to build it from, the rules that matter most, what changes per
design, what must not change, the tests to write, and a link to a tested
example. Write the new block's own markup from those parts.

The examples live in the kit, not in a project. In a project, read a page's
`<kitPath>/examples/...` path in the kit checkout, where `kitPath` is in the
theme's `kit.config.json`.

## How to use a page

1. Find the pattern whose **When it applies** matches the design. If none fits,
   compose from the section intro's parts and say so in the plan.
2. Read the page. The rule IDs it cites (MEDIA-8, CTA-3, …) are the conformance
   rules `node scripts/conformance.mjs` reports.
3. Build from the shared components under `resources/blocks/components/` (`theme/resources/blocks/components/` in the kit).
   Never copy an example: the examples in `<kitPath>/examples/` are references that the
   kit tests, and they carry one site's copy and choices.
4. Finish with the conformance test and the tests the page lists.

Every page has the same sections, in this order: **When it applies**, **Blade
skeleton**, **Canvas skeleton**, **Built from**, **Rules that matter most**,
**Adapt per design**, **Do not change**, **Tests to write**, **Example**.

## Block patterns

| Pattern | Use it for | Example block |
| --- | --- | --- |
| [Section intro](section-intro.md) | A heading, body, and button that open a section | `section-intro` |
| [CTA band](cta-band.md) | An invitation: heading on one side, body and button on the other | `cta-split` |
| [Background-photo band](background-photo-band.md) | Copy and a button over a full-bleed photo | `cta-banner` |
| [Media and text split](media-text-split.md) | Copy on one side, a photo or logo panel on the other | `text-media` |
| [Carousel](carousel.md) | Slides of copy and media the visitor steps through | `hero` |
| [Opening statement](opening-statement.md) | A full-height first panel with one large statement | `statement-hero` |
| [Collection grid](collection-grid.md) | Cards drawn from a post type, sorted and paged | `post-grid` |
| [Logo row](logo-row.md) | Client or partner marks in centered rows | `logo-wall` |
| [Location with map](location-map.md) | One office: address, contact, directions, map | `location` |
| [Form embed](form-embed.md) | A heading and intro beside a form | `contact-form` |
| [Disclosure list](disclosure-list.md) | Items that show a question or a title and open to show the answer, as an FAQ | `faq` |
| [Card row with two faces](card-row-two-faces.md) | Cards that show a question at rest and details on hover or tap. Seen once (White Summers). | none |
| [Staggered panel list](staggered-panel-list.md) | Heading and body panels stepping inward down the page. Seen once (White Summers). | none |
| [Embedded feed](embedded-feed.md) | An intro above a third-party feed. Seen once (White Summers). | none |

A pattern marked "seen once" has one build behind it. Treat its page as a
starting point, and expect the second site to change it. Send what you learn
back through the harvest checklist (`_docs/kit-harvest.md`).

## Site chrome and templates

These are design, not design system. Each site builds them from its comp, using
the page as the checklist of behavior to keep.

| Pattern | Use it for | Example view |
| --- | --- | --- |
| [Header](header.md) | The header `project-init` installs, adapted to the comp | installed in the theme (`sections/header.blade.php`) |
| [Footer](footer.md) | Menu columns, socials, legal line | none; built from the comp |
| [404](404.md) | The themed page for a URL that doesn't exist | `<kitPath>/examples/views/404.blade.php` |

## Choosing between patterns

- Copy beside media, with a list of entries: media and text split.
- Copy beside a form or a map: form embed or location with map.
- The same section repeated with slides: carousel. A single opening slide with
  no controls is still the carousel, and a single statement with no media
  slides is the opening statement.
- A list of items an editor types in by hand, where each opens to show its
  answer (an FAQ): disclosure list.
- A grid of records an editor doesn't type in by hand: collection grid.
  A grid of cards an editor types in by hand that reveal detail on hover or
  tap: card row with two faces. Without the reveal, build it from the section
  intro's parts and a repeater (`useRepeater`, `ItemList`).

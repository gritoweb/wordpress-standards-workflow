# Patterns

A pattern is a structure that recurs across sites, written down so a new block
starts from the same parts every time. `create-block` reads the closest page
before it builds. A pattern is not code to copy: the skeletons live in the
reference block its **Example** names, and the rules in
[`docs/block-conventions.md`](../block-conventions.md).

## How to use a page

1. Find the pattern whose **When it applies** matches the design. If none fits,
   compose from the section intro's parts and say so in the plan.
2. Read the page, then the rules it cites, then its example.
3. Build from the shared components in `resources/blocks/components/backend/`.
4. Finish with **Verify a block** in `docs/block-conventions.md`.

Every page has the same sections: **When it applies**, **Built from**, **Rules
that matter most**, **Adapt per design**, **Do not change**, **Example**.

## Block patterns

| Pattern | Use it for | Example in `docs/examples/` |
| --- | --- | --- |
| [Section intro](section-intro.md) | A heading, body and button that open a section | section-intro.md |
| [CTA band](cta-band.md) | An invitation on a band of color | cta-band.md |
| [Background-photo band](background-photo-band.md) | Copy and a button over a full-bleed photo | cta-band.md |
| [Media and text split](media-text-split.md) | Copy on one side, a photo on the other | media-text.md |
| [Carousel](carousel.md) | Slides the visitor steps through, on Splide | testimonial-carousel.md, gallery.md |
| [Opening statement](opening-statement.md) | A full-height first panel with one large statement | hero.md (closest) |
| [Collection grid](collection-grid.md) | Cards drawn from a post type, sorted and paged | none |
| [Logo row](logo-row.md) | Client or partner marks in rows | logo-wall.md |
| [Location with map](location-map.md) | One office: address, contact, directions, map | none |
| [Form embed](form-embed.md) | A heading and intro beside a form | none |
| [Disclosure list](disclosure-list.md) | Items that open to show the answer, as an FAQ | accordion.md |
| [Card row with two faces](card-row-two-faces.md) | Cards that show details on hover or tap. Seen once. | none |
| [Staggered panel list](staggered-panel-list.md) | Panels stepping inward down the page. Seen once. | none |
| [Embedded feed](embedded-feed.md) | An intro above a third-party feed. Seen once. | none |

## Chrome

| Pattern | Use it for |
| --- | --- |
| [Header](header.md) | The site header and mobile menu |
| [Footer](footer.md) | The site footer |
| [404](404.md) | The not-found template |

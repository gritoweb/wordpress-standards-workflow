# Example page: a Home built from the reference blocks

The order below was built and checked on a local site (editor and front end,
1440px and 390px): every block renders, both carousels mount, nothing is
hidden after scrolling, no console error. Use it as a starting order, not a
rule: the design decides which blocks a page needs.

| # | Block | Why here |
| --- | --- | --- |
| 1 | `hero` | What the site does, one button |
| 2 | `section-intro` (centered) | Opens the content |
| 3 | `card-grid` | The main offers or services |
| 4 | `media-text` | One idea with a picture |
| 5 | `number-grid` | Proof in numbers |
| 6 | `testimonial-carousel` | Proof in words |
| 7 | `gallery` | A look at the work |
| 8 | `logo-wall` | Who trusts it |
| 9 | `accordion` | Questions before deciding |
| 10 | `cta-band` | The closing call to action |

Serialized for `lando wp post create --post_content='…'` (images are
attachment IDs from the site's Media Library; a block with no image hides it):

```html
<!-- wp:<namespace>/hero {"imageId":10} /-->
<!-- wp:<namespace>/section-intro {"align":"center"} /-->
<!-- wp:<namespace>/card-grid /-->
<!-- wp:<namespace>/media-text {"imageId":11} /-->
<!-- wp:<namespace>/number-grid /-->
<!-- wp:<namespace>/testimonial-carousel /-->
<!-- wp:<namespace>/gallery {"images":[{"imageId":12,"caption":"Studio"},{"imageId":13,"caption":"Workshop"}]} /-->
<!-- wp:<namespace>/logo-wall {"logos":[{"imageId":15},{"imageId":16},{"imageId":17}]} /-->
<!-- wp:<namespace>/accordion /-->
<!-- wp:<namespace>/cta-band {"bgImageId":11} /-->
```

Don't write `entrance` or padding values here: the block.json presets are the
defaults, and a saved value freezes the block against future preset changes.

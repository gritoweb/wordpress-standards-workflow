import { useBlockProps } from "@wordpress/block-editor";
import { dividerClass } from "./DividerControl.jsx";
import { EDITOR_BLOCK_FRAME } from "./editorCanvas.js";
import { entranceRootProps } from "./entranceCanvas.js";
import { groundClass } from "./ground.js";
import { editorPaddingClasses } from "./padding-presets.js";

/**
 * The canvas root every block draws: block props and entrance root props merged into one style,
 * `<slug>-editor`, the page's responsive padding, the ground, the dashed frame, the divider, and
 * the inner container. Extra props (the data-* attributes a test reads) go on the root.
 *
 * @param {object} props
 * @param {string} props.slug             The block's folder name.
 * @param {object} props.attributes       The block's attributes, for its Spacing padding.
 * @param {string} props.ground
 * @param {string} props.sectionDivider   'none' | 'above' | 'below'.
 * @param {object} props.entrance         From resolveEntrance().
 * @param {string} props.className        Extra root classes.
 * @param {string} props.innerClassName   Extra classes on the inner container.
 */
export function EditorSection({
  slug,
  attributes = {},
  ground = "",
  sectionDivider = "none",
  entrance,
  className = "",
  innerClassName = "",
  children,
  ...rest
}) {
  const blockProps = useBlockProps();
  const root = entranceRootProps(entrance);
  const classes = [
    blockProps.className,
    `${slug}-editor`,
    editorPaddingClasses(attributes),
    groundClass(ground),
    EDITOR_BLOCK_FRAME,
    dividerClass(sectionDivider),
    className,
  ];

  return (
    <section
      {...blockProps}
      {...root}
      {...rest}
      style={{ ...blockProps.style, ...root.style }}
      className={classes.filter(Boolean).join(" ")}
      data-divider={sectionDivider}
    >
      <div
        className={`${slug}-editor__inner container ${innerClassName}`.trim()}
      >
        {children}
      </div>
    </section>
  );
}

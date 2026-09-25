
// The panel's own background carries the alpha, never the panel's `opacity`
// (which would fade its text too). One rule for every "loads here" panel.
// color-mix keeps this on the same --color-ink token every other panel and
// the front end read, instead of a second, hand-picked rgb() shadowing it.
const PANEL_STYLE = {
  backgroundColor: "color-mix(in srgb, var(--color-ink) 8%, transparent)",
  borderRadius: "var(--radius-card)",
  padding: "24px",
};

export const INFO_PANEL_TEXT_STYLE = { margin: 0, color: "var(--color-ink)" };

export function InfoPanel({ title, titleGap = 8, children, style, ...props }) {
  return (
    <div {...props} style={{ ...PANEL_STYLE, ...style }}>
      <p
        style={{
          ...INFO_PANEL_TEXT_STYLE,
          fontWeight: 600,
          marginBottom: `${titleGap}px`,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

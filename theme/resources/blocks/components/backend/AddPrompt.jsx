
/**
 * A quiet prompt that shows only while the block is selected, for a group of
 * fields that stays hidden until an editor asks for it ("Add office
 * details"). The caller decides when to render it.
 */
export function AddPrompt({ label, onClick, className = "" }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className={`text-[color:var(--color-ink)]/50 inline-block text-xs font-bold uppercase tracking-widest ${className}`.trim()}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {label}
    </span>
  );
}

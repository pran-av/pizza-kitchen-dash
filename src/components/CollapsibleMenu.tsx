import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function CollapsibleMenu({ id, title, expanded, onToggle, children }: Props) {
  const panelId = `${id}-panel`;

  return (
    <div className="collapsible">
      <button
        type="button"
        className="collapsible__trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        id={`${id}-trigger`}
        onClick={onToggle}
      >
        <span>{title}</span>
        <span className="collapsible__chevron" aria-hidden>
          {expanded ? "▾" : "▸"}
        </span>
      </button>
      {expanded ? (
        <div className="collapsible__panel" id={panelId} role="region" aria-labelledby={`${id}-trigger`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

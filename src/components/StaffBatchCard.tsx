import { useMemo } from "react";
import type { KitchenBatch, StaffKey } from "../types/kitchen";
import { CollapsibleMenu } from "./CollapsibleMenu";
import { ProviderBadge } from "./ProviderBadge";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  staffKey: StaffKey;
  staffLabel: string;
  batch: KitchenBatch | null;
  queueLength: number;
  menuExpanded: boolean;
  now: number;
  onToggleMenu: () => void;
  onComplete: () => void;
};

export function StaffBatchCard({
  staffKey,
  staffLabel,
  batch,
  queueLength,
  menuExpanded,
  now,
  onToggleMenu,
  onComplete,
}: Props) {
  const remainingMs = useMemo(() => {
    if (!batch?.cookingEndsAt) return null;
    return batch.cookingEndsAt - now;
  }, [batch, now]);

  if (!batch) {
    return (
      <section className="staff-card staff-card--empty" aria-labelledby={`${staffKey}-heading`}>
        <h2 id={`${staffKey}-heading`} className="staff-card__title">
          Staff {staffKey === "yann" ? "1" : "2"}: {staffLabel}
        </h2>
        <p className="staff-card__empty">No active batch. Next in queue will appear here.</p>
        {queueLength > 0 ? (
          <p className="staff-card__queue">Queued batches: {queueLength}</p>
        ) : null}
      </section>
    );
  }

  const primaryOrder = batch.orders[0];
  const primaryToken = primaryOrder?.tokenId;
  const primaryProvider = primaryOrder?.provider;
  const extraOrders = batch.orders.length > 1 ? batch.orders.length - 1 : 0;

  return (
    <section className="staff-card" aria-labelledby={`${staffKey}-heading`}>
      <header className="staff-card__header">
        <h2 id={`${staffKey}-heading`} className="staff-card__title">
          Staff {staffKey === "yann" ? "1" : "2"}: {staffLabel}
        </h2>
        <div className="staff-card__headerRow">
          <span className="staff-card__batchId">Batch ID: {batch.id}</span>
          <div className="staff-card__headerRight">
            {primaryToken ? (
              <span className="staff-card__tokenPill" title="Primary token (first order in batch)">
                Token: {primaryToken}
                {primaryProvider ? (
                  <>
                    {" "}
                    <ProviderBadge provider={primaryProvider} />
                  </>
                ) : null}
                {extraOrders > 0 ? ` +${extraOrders}` : ""}
              </span>
            ) : null}
            {remainingMs !== null ? (
              <span className="staff-card__timer" aria-live="polite">
                {formatRemaining(remainingMs)} left
              </span>
            ) : (
              <span className="staff-card__timer staff-card__timer--idle">Starting…</span>
            )}
          </div>
        </div>
        <p className="staff-card__recipe">{batch.recipeName}</p>
        {queueLength > 0 ? (
          <p className="staff-card__queue">Queued batches: {queueLength}</p>
        ) : null}
      </header>

      <div className="staff-card__body">
        <h3 className="staff-card__subheading">Orders in this batch</h3>
        <ul className="staff-card__orders">
          {batch.orders.map((o) => (
            <li key={o.orderId}>
              <span className="staff-card__orderId">{o.orderId}</span>
              <span className="staff-card__orderToken">Token {o.tokenId}</span>
              <ProviderBadge provider={o.provider} className="staff-card__orderProvider" />
              {o.requirement ? <span className="staff-card__req"> — {o.requirement}</span> : null}
            </li>
          ))}
        </ul>

        <CollapsibleMenu
          id={`menu-${staffKey}`}
          title="Menu details"
          expanded={menuExpanded}
          onToggle={onToggleMenu}
        >
          <p className="staff-card__menuText">{batch.menuDetails}</p>
        </CollapsibleMenu>
      </div>

      <footer className="staff-card__footer">
        <button type="button" className="btn btn--primary" onClick={onComplete}>
          Mark complete and next
        </button>
      </footer>
    </section>
  );
}

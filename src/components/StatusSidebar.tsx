import type { AgentStatus, DeliveryAgent, FulfilledDelivery, ReadyForPickupOrder } from "../types/kitchen";
import { ProviderBadge } from "./ProviderBadge";

const STATUS_OPTIONS: AgentStatus[] = ["available", "en_route", "reached"];

function isSameLocalCalendarDay(aMs: number, bMs: number): boolean {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function countFulfilledToday(delivered: FulfilledDelivery[], nowMs: number): number {
  return delivered.filter((d) => isSameLocalCalendarDay(d.fulfilledAt, nowMs)).length;
}

function nextStatus(current: AgentStatus): AgentStatus {
  const i = STATUS_OPTIONS.indexOf(current);
  return STATUS_OPTIONS[(i + 1) % STATUS_OPTIONS.length] ?? "available";
}

type Props = {
  now: number;
  readyForPickup: ReadyForPickupOrder[];
  delivered: FulfilledDelivery[];
  agents: DeliveryAgent[];
  onMarkDelivered: (tokenId: string) => void;
  onAgentStatus: (agentId: string, status: AgentStatus) => void;
};

export function StatusSidebar({
  now,
  readyForPickup,
  delivered,
  agents,
  onMarkDelivered,
  onAgentStatus,
}: Props) {
  const fulfilledToday = countFulfilledToday(delivered, now);

  return (
    <aside className="status-sidebar" aria-label="Kitchen statuses">
      <div className="status-sidebar__today" role="region" aria-labelledby="fulfilled-today-heading">
        <p id="fulfilled-today-heading" className="status-sidebar__today-label">
          Fulfilled today
        </p>
        <p className="status-sidebar__today-value" aria-live="polite">
          {fulfilledToday}
        </p>
      </div>

      <h2 className="status-sidebar__title">Statuses</h2>

      <section className="status-block" aria-labelledby="ready-heading">
        <h3 id="ready-heading" className="status-block__title">
          Ready for pickup
        </h3>
        <p className="status-block__hint">Token IDs (not grouped by batch)</p>
        {readyForPickup.length === 0 ? (
          <p className="status-block__empty">No orders waiting for pickup.</p>
        ) : (
          <ul className="status-list">
            {readyForPickup.map((o) => (
              <li key={o.tokenId} className="status-list__row">
                <span className="status-list__tokenGroup">
                  <span className="status-list__token">{o.tokenId}</span>
                  <ProviderBadge provider={o.provider} />
                </span>
                <button type="button" className="btn btn--small" onClick={() => onMarkDelivered(o.tokenId)}>
                  Mark delivered
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="status-block" aria-labelledby="delivered-heading">
        <h3 id="delivered-heading" className="status-block__title">
          Delivered
        </h3>
        {delivered.length === 0 ? (
          <p className="status-block__empty">No completed deliveries yet.</p>
        ) : (
          <ul className="status-list status-list--plain">
            {delivered.map((d) => (
              <li key={`${d.tokenId}-${d.fulfilledAt}`} className="status-list__tokenOnly status-list__tokenOnly--withProvider">
                <span className="status-list__token">{d.tokenId}</span>
                <ProviderBadge provider={d.provider} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="status-block" aria-labelledby="agents-heading">
        <h3 id="agents-heading" className="status-block__title">
          Delivery agents
        </h3>
        <p className="status-block__hint">Per token / availability</p>
        <ul className="agent-list">
          {agents.map((agent) => (
            <li key={agent.id} className="agent-list__row">
              <div className="agent-list__main">
                <span className="agent-list__nameRow">
                  <span className="agent-list__name">{agent.name}</span>
                  <ProviderBadge provider={agent.provider} kind="partner" />
                </span>
                <span className={`agent-list__badge agent-list__badge--${agent.status}`}>{agent.status}</span>
              </div>
              <div className="agent-list__tokenRow">
                <span className="agent-list__label">Token</span>
                <span className="agent-list__token">{agent.tokenId ?? "—"}</span>
              </div>
              <button
                type="button"
                className="btn btn--small btn--ghost"
                onClick={() => onAgentStatus(agent.id, nextStatus(agent.status))}
              >
                Cycle status
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

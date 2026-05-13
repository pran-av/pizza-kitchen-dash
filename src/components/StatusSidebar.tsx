import { useMemo, useState } from "react";
import type { AgentStatus, LiveTrackingDay, LiveTrackingCard } from "../types/kitchen";
import { localDateKey } from "../types/kitchen";
import { SpeakAloudIcon } from "./StaffBatchCard";

const EMPTY_DAY: LiveTrackingDay = { ready: [], pickedUp: [], delivered: [] };

function countOrdersInColumn(cards: LiveTrackingCard[]): number {
  return cards.reduce((sum, c) => sum + c.orders.length, 0);
}

function formatAgentLine(status: AgentStatus): string {
  if (status === "en_route") return "En-route";
  if (status === "reached") return "Reached store";
  return "Available";
}

function formatPending(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  now: number;
  liveTrackingByDate: Record<string, LiveTrackingDay>;
  boardDateKey: string;
  onBoardDateKeyChange: (dateKey: string) => void;
  onMarkPickedUp: (tokenId: string) => void;
  onVoicePickup: (text: string) => void;
  className?: string;
  ariaLabel?: string;
};

export function StatusSidebar({
  now,
  liveTrackingByDate,
  boardDateKey,
  onBoardDateKeyChange,
  onMarkPickedUp,
  onVoicePickup,
  className,
  ariaLabel = "Live tracking",
}: Props) {
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const todayKey = useMemo(() => localDateKey(now), [now]);
  const isTodayBoard = boardDateKey === todayKey;

  const day = liveTrackingByDate[boardDateKey] ?? EMPTY_DAY;
  const dateOptions = useMemo(
    () => Object.keys(liveTrackingByDate).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)),
    [liveTrackingByDate],
  );

  const readyCount = countOrdersInColumn(day.ready);
  const pickedCount = countOrdersInColumn(day.pickedUp);
  const deliveredCount = countOrdersInColumn(day.delivered);

  const headerDateLabel = useMemo(() => {
    const d = new Date(`${boardDateKey}T12:00:00`);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }, [boardDateKey]);

  const exampleVoiceToken = day.ready[0]?.tokenId ?? "8800";

  const handleMarkPickedUp = (tokenId: string) => {
    if (busyToken || !isTodayBoard) return;
    setBusyToken(tokenId);
    window.setTimeout(() => {
      onMarkPickedUp(tokenId);
      setBusyToken(null);
    }, 720);
  };

  const runVoicePickupExample = () => {
    if (busyToken || !isTodayBoard || day.ready.length === 0) return;
    const token = exampleVoiceToken;
    if (!day.ready.some((c) => c.tokenId === token)) return;
    setBusyToken(token);
    window.setTimeout(() => {
      onVoicePickup(`Token ${token} Picked Up`);
      setBusyToken(null);
    }, 720);
  };

  const renderOrderChips = (card: LiveTrackingCard) => (
    <ul className="live-tracking__orders" aria-label="Orders in this handoff">
      {card.orders.map((o) => (
        <li key={`${card.cardId}-o-${o.orderNo}`} className="live-tracking__orderChip">
          Order # {o.orderNo}
        </li>
      ))}
    </ul>
  );

  const renderCard = (card: LiveTrackingCard, column: "ready" | "picked" | "delivered") => (
    <article key={card.cardId} className="live-tracking__card">
      <header className="live-tracking__cardHead">
        <span className="live-tracking__agentName">{card.agentName}</span>
        <span className="live-tracking__token">token {card.tokenId}</span>
      </header>
      <p className="live-tracking__statusLine">
        Status: {formatAgentLine(card.agentStatus)}
        {column === "ready" && card.readySinceAt ? (
          <span className="live-tracking__pending"> · Waiting {formatPending(now - card.readySinceAt)}</span>
        ) : null}
      </p>
      {renderOrderChips(card)}
      {column === "ready" ? (
        <>
          <button
            type="button"
            className="btn btn--small live-tracking__pickBtn"
            disabled={!isTodayBoard || busyToken !== null}
            aria-busy={busyToken === card.tokenId}
            onClick={() => handleMarkPickedUp(card.tokenId)}
          >
            {busyToken === card.tokenId ? "Updating…" : 'Mark "Picked Up"'}
          </button>
          {busyToken === card.tokenId ? (
            <p className="staff-card__voiceAgentStatus live-tracking__pickBuffer" aria-live="polite">
              <span className="staff-card__voiceAgentDot" aria-hidden />
              <span className="queue-strip__agentCopy">
                Agent: buffering handoff for token <strong>{card.tokenId}</strong>…
              </span>
            </p>
          ) : null}
        </>
      ) : null}
    </article>
  );

  return (
    <aside className={["status-sidebar", "status-sidebar--liveTracking", className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      <header className="live-tracking__header">
        <h2 className="live-tracking__title">
          Live Tracking{" "}
          <label className="live-tracking__dateWrap">
            <span className="visually-hidden">Board date</span>
            <select
              className="live-tracking__dateSelect"
              value={boardDateKey}
              onChange={(e) => onBoardDateKeyChange(e.target.value)}
            >
              {dateOptions.map((k) => (
                <option key={k} value={k}>
                  {k === todayKey ? `Today (${k})` : k}
                </option>
              ))}
            </select>
          </label>
        </h2>
        <p className="live-tracking__sub">{headerDateLabel}</p>
      </header>

      <div className="live-tracking__kanban" aria-label="Pickup and delivery columns">
        <section className="live-tracking__col" aria-labelledby="lt-ready">
          <h3 id="lt-ready" className="live-tracking__colTitle">
            Ready for Pickup
          </h3>
          <p className="live-tracking__colCount">Pickup Pending: {readyCount}</p>
          <div className="live-tracking__colBody">
            {day.ready.length === 0 ? (
              <p className="live-tracking__empty">No stacks in this column.</p>
            ) : (
              day.ready.map((c) => renderCard(c, "ready"))
            )}
          </div>
        </section>

        <section className="live-tracking__col" aria-labelledby="lt-picked">
          <h3 id="lt-picked" className="live-tracking__colTitle">
            Picked Up
          </h3>
          <p className="live-tracking__colCount">In Route: {pickedCount}</p>
          <p className="live-tracking__colHint">Driver app updates only — kitchen view is live.</p>
          <div className="live-tracking__colBody">
            {day.pickedUp.length === 0 ? (
              <p className="live-tracking__empty">No stacks in this column.</p>
            ) : (
              day.pickedUp.map((c) => renderCard(c, "picked"))
            )}
          </div>
        </section>

        <section className="live-tracking__col" aria-labelledby="lt-delivered">
          <h3 id="lt-delivered" className="live-tracking__colTitle">
            Delivered
          </h3>
          <p className="live-tracking__colCount">Fulfilled Count: {deliveredCount}</p>
          <p className="live-tracking__colHint">Driver app updates only — kitchen view is live.</p>
          <div className="live-tracking__colBody">
            {day.delivered.length === 0 ? (
              <p className="live-tracking__empty">No stacks in this column.</p>
            ) : (
              day.delivered.map((c) => renderCard(c, "delivered"))
            )}
          </div>
        </section>
      </div>

      <section
        className="staff-card__voiceSuggestions live-tracking__voice"
        role="region"
        aria-label="Suggested voice commands for pickup"
      >
        <h3 className="staff-card__voiceSuggestionsTitle">
          <SpeakAloudIcon />
          Suggested Voice Commands
        </h3>
        <p className="staff-card__voiceSuggestionsHint">
          Tap a phrase to simulate voice — only moves a stack on <strong>today&apos;s</strong> board when the token is in
          Ready for Pickup.
        </p>
        <div className="staff-card__voiceQuoteGrid" role="group">
          <button
            type="button"
            className="btn btn--voiceSuggested"
            disabled={!isTodayBoard || busyToken !== null || day.ready.length === 0}
            onClick={runVoicePickupExample}
          >
            {`Trigger "Token ${exampleVoiceToken} Picked Up"`}
          </button>
        </div>
      </section>
    </aside>
  );
}

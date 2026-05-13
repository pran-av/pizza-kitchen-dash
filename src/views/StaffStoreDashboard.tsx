import { useEffect, useState, type ReactNode } from "react";
import type {
  AgentStatus,
  DeliveryAgent,
  FulfilledDelivery,
  KitchenBatch,
  PickedUpOrder,
  ReadyForPickupOrder,
  StaffKey,
} from "../types/kitchen";
import { StaffBatchCard, SpeakAloudIcon } from "../components/StaffBatchCard";
import { StatusSidebar } from "../components/StatusSidebar";
import { VoiceAiPanel } from "../components/VoiceAiPanel";

function normalizeRecipeName(name: string): string {
  return name.trim().toLowerCase();
}

type Props = {
  storeName: string;
  staffKey: StaffKey;
  staffLabel: string;
  lane: { activeBatch: KitchenBatch | null; queue: KitchenBatch[]; menuExpanded: boolean };
  now: number;
  onStaffChange: (key: StaffKey) => void;
  showStaffPicker: boolean;
  onToggleMenu: () => void;
  onStartCooking: () => void;
  onAcceptAi: () => void;
  onMarkPacked: () => void;
  onMarkReadyForPickup: () => void;
  onInjectDemo: (mode: "jit" | "smart") => void;
  onVoice: (command: string) => void;
  onMergeQueueBatchesIntoActive: (sourceBatchIds: string[]) => void;
  readyForPickup: ReadyForPickupOrder[];
  pickedUp: PickedUpOrder[];
  delivered: FulfilledDelivery[];
  agents: DeliveryAgent[];
  onMarkPickedUp: (tokenId: string) => void;
  onMarkDelivered: (tokenId: string) => void;
  onAgentStatus: (agentId: string, status: AgentStatus) => void;
  headerRight?: ReactNode;
};

export function StaffStoreDashboard({
  storeName,
  staffKey,
  staffLabel,
  lane,
  now,
  onStaffChange,
  showStaffPicker,
  onToggleMenu,
  onStartCooking,
  onAcceptAi,
  onMarkPacked,
  onMarkReadyForPickup,
  onInjectDemo,
  onVoice,
  onMergeQueueBatchesIntoActive,
  readyForPickup,
  pickedUp,
  delivered,
  agents,
  onMarkPickedUp,
  onMarkDelivered,
  onAgentStatus,
  headerRight,
}: Props) {
  const [similarPreview, setSimilarPreview] = useState<KitchenBatch[] | null>(null);
  const [similarBusy, setSimilarBusy] = useState(false);

  const phase = lane.activeBatch?.phase;
  const canUseSimilarCommand =
    lane.activeBatch !== null && (phase === "waiting" || phase === "cooking");

  useEffect(() => {
    setSimilarPreview(null);
  }, [staffKey]);

  useEffect(() => {
    if (!lane.activeBatch) {
      setSimilarPreview(null);
      return;
    }
    if (phase !== "waiting" && phase !== "cooking") {
      setSimilarPreview(null);
    }
  }, [lane.activeBatch, phase]);

  const runFetchSimilar = () => {
    if (!lane.activeBatch || !canUseSimilarCommand) return;
    setSimilarBusy(true);
    window.setTimeout(() => {
      const n = normalizeRecipeName(lane.activeBatch!.recipeName);
      const matches = lane.queue.filter((b) => normalizeRecipeName(b.recipeName) === n);
      setSimilarPreview(matches);
      setSimilarBusy(false);
    }, 420);
  };

  const confirmMergeSimilar = () => {
    if (!similarPreview?.length) return;
    onMergeQueueBatchesIntoActive(similarPreview.map((b) => b.id));
    setSimilarPreview(null);
  };

  const similarOrderTickets = similarPreview?.reduce((s, b) => s + b.quantity, 0) ?? 0;

  return (
    <div className="dashboard dashboard--staff">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Welcome, Chef {staffLabel}</h1>
          <p className="dashboard__subtitle">{storeName}</p>
        </div>
        <div className="dashboard__headerActions">
          {showStaffPicker ? (
            <label className="staff-picker">
              <span className="staff-picker__label">View as staff</span>
              <select
                className="staff-picker__select"
                value={staffKey}
                onChange={(e) => onStaffChange(e.target.value as StaffKey)}
              >
                <option value="yann">Yann</option>
                <option value="pranav">Pranav</option>
              </select>
            </label>
          ) : null}
          {headerRight}
        </div>
      </header>

      <div className="dashboard__body dashboard__body--staff">
        <main className="dashboard__main dashboard__main--staff" aria-label="Staff workload">
          <div className="dashboard__batchAndQueue">
            <StaffBatchCard
              staffKey={staffKey}
              batch={lane.activeBatch}
              menuExpanded={lane.menuExpanded}
              now={now}
              onToggleMenu={onToggleMenu}
              onStartCooking={onStartCooking}
              onAcceptAi={onAcceptAi}
              onMarkPacked={onMarkPacked}
              onMarkReadyForPickup={onMarkReadyForPickup}
            />

            <section className="queue-strip queue-strip--nextToBatch" aria-label="Active queue">
              <h3 className="queue-strip__title">Upcoming in queue</h3>
              <div className="queue-strip__simulate" role="group" aria-label="Simulate incoming orders">
                <button type="button" className="btn btn--secondary btn--small" onClick={() => onInjectDemo("jit")}>
                  Simulate JIT order
                </button>
                <button type="button" className="btn btn--secondary btn--small" onClick={() => onInjectDemo("smart")}>
                  Simulate smart batch
                </button>
              </div>

              {lane.queue.length === 0 ? (
                <p className="queue-strip__empty">Queue empty.</p>
              ) : (
                <ol className="queue-strip__list">
                  {lane.queue.map((b) => (
                    <li key={b.id} className="queue-strip__item">
                      <span className="queue-strip__batch">Batch #{b.batchNo}</span>
                      <span className="queue-strip__recipe">{b.recipeName}</span>
                      <span className="queue-strip__qty">×{b.quantity}</span>
                    </li>
                  ))}
                </ol>
              )}

              {canUseSimilarCommand ? (
                <div
                  className="staff-card__voiceSuggestions queue-strip__voiceSuggestions"
                  role="region"
                  aria-label="Suggested voice commands"
                >
                  <h3 className="staff-card__voiceSuggestionsTitle">
                    <SpeakAloudIcon />
                    Suggested Voice Commands
                  </h3>
                  <p className="staff-card__voiceSuggestionsHint">
                    Tap a phrase to simulate voice input — scan the queue for the same recipe as this batch, then merge
                    matches into the current batch (other queue rows stay put).
                  </p>
                  <div className="staff-card__voiceQuoteGrid" role="group" aria-label="Queue merge voice commands">
                    <button
                      type="button"
                      className="btn btn--voiceSuggested"
                      disabled={similarBusy}
                      title="Scan the queue for batches with the same recipe as the current batch."
                      onClick={runFetchSimilar}
                    >
                      {"Trigger \"Fetch Similar Orders and add to Current Batch\""}
                    </button>
                  </div>
                  {similarBusy ? (
                    <p className="staff-card__voiceAgentStatus" aria-live="polite">
                      <span className="staff-card__voiceAgentDot" aria-hidden />
                      <span className="queue-strip__agentCopy">Analyzing queue…</span>
                    </p>
                  ) : null}
                  {!similarBusy && similarPreview !== null ? (
                    <>
                      <p className="staff-card__voiceAgentStatus" aria-live="polite">
                        <span className="staff-card__voiceAgentDot" aria-hidden />
                        <span className="queue-strip__agentCopy">
                          {similarPreview.length > 0 ? (
                            <>
                              Agent: found {similarPreview.length} queued batch
                              {similarPreview.length === 1 ? "" : "es"} matching{" "}
                              <strong>{lane.activeBatch?.recipeName}</strong> — {similarOrderTickets} ticket
                              {similarOrderTickets === 1 ? "" : "s"}. Pull them into the current batch to cook together;
                              they leave this queue; other batches stay put.
                            </>
                          ) : (
                            <>
                              Agent: no queued batches share the recipe{" "}
                              <strong>{lane.activeBatch?.recipeName}</strong>. Nothing to merge.
                            </>
                          )}
                        </span>
                      </p>
                      {similarPreview.length > 0 ? (
                        <>
                          <ul className="queue-strip__agentMatches">
                            {similarPreview.map((b) => (
                              <li key={b.id}>
                                Batch #{b.batchNo} · {b.recipeName} ×{b.quantity}
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            className="btn btn--primary btn--small queue-strip__mergeCta"
                            onClick={confirmMergeSimilar}
                          >
                            Add matched orders to current batch
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : null}
                  {!similarBusy && similarPreview === null ? (
                    <p className="staff-card__voiceAgentStatus staff-card__voiceAgentStatus--idle" aria-live="polite">
                      <span className="staff-card__voiceAgentDot staff-card__voiceAgentDot--idle" aria-hidden />
                      Voice agent currently idle.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>

          <StatusSidebar
            now={now}
            readyForPickup={readyForPickup}
            pickedUp={pickedUp}
            delivered={delivered}
            agents={agents}
            onMarkPickedUp={onMarkPickedUp}
            onMarkDelivered={onMarkDelivered}
            onAgentStatus={onAgentStatus}
            className="status-sidebar--staffHorizontal"
            ariaLabel="Pickup and delivery"
          />

          <VoiceAiPanel staffKey={staffKey} onCommand={onVoice} />
        </main>
      </div>
    </div>
  );
}

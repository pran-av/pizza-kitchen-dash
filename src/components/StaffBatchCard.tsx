import { useEffect, useMemo, useRef, useState } from "react";
import type { BatchLifecyclePhase, KitchenBatch, StaffKey } from "../types/kitchen";
import { CollapsibleMenu } from "./CollapsibleMenu";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function formatBatchWindowRemaining(ms: number): string {
  if (ms <= 0) return "0 min";
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s} s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} s`;
}


export function SpeakAloudIcon() {
  return (
    <svg className="staff-card__voiceIcon" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
      />
    </svg>
  );
}


function BatchWindowInfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
      />
    </svg>
  );
}

type StaffVoiceQuoteItem = {
  id: string;
  /** Phrase used for simulation steps and intent matching */
  spoken: string;
  /** Button label, e.g. Trigger "Batch #12 Cooking" */
  display: string;
};

function staffVoiceQuoteItems(phase: BatchLifecyclePhase, batchNo: number): StaffVoiceQuoteItem[] {
  const trigger = (inner: string) => `Trigger "${inner}"`;
  const b = batchNo;

  if (phase === "cooking") {
    return [
      { id: "c-packed", spoken: `Batch #${b} Packed`, display: trigger(`Batch #${b} Packed`) },
      { id: "c-complete", spoken: `Batch #${b} Complete`, display: trigger(`Batch #${b} Complete`) },
      { id: "c-repeat", spoken: "Repeat recipe steps", display: trigger("Repeat recipe steps") },
    ];
  }
  if (phase === "packed") {
    return [
      {
        id: "p-pickup",
        spoken: `Batch #${b} Ready for Pickup`,
        display: trigger(`Batch #${b} Ready for Pickup`),
      },
      { id: "p-complete", spoken: `Batch #${b} Complete`, display: trigger(`Batch #${b} Complete`) },
      { id: "p-next", spoken: "What's next in the queue?", display: trigger("What's next in the queue?") },
    ];
  }
  return [
    { id: "w-cook", spoken: `Batch #${b} Cooking`, display: trigger(`Batch #${b} Cooking`) },
    { id: "w-dictate", spoken: "Open and Dictate Menu Details", display: trigger("Open and Dictate Menu Details") },
    {
      id: "w-packaging",
      spoken: "Describe packaging instructions",
      display: trigger("Describe packaging instructions"),
    },
  ];
}

/** Dictation-style voice runs (longer copy while buffering). */
function isMenuDictateVoiceQuote(quote: string): boolean {
  const q = quote.toLowerCase().trim();
  return (
    q.includes("dictate menu") ||
    q.includes("open and dictate") ||
    q.includes("open menu details")
  );
}

/** Any voice intent that should anchor buffering to the recipe panel (and open it), not the primary CTA. */
function isRecipePanelVoiceQuote(quote: string): boolean {
  const q = quote.toLowerCase().trim();
  return (
    q.includes("repeat recipe") ||
    q.includes("open menu") ||
    q.includes("menu details") ||
    q.includes("describe packaging") ||
    isMenuDictateVoiceQuote(quote)
  );
}

function buildVoiceSimulationLines(
  spoken: string,
  phase: BatchLifecyclePhase,
  orderNo: number,
  batchNo: number,
): string[] {
  if (isMenuDictateVoiceQuote(spoken)) {
    return [
      `Heard: “${spoken}” — opening Menu details…`,
      "Dictating ingredients, steps, and packaging from your station…",
      "Attaching transcript to this batch's Menu details card…",
      "Menu details card ready for review.",
    ];
  }
  if (isRecipePanelVoiceQuote(spoken)) {
    return [
      `Heard: “${spoken}” — opening recipe details…`,
      "Surfacing ingredients, steps, oven, and packaging…",
      "Recipe panel ready for review.",
    ];
  }
  const on = orderNo || 0;
  const heard = `Heard: “${spoken}” — routing to kitchen agent…`;
  if (phase === "cooking") {
    return [
      heard,
      `Marking order #${on} packed…`,
      "Syncing batch with dispatch…",
      `Marking batch #${batchNo} completed…`,
    ];
  }
  if (phase === "packed") {
    return [heard, "Releasing orders to pickup…", `Handoff batch #${batchNo} to partner riders…`];
  }
  return [heard, "Queuing cook timer…", `Starting batch #${batchNo} when station confirms…`];
}

function applyVoiceCtaAfterSimulation(
  quote: string,
  phaseAtStart: BatchLifecyclePhase,
  hadAiSuggestion: boolean,
  menuExpanded: boolean,
  h: {
    onStartCooking: () => void;
    onAcceptAi: () => void;
    onMarkPacked: () => void;
    onMarkReadyForPickup: () => void;
    onToggleMenu: () => void;
  },
): void {
  const q = quote.toLowerCase().trim();

  const batchCmd = q.match(/^batch #\d+\s+(.+)$/);
  if (batchCmd) {
    const verb = batchCmd[1]!.trim();
    if (verb === "cooking") {
      if (phaseAtStart === "waiting" && hadAiSuggestion) h.onAcceptAi();
      else if (phaseAtStart === "waiting") h.onStartCooking();
      return;
    }
    if (verb === "packed" && phaseAtStart === "cooking") {
      h.onMarkPacked();
      return;
    }
    if (verb === "complete" && phaseAtStart === "cooking") {
      h.onMarkPacked();
      return;
    }
    if (verb === "ready for pickup" && phaseAtStart === "packed") {
      h.onMarkReadyForPickup();
      return;
    }
    if (verb === "complete" && phaseAtStart === "packed") {
      h.onMarkReadyForPickup();
      return;
    }
  }

  if (q.includes("start cooking")) {
    if (phaseAtStart === "waiting" && hadAiSuggestion) h.onAcceptAi();
    else if (phaseAtStart === "waiting") h.onStartCooking();
    return;
  }
  if (
    q.includes("open menu") ||
    q.includes("menu details") ||
    q.includes("describe packaging") ||
    q.includes("repeat recipe") ||
    q.includes("dictate menu") ||
    q.includes("open and dictate")
  ) {
    if (!menuExpanded) h.onToggleMenu();
    return;
  }
  if (phaseAtStart === "cooking" && q.includes("mark order packed")) {
    h.onMarkPacked();
    return;
  }
  if (
    phaseAtStart === "cooking" &&
    (q.includes("mark final batch complete") || q.includes("mark batch complete"))
  ) {
    h.onMarkPacked();
    return;
  }
  if (phaseAtStart === "packed" && q.includes("ready for pickup")) {
    h.onMarkReadyForPickup();
    return;
  }
  if (
    phaseAtStart === "packed" &&
    (q.includes("mark final batch complete") || q.includes("mark batch complete"))
  ) {
    h.onMarkReadyForPickup();
    return;
  }
}

type Props = {
  staffKey: StaffKey;
  batch: KitchenBatch | null;
  menuExpanded: boolean;
  now: number;
  onToggleMenu: () => void;
  onStartCooking: () => void;
  onAcceptAi: () => void;
  onMarkPacked: () => void;
  onMarkReadyForPickup: () => void;
};

export function StaffBatchCard({
  staffKey,
  batch,
  menuExpanded,
  now,
  onToggleMenu,
  onStartCooking,
  onAcceptAi,
  onMarkPacked,
  onMarkReadyForPickup,
}: Props) {
  const waitingRemainingMs = useMemo(() => {
    if (!batch || batch.phase !== "waiting") return null;
    return batch.batchWindowEndsAt - now;
  }, [batch, now]);

  const cookingRemainingMs = useMemo(() => {
    if (!batch || batch.phase !== "cooking" || !batch.cookingEndsAt) return null;
    return batch.cookingEndsAt - now;
  }, [batch, now]);

  const voiceQuoteItems = useMemo(
    () => (batch ? staffVoiceQuoteItems(batch.phase, batch.batchNo) : []),
    [batch],
  );

  const [voiceRunQuote, setVoiceRunQuote] = useState<string | null>(null);
  const [ctaBufferLine, setCtaBufferLine] = useState("");
  const [batchWindowInfoOpen, setBatchWindowInfoOpen] = useState(false);

  const batchRef = useRef(batch);
  batchRef.current = batch;

  const menuExpandedRef = useRef(menuExpanded);
  menuExpandedRef.current = menuExpanded;

  const handlersRef = useRef({
    onStartCooking,
    onAcceptAi,
    onMarkPacked,
    onMarkReadyForPickup,
    onToggleMenu,
  });
  handlersRef.current = {
    onStartCooking,
    onAcceptAi,
    onMarkPacked,
    onMarkReadyForPickup,
    onToggleMenu,
  };

  useEffect(() => {
    setVoiceRunQuote(null);
    setCtaBufferLine("");
    setBatchWindowInfoOpen(false);
  }, [batch?.id]);

  useEffect(() => {
    if (!voiceRunQuote) return;
    const b = batchRef.current;
    if (!b) {
      setVoiceRunQuote(null);
      setCtaBufferLine("");
      return;
    }
    const phaseAtStart = b.phase;
    const hadAiSuggestion = !!b.assignmentSuggestion;
    if (isRecipePanelVoiceQuote(voiceRunQuote) && !menuExpandedRef.current) {
      handlersRef.current.onToggleMenu();
    }
    const lines = buildVoiceSimulationLines(
      voiceRunQuote,
      b.phase,
      b.orders[0]?.orderNo ?? 0,
      b.batchNo,
    );
    let step = 0;
    setCtaBufferLine(lines[0] ?? "");
    const id = window.setInterval(() => {
      step += 1;
      if (step >= lines.length) {
        window.clearInterval(id);
        applyVoiceCtaAfterSimulation(
          voiceRunQuote,
          phaseAtStart,
          hadAiSuggestion,
          menuExpandedRef.current,
          handlersRef.current,
        );
        setVoiceRunQuote(null);
        setCtaBufferLine("");
        return;
      }
      setCtaBufferLine(lines[step] ?? "");
    }, 2800);
    return () => window.clearInterval(id);
  }, [voiceRunQuote]);

  const ctaFrozen = voiceRunQuote !== null;

  if (!batch) {
    return (
      <section className="staff-card staff-card--empty" aria-labelledby={`${staffKey}-heading`}>
        <h2 id={`${staffKey}-heading`} className="staff-card__title staff-card__title--emptyLane">
          No active batch
        </h2>
        <p className="staff-card__empty">No active batch. Next in queue will appear here.</p>
      </section>
    );
  }

  const phaseLabel =
    batch.phase === "waiting" ? "Waiting" : batch.phase === "cooking" ? "Cooking" : "Packed";

  const recipePanelVoiceActive =
    ctaFrozen && !!voiceRunQuote && !!ctaBufferLine && isRecipePanelVoiceQuote(voiceRunQuote);

  const cookingInstructionForOrders =
    batch.cookingInstructions?.trim() || batch.recipeMenu.ovenInstructions.trim() || "";
  const packagingInstructionForOrders = batch.recipeMenu.packagingInstructions.trim() || "";

  return (
    <section className="staff-card" aria-labelledby={`${staffKey}-heading`}>
      <header className="staff-card__header">
        <div className="staff-card__headerRow">
          <div className="staff-card__headerMain">
            <h2 id={`${staffKey}-heading`} className="staff-card__batchHeading">
              Batch #{batch.batchNo}
            </h2>
            <p className="staff-card__recipeMeta">
              {batch.recipeName}
              <span className="staff-card__qty"> · Qty {batch.quantity}</span>
            </p>
          </div>
          <div className="staff-card__headerRight">
            <span className={`staff-card__phase staff-card__phase--${batch.phase}`}>{phaseLabel}</span>
            <div className="staff-card__headerTimers" aria-live="polite">
              {batch.phase === "waiting" && waitingRemainingMs !== null ? (
                <div className="staff-card__waitTimerCluster">
                  <span
                    className="staff-card__timer staff-card__timer--wait"
                    aria-label={`Batch window remaining: ${formatRemaining(waitingRemainingMs)}`}
                  >
                    {formatBatchWindowRemaining(waitingRemainingMs)}
                  </span>
                  <div className="staff-card__batchWindowInfo">
                    <button
                      type="button"
                      className="staff-card__batchWindowInfoBtn"
                      aria-expanded={batchWindowInfoOpen}
                      aria-controls={`${staffKey}-batch-window-info`}
                      onClick={() => setBatchWindowInfoOpen((o) => !o)}
                      aria-label="About the batch window timer"
                    >
                      <BatchWindowInfoIcon />
                    </button>
                    {batchWindowInfoOpen ? (
                      <div
                        id={`${staffKey}-batch-window-info`}
                        className="staff-card__batchWindowInfoPopover"
                        role="status"
                      >
                        We are waiting for more similar orders to be autoassigned to this batch.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {batch.phase === "cooking" && cookingRemainingMs !== null ? (
                <span
                  className="staff-card__timer staff-card__timer--cook"
                  aria-label={`Cooking time remaining, ${formatRemaining(cookingRemainingMs)}`}
                >
                  {formatRemaining(cookingRemainingMs)} left
                </span>
              ) : null}
              {batch.phase === "packed" ? (
                <span className="staff-card__timer staff-card__timer--packed">
                  Packed — send to pickup when ready
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="staff-card__menuDetailsWrap staff-card__menuDetailsWrap--header">
          {recipePanelVoiceActive ? (
            <div className="staff-card__menuDictationStatus" role="status" aria-live="polite">
              <span className="staff-card__voiceAgentDot" aria-hidden />
              <span className="staff-card__menuDictationStatusText">{ctaBufferLine}</span>
            </div>
          ) : null}
          <CollapsibleMenu
            id={`menu-${staffKey}`}
            title={`${batch.recipeName} Recipe Details`}
            expanded={menuExpanded}
            onToggle={onToggleMenu}
          >
            <dl className="staff-card__menuGrid">
            <dt>Ingredients</dt>
            <dd>
              <ul>
                {batch.recipeMenu.ingredients.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </dd>
            <dt>Steps</dt>
            <dd>
              <ol>
                {batch.recipeMenu.steps.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ol>
            </dd>
            <dt>Oven</dt>
            <dd>{batch.recipeMenu.ovenInstructions}</dd>
            <dt>Packaging</dt>
            <dd>{batch.recipeMenu.packagingInstructions}</dd>
            <dt>Notes</dt>
            <dd>{batch.recipeMenu.specialNotes}</dd>
            </dl>
          </CollapsibleMenu>
        </div>
      </header>

      {batch.delayed && batch.phase === "cooking" ? (
        <div className="staff-card__delayed" role="alert">
          Delayed — timer ended. Finish when ready; next batch only after you release pickup.
        </div>
      ) : null}

      <div className="staff-card__body">
        <h3 className="staff-card__subheading">Orders in this batch</h3>
        <div className="staff-card__orderCards" role="list">
          {batch.orders.map((o) => (
            <article key={o.orderId} className="staff-card__orderCard" role="listitem">
              <header className="staff-card__orderCardHead">
                <span className="staff-card__orderId">Order #{o.orderNo}</span>
              </header>
              <div className="staff-card__orderInstructionGrid">
                <div className="staff-card__orderInstructionBlock">
                  <h4 className="staff-card__orderInstructionLabel">Cooking instruction</h4>
                  {cookingInstructionForOrders ? (
                    <p className="staff-card__orderInstructionText">{cookingInstructionForOrders}</p>
                  ) : (
                    <p className="staff-card__orderInstructionText staff-card__orderInstructionText--muted">
                      Not specified for this batch.
                    </p>
                  )}
                </div>
                <div className="staff-card__orderInstructionBlock staff-card__orderInstructionBlock--packaging">
                  <h4 className="staff-card__orderInstructionLabel">Packaging instructions</h4>
                  {packagingInstructionForOrders ? (
                    <p className="staff-card__orderInstructionText">{packagingInstructionForOrders}</p>
                  ) : (
                    <p className="staff-card__orderInstructionText staff-card__orderInstructionText--muted">
                      Not specified for this batch.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

      </div>

      <footer className="staff-card__footer staff-card__footer--actions">
        <div className="staff-card__footerCTAs">
          {batch.phase === "waiting" && batch.assignmentSuggestion ? (
            <div className="staff-card__footerCtaBanner" role="status">
              <p className="staff-card__footerCtaBannerText">
                No additional Orders found for this batch - I recommend start the cooking to avoid delays further.
              </p>
              <div className="staff-card__footerCtaBannerRow">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={onAcceptAi}
                  disabled={ctaFrozen}
                  aria-busy={ctaFrozen}
                >
                  Start cooking
                </button>
              </div>
            </div>
          ) : null}
          {batch.phase === "waiting" && !batch.assignmentSuggestion ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onStartCooking}
              disabled={ctaFrozen}
              aria-busy={ctaFrozen}
            >
              Start cooking
            </button>
          ) : null}
          {batch.phase === "cooking" ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onMarkPacked}
              disabled={ctaFrozen}
              aria-busy={ctaFrozen}
            >
              Mark order packed
            </button>
          ) : null}
          {batch.phase === "packed" ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onMarkReadyForPickup}
              disabled={ctaFrozen}
              aria-busy={ctaFrozen}
            >
              Ready for pickup
            </button>
          ) : null}
          {ctaFrozen && ctaBufferLine && !recipePanelVoiceActive ? (
            <p className="staff-card__voiceAgentStatus staff-card__voiceAgentStatus--cta" aria-live="polite">
              <span className="staff-card__voiceAgentDot" aria-hidden />
              {ctaBufferLine}
            </p>
          ) : null}
        </div>

        <div className="staff-card__voiceSuggestions">
          <h3 className="staff-card__voiceSuggestionsTitle">
            <SpeakAloudIcon />
            Suggested Voice Commands
          </h3>
          <p className="staff-card__voiceSuggestionsHint">
            Tap a phrase to simulate voice input — after buffering, the same actions as the primary button run, so the
            batch phase tag and CTA stay in sync.
          </p>
          <div className="staff-card__voiceQuoteGrid" role="group" aria-label="Simulated voice command phrases">
            {voiceQuoteItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="btn btn--voiceSuggested"
                disabled={ctaFrozen}
                onClick={() => setVoiceRunQuote(item.spoken)}
                title={`Simulate: ${item.display}`}
              >
                {item.display}
              </button>
            ))}
          </div>
          {!ctaFrozen ? (
            <p className="staff-card__voiceAgentStatus staff-card__voiceAgentStatus--idle" aria-live="polite">
              <span className="staff-card__voiceAgentDot staff-card__voiceAgentDot--idle" aria-hidden />
              Voice agent currently idle.
            </p>
          ) : recipePanelVoiceActive ? (
            <p className="staff-card__voiceSuggestionsFoot">
              Agent status is shown on the recipe details panel while this voice run is active.
            </p>
          ) : (
            <p className="staff-card__voiceSuggestionsFoot">
              Agent status is shown next to the primary action while this voice run is active.
            </p>
          )}
        </div>
      </footer>
    </section>
  );
}

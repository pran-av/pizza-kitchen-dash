import { useState } from "react";
import type { StaffKey } from "../types/kitchen";

type Props = {
  staffKey: StaffKey;
  onCommand: (command: string) => void;
};

const COMMANDS: { label: string; command: string }[] = [
  { label: "Start cooking", command: "Start cooking" },
  { label: "Show next order", command: "Show next order" },
  { label: "Open and Dictate Menu Details", command: "Open and Dictate Menu Details" },
  { label: "Repeat recipe steps", command: "Repeat recipe steps" },
  { label: "Mark batch complete", command: "Mark batch complete" },
  { label: "Mark order packed", command: "Mark order packed" },
  { label: "Ready for pickup", command: "Ready for pickup" },
  { label: "How many pending orders?", command: "How many pending orders?" },
  { label: "What is next after this?", command: "What is next after this?" },
  { label: "Describe recipe step 3", command: "Describe recipe step 3" },
];

export function VoiceAiPanel({ staffKey, onCommand }: Props) {
  const [last, setLast] = useState<string>("");

  return (
    <section className="voice-panel" aria-label="Voice AI assistant (simulated)">
      <h3 className="voice-panel__title">Voice AI</h3>
      <p className="voice-panel__hint">Tap a phrase — same as speaking the command on a kitchen tablet.</p>
      {last ? (
        <p className="voice-panel__last" aria-live="polite">
          Last: <strong>{last}</strong>
        </p>
      ) : null}
      <div className="voice-panel__grid">
        {COMMANDS.map((c) => (
          <button
            key={c.label}
            type="button"
            className="btn btn--voice"
            onClick={() => {
              setLast(c.label);
              onCommand(c.command);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="voice-panel__staff" aria-hidden>
        Staff lane: {staffKey}
      </p>
    </section>
  );
}

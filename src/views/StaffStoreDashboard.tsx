import type { ReactNode } from "react";
import type {
  AgentStatus,
  DeliveryAgent,
  FulfilledDelivery,
  KitchenBatch,
  PickedUpOrder,
  ReadyForPickupOrder,
  StaffKey,
} from "../types/kitchen";
import { StaffBatchCard } from "../components/StaffBatchCard";
import { StatusSidebar } from "../components/StatusSidebar";
import { VoiceAiPanel } from "../components/VoiceAiPanel";

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
  readyForPickup,
  pickedUp,
  delivered,
  agents,
  onMarkPickedUp,
  onMarkDelivered,
  onAgentStatus,
  headerRight,
}: Props) {
  return (
    <div className="dashboard dashboard--staff">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Yann Kitchen Dash</h1>
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
              staffLabel={staffLabel}
              batch={lane.activeBatch}
              queueLength={lane.queue.length}
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

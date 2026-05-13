import { useKitchenDashboard } from "./state/useKitchenDashboard";
import { StaffBatchCard } from "./components/StaffBatchCard";
import { StatusSidebar } from "./components/StatusSidebar";
import "./dashboard.css";

export default function App() {
  const {
    state,
    now,
    toggleMenu,
    completeBatch,
    assignDemoBatch,
    markDelivered,
    setAgentStatus,
  } = useKitchenDashboard();

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Yann Kitchen Dash</h1>
        <button type="button" className="btn btn--secondary" onClick={assignDemoBatch}>
          Simulate incoming batch
        </button>
      </header>

      <div className="dashboard__body">
        <main className="dashboard__main" aria-label="Staff batch lanes">
          <div className="dashboard__lanes">
            <StaffBatchCard
              staffKey="yann"
              staffLabel={state.lanes.yann.displayName}
              batch={state.lanes.yann.activeBatch}
              queueLength={state.lanes.yann.queue.length}
              menuExpanded={state.lanes.yann.menuExpanded}
              now={now}
              onToggleMenu={() => toggleMenu("yann")}
              onComplete={() => completeBatch("yann")}
            />
            <StaffBatchCard
              staffKey="pranav"
              staffLabel={state.lanes.pranav.displayName}
              batch={state.lanes.pranav.activeBatch}
              queueLength={state.lanes.pranav.queue.length}
              menuExpanded={state.lanes.pranav.menuExpanded}
              now={now}
              onToggleMenu={() => toggleMenu("pranav")}
              onComplete={() => completeBatch("pranav")}
            />
          </div>
        </main>

        <StatusSidebar
          now={now}
          readyForPickup={state.readyForPickup}
          delivered={state.delivered}
          agents={state.agents}
          onMarkDelivered={markDelivered}
          onAgentStatus={setAgentStatus}
        />
      </div>
    </div>
  );
}

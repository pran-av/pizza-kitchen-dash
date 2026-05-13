import { useEffect } from "react";
import { useKitchenDashboard } from "./state/useKitchenDashboard";
import { MockLogin } from "./views/MockLogin";
import { AdminDashboard } from "./views/AdminDashboard";
import { StaffStoreDashboard } from "./views/StaffStoreDashboard";
import "./dashboard.css";

export default function App() {
  const k = useKitchenDashboard();

  useEffect(() => {
    document.body.classList.toggle("theme-high-contrast", k.state.ui.highContrast);
  }, [k.state.ui.highContrast]);

  if (k.state.ui.view === "login") {
    return <MockLogin onStaff={k.loginStaff} onAdmin={k.loginAdmin} />;
  }

  const staffKey = k.state.ui.activeStaffKey;
  const lane = k.currentStore.lanes[staffKey];

  const staffDash = (
    <StaffStoreDashboard
      storeName={k.currentStore.name}
      staffKey={staffKey}
      staffLabel={lane.displayName}
      lane={lane}
      now={k.now}
      onStaffChange={k.setActiveStaff}
      showStaffPicker={k.state.ui.role === "admin" && k.state.ui.view === "admin_store"}
      onToggleMenu={() => k.toggleMenu(staffKey)}
      onStartCooking={() => k.startCooking(staffKey)}
      onAcceptAi={() => k.acceptAiSuggestion(staffKey)}
      onMarkPacked={() => k.markOrderPacked(staffKey)}
      onMarkReadyForPickup={() => k.markReadyForPickup(staffKey)}
      onInjectDemo={k.injectDemoBatch}
      onVoice={(cmd) => k.voiceCommand(staffKey, cmd)}
      onMergeQueueBatchesIntoActive={(ids: string[]) => k.mergeQueueBatchesIntoActive(staffKey, ids)}
      readyForPickup={k.currentStore.readyForPickup}
      pickedUp={k.currentStore.pickedUp}
      delivered={k.currentStore.delivered}
      agents={k.currentStore.agents}
      onMarkPickedUp={k.markPickedUp}
      onMarkDelivered={k.markDelivered}
      onAgentStatus={k.setAgentStatus}
      headerRight={
        <button type="button" className="btn btn--ghost" onClick={k.logout}>
          Log out
        </button>
      }
    />
  );

  if (k.state.ui.role === "staff" && k.state.ui.view === "staff_dashboard") {
    return staffDash;
  }

  if (k.state.ui.role === "admin") {
    return (
      <AdminDashboard
        stores={k.state.stores}
        selectedStoreId={k.state.ui.selectedStoreId}
        navTab={k.state.ui.adminNavTab}
        onSelectStore={k.selectStore}
        onNav={k.setAdminTab}
        onOpenStore={k.openAdminStoreView}
        onBack={k.backToAdminHome}
        onToggleContrast={k.toggleHighContrast}
        highContrast={k.state.ui.highContrast}
        onLogout={k.logout}
        child={k.state.ui.view === "admin_store" ? staffDash : null}
      />
    );
  }

  return null;
}

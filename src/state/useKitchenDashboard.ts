import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { AdminNavTab, AgentStatus, StaffKey, StoreId } from "../types/kitchen";
import { getInitialState, kitchenReducer } from "./kitchenReducer";

export function useKitchenDashboard() {
  const [now, setNow] = useState(() => Date.now());
  const [state, dispatch] = useReducer(kitchenReducer, undefined, getInitialState);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatchRef.current({ type: "TICK", now: t });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const selectedStoreId = state.ui.selectedStoreId;

  const currentStore = useMemo(() => {
    const s = state.stores.find((x) => x.id === selectedStoreId);
    return s ?? state.stores[0]!;
  }, [state.stores, selectedStoreId]);

  const loginStaff = useCallback((staffKey: StaffKey) => {
    dispatch({ type: "SELECT_STORE", storeId: "store-downtown" });
    dispatch({ type: "LOGIN_STAFF", staffKey });
  }, []);

  const loginAdmin = useCallback(() => {
    dispatch({ type: "LOGIN_ADMIN" });
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
  }, []);

  const setAdminTab = useCallback((tab: AdminNavTab) => {
    dispatch({ type: "SET_ADMIN_TAB", tab });
  }, []);

  const selectStore = useCallback((storeId: StoreId) => {
    dispatch({ type: "SELECT_STORE", storeId });
  }, []);

  const openAdminStoreView = useCallback((storeId: StoreId) => {
    dispatch({ type: "SELECT_STORE", storeId });
    dispatch({ type: "SET_ADMIN_TAB", tab: "dashboard" });
    dispatch({ type: "SET_UI_VIEW", view: "admin_store" });
  }, []);

  const backToAdminHome = useCallback(() => {
    dispatch({ type: "SET_UI_VIEW", view: "admin_home" });
  }, []);

  const setActiveStaff = useCallback((staffKey: StaffKey) => {
    dispatch({ type: "SET_ACTIVE_STAFF", staffKey });
  }, []);

  const toggleHighContrast = useCallback(() => {
    dispatch({ type: "TOGGLE_HIGH_CONTRAST" });
  }, []);

  const toggleMenu = useCallback(
    (staffKey: StaffKey) => {
      dispatch({ type: "TOGGLE_MENU", storeId: selectedStoreId, staffKey });
    },
    [selectedStoreId],
  );

  const startCooking = useCallback(
    (staffKey: StaffKey) => {
      dispatch({ type: "START_COOKING", storeId: selectedStoreId, staffKey });
    },
    [selectedStoreId],
  );

  const acceptAiSuggestion = useCallback(
    (staffKey: StaffKey) => {
      dispatch({ type: "ACCEPT_AI_SUGGESTION", storeId: selectedStoreId, staffKey });
    },
    [selectedStoreId],
  );

  const dismissAiSuggestion = useCallback(
    (staffKey: StaffKey) => {
      dispatch({ type: "DISMISS_AI_SUGGESTION", storeId: selectedStoreId, staffKey });
    },
    [selectedStoreId],
  );

  const markOrderPacked = useCallback(
    (staffKey: StaffKey) => {
      dispatch({ type: "MARK_ORDER_PACKED", storeId: selectedStoreId, staffKey });
    },
    [selectedStoreId],
  );

  const markReadyForPickup = useCallback(
    (staffKey: StaffKey) => {
      dispatch({ type: "MARK_READY_FOR_PICKUP", storeId: selectedStoreId, staffKey });
    },
    [selectedStoreId],
  );

  const injectDemoBatch = useCallback(
    (mode: "jit" | "smart") => {
      dispatch({ type: "INJECT_DEMO_BATCH", storeId: selectedStoreId, mode });
    },
    [selectedStoreId],
  );

  const markPickedUp = useCallback(
    (tokenId: string) => {
      dispatch({ type: "MARK_PICKED_UP", storeId: selectedStoreId, tokenId });
    },
    [selectedStoreId],
  );

  const markDelivered = useCallback(
    (tokenId: string) => {
      dispatch({ type: "MARK_DELIVERED", storeId: selectedStoreId, tokenId });
    },
    [selectedStoreId],
  );

  const setAgentStatus = useCallback(
    (agentId: string, status: AgentStatus) => {
      dispatch({ type: "SET_AGENT_STATUS", storeId: selectedStoreId, agentId, status });
    },
    [selectedStoreId],
  );

  const mergeQueueBatchesIntoActive = useCallback(
    (staffKey: StaffKey, sourceBatchIds: string[]) => {
      dispatch({
        type: "MERGE_QUEUE_BATCHES_INTO_ACTIVE",
        storeId: selectedStoreId,
        staffKey,
        sourceBatchIds,
      });
    },
    [selectedStoreId],
  );

  return {
    state,
    now,
    currentStore,
    dispatch,
    loginStaff,
    loginAdmin,
    logout,
    setAdminTab,
    selectStore,
    openAdminStoreView,
    backToAdminHome,
    setActiveStaff,
    toggleHighContrast,
    toggleMenu,
    startCooking,
    acceptAiSuggestion,
    dismissAiSuggestion,
    markOrderPacked,
    markReadyForPickup,
    injectDemoBatch,
    markPickedUp,
    markDelivered,
    setAgentStatus,
    mergeQueueBatchesIntoActive,
  };
}

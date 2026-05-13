import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { AgentStatus, StaffKey } from "../types/kitchen";
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

  const toggleMenu = useCallback((staffKey: StaffKey) => {
    dispatch({ type: "TOGGLE_MENU", staffKey });
  }, []);

  const completeBatch = useCallback((staffKey: StaffKey) => {
    dispatch({ type: "COMPLETE_BATCH", staffKey });
  }, []);

  const assignDemoBatch = useCallback(() => {
    dispatch({ type: "ASSIGN_DEMO_BATCH" });
  }, []);

  const markDelivered = useCallback((tokenId: string) => {
    dispatch({ type: "MARK_DELIVERED", tokenId });
  }, []);

  const setAgentStatus = useCallback((agentId: string, status: AgentStatus) => {
    dispatch({ type: "SET_AGENT_STATUS", agentId, status });
  }, []);

  return {
    state,
    now,
    dispatch,
    toggleMenu,
    completeBatch,
    assignDemoBatch,
    markDelivered,
    setAgentStatus,
  };
}

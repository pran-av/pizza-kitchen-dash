import type { KitchenBatch, KitchenState, ReadyForPickupOrder, StaffKey } from "../types/kitchen";
import { createInitialKitchenState } from "../data/mockKitchen";

export const COOK_DURATION_MS = 15 * 60 * 1000;

export type KitchenAction =
  | { type: "TICK"; now: number }
  | { type: "TOGGLE_MENU"; staffKey: StaffKey }
  | { type: "COMPLETE_BATCH"; staffKey: StaffKey }
  | { type: "ASSIGN_DEMO_BATCH" }
  | { type: "MARK_DELIVERED"; tokenId: string }
  | { type: "SET_AGENT_STATUS"; agentId: string; status: KitchenState["agents"][number]["status"] };

function startCookingIfNeeded(batch: KitchenBatch, now: number): KitchenBatch {
  if (batch.cookingEndsAt !== null) return batch;
  return { ...batch, cookingEndsAt: now + COOK_DURATION_MS };
}

function activateNextFromQueue(
  lane: KitchenState["lanes"][StaffKey],
  now: number,
): KitchenState["lanes"][StaffKey] {
  if (lane.queue.length === 0) {
    return { ...lane, activeBatch: null };
  }
  const [first, ...rest] = lane.queue;
  return {
    ...lane,
    activeBatch: startCookingIfNeeded({ ...first }, now),
    queue: rest,
  };
}

function completeActiveBatch(state: KitchenState, staffKey: StaffKey, now: number): KitchenState {
  const lane = state.lanes[staffKey];
  const active = lane.activeBatch;
  if (!active) return state;

  const newReady: ReadyForPickupOrder[] = active.orders.map((o) => ({
    tokenId: o.tokenId,
    provider: o.provider,
  }));
  const readyForPickup = [...state.readyForPickup, ...newReady];

  const clearedLane: KitchenState["lanes"][StaffKey] = {
    ...lane,
    activeBatch: null,
    queue: lane.queue,
  };

  const afterAdvance = activateNextFromQueue(clearedLane, now);

  return {
    ...state,
    readyForPickup,
    lanes: { ...state.lanes, [staffKey]: afterAdvance },
  };
}

function processExpiredTimers(state: KitchenState, now: number): KitchenState {
  let next = state;
  (["yann", "pranav"] as const).forEach((key) => {
    const b = next.lanes[key].activeBatch;
    if (b && b.cookingEndsAt !== null && now >= b.cookingEndsAt) {
      next = completeActiveBatch(next, key, now);
    }
  });
  return next;
}

export function kitchenReducer(state: KitchenState, action: KitchenAction): KitchenState {
  const now = action.type === "TICK" ? action.now : Date.now();

  switch (action.type) {
    case "TICK":
      return processExpiredTimers(state, action.now);
    case "TOGGLE_MENU": {
      const lane = state.lanes[action.staffKey];
      return {
        ...state,
        lanes: {
          ...state.lanes,
          [action.staffKey]: { ...lane, menuExpanded: !lane.menuExpanded },
        },
      };
    }
    case "COMPLETE_BATCH":
      return completeActiveBatch(state, action.staffKey, now);
    case "MARK_DELIVERED": {
      const ready = state.readyForPickup.find((t) => t.tokenId === action.tokenId);
      if (!ready) return state;
      return {
        ...state,
        readyForPickup: state.readyForPickup.filter((t) => t.tokenId !== action.tokenId),
        delivered: [
          ...state.delivered,
          { tokenId: action.tokenId, provider: ready.provider, fulfilledAt: now },
        ],
      };
    }
    case "SET_AGENT_STATUS": {
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.agentId ? { ...a, status: action.status } : a,
        ),
      };
    }
    case "ASSIGN_DEMO_BATCH": {
      const staffKey = state.nextAssignee;
      const lane = state.lanes[staffKey];
      const idSuffix = Math.random().toString(36).slice(2, 7).toUpperCase();
      const demoProvider = staffKey === "yann" ? "swiggy" : "zomato";
      const demo: KitchenBatch = {
        id: `B-DEMO-${idSuffix}`,
        recipeName: "Demo recipe",
        orders: [
          {
            orderId: `O-DEMO-${idSuffix}`,
            tokenId: `T-DEMO-${idSuffix}`,
            provider: demoProvider,
          },
        ],
        menuDetails: "Synthetic batch for UI demo.",
        cookingEndsAt: null,
      };

      const other: StaffKey = staffKey === "yann" ? "pranav" : "yann";

      if (!lane.activeBatch) {
        const started = startCookingIfNeeded(demo, now);
        return {
          ...state,
          nextAssignee: other,
          lanes: {
            ...state.lanes,
            [staffKey]: { ...lane, activeBatch: started },
          },
        };
      }

      return {
        ...state,
        nextAssignee: other,
        lanes: {
          ...state.lanes,
          [staffKey]: { ...lane, queue: [...lane.queue, demo] },
        },
      };
    }
    default:
      return state;
  }
}

export function getInitialState(): KitchenState {
  return createInitialKitchenState();
}

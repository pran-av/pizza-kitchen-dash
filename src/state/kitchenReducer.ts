import type {
  AppState,
  KitchenBatch,
  ReadyForPickupOrder,
  StaffKey,
  StoreId,
  StoreSlice,
} from "../types/kitchen";
import { createInitialAppState } from "../data/mockKitchen";

export const COOK_DURATION_MS = 15 * 60 * 1000;
export const BATCH_WINDOW_MS = 5 * 60 * 1000;

export type AppAction =
  | { type: "TICK"; now: number }
  | { type: "SET_UI_VIEW"; view: AppState["ui"]["view"] }
  | { type: "LOGIN_STAFF"; staffKey: StaffKey }
  | { type: "LOGIN_ADMIN" }
  | { type: "LOGOUT" }
  | { type: "SET_ADMIN_TAB"; tab: AppState["ui"]["adminNavTab"] }
  | { type: "SELECT_STORE"; storeId: StoreId }
  | { type: "SET_ACTIVE_STAFF"; staffKey: StaffKey }
  | { type: "TOGGLE_HIGH_CONTRAST" }
  | { type: "TOGGLE_MENU"; storeId: StoreId; staffKey: StaffKey }
  | { type: "START_COOKING"; storeId: StoreId; staffKey: StaffKey }
  | { type: "ACCEPT_AI_SUGGESTION"; storeId: StoreId; staffKey: StaffKey }
  | { type: "DISMISS_AI_SUGGESTION"; storeId: StoreId; staffKey: StaffKey }
  | { type: "MARK_ORDER_PACKED"; storeId: StoreId; staffKey: StaffKey }
  | { type: "MARK_READY_FOR_PICKUP"; storeId: StoreId; staffKey: StaffKey }
  | { type: "INJECT_DEMO_BATCH"; storeId: StoreId; mode: "jit" | "smart" }
  | { type: "MARK_PICKED_UP"; storeId: StoreId; tokenId: string }
  | { type: "MARK_DELIVERED"; storeId: StoreId; tokenId: string }
  | { type: "SET_AGENT_STATUS"; storeId: StoreId; agentId: string; status: StoreSlice["agents"][number]["status"] }
  | { type: "VOICE_COMMAND"; storeId: StoreId; staffKey: StaffKey; command: string }
  | { type: "MERGE_QUEUE_BATCHES_INTO_ACTIVE"; storeId: StoreId; staffKey: StaffKey; sourceBatchIds: string[] };

function storeIndex(stores: StoreSlice[], id: StoreId): number {
  return stores.findIndex((s) => s.id === id);
}

function mapStore(state: AppState, storeId: StoreId, fn: (s: StoreSlice) => StoreSlice): AppState {
  const i = storeIndex(state.stores, storeId);
  if (i < 0) return state;
  const next = [...state.stores];
  next[i] = fn(next[i]!);
  return { ...state, stores: next };
}

function resetBatchTimersForActivation(b: KitchenBatch, now: number): KitchenBatch {
  return {
    ...b,
    createdAt: now,
    batchWindowEndsAt: now + BATCH_WINDOW_MS,
    cookingEndsAt: null,
    phase: "waiting",
    delayed: false,
    assignmentSuggestion: null,
  };
}

function activateNextFromQueue(lane: StoreSlice["lanes"][StaffKey], now: number): StoreSlice["lanes"][StaffKey] {
  if (lane.queue.length === 0) {
    return { ...lane, activeBatch: null };
  }
  const [first, ...rest] = lane.queue;
  return {
    ...lane,
    activeBatch: resetBatchTimersForActivation({ ...first }, now),
    queue: rest,
  };
}

function applySuggestionAfterWindow(batch: KitchenBatch, now: number): KitchenBatch {
  if (batch.phase !== "waiting") return batch;
  if (now < batch.batchWindowEndsAt) return batch;
  if (batch.assignmentSuggestion) return batch;
  return {
    ...batch,
    assignmentSuggestion: {
      message:
        "AI: batch window ended — similar recipes in queue. Start cooking now to protect SLA, or wait if another order is seconds away.",
      recommendedAction: "cook_now",
    },
  };
}

function applyCookingDelayed(batch: KitchenBatch, now: number): KitchenBatch {
  if (batch.phase !== "cooking") return batch;
  if (!batch.cookingEndsAt || now < batch.cookingEndsAt) return batch;
  if (batch.delayed) return batch;
  return { ...batch, delayed: true };
}

function tickStoreSlice(slice: StoreSlice, now: number): StoreSlice {
  let lanes = { ...slice.lanes };
  (["yann", "pranav"] as const).forEach((key) => {
    const lane = lanes[key];
    const b = lane.activeBatch;
    if (!b) return;
    let nb = applySuggestionAfterWindow(b, now);
    nb = applyCookingDelayed(nb, now);
    if (nb !== b) {
      lanes = { ...lanes, [key]: { ...lane, activeBatch: nb } };
    }
  });
  return { ...slice, lanes };
}

function markReadyForPickupAndAdvance(s: StoreSlice, staffKey: StaffKey, now: number): StoreSlice {
  const lane = s.lanes[staffKey];
  const active = lane.activeBatch;
  if (!active || active.phase !== "packed") return s;

  const newReady: ReadyForPickupOrder[] = active.orders.map((o) => ({
    tokenId: o.tokenId,
    provider: o.provider,
    readySinceAt: now,
  }));

  const clearedLane: StoreSlice["lanes"][StaffKey] = {
    ...lane,
    activeBatch: null,
    queue: lane.queue,
  };
  const afterAdvance = activateNextFromQueue(clearedLane, now);

  return {
    ...s,
    readyForPickup: [...s.readyForPickup, ...newReady],
    lanes: { ...s.lanes, [staffKey]: afterAdvance },
  };
}

function normalizeRecipeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Merge queued batches into the active batch when recipes match (case-insensitive). Removes only matched batches from the queue. */
function mergeQueueBatchesIntoActive(slice: StoreSlice, staffKey: StaffKey, sourceBatchIds: string[]): StoreSlice {
  const lane = slice.lanes[staffKey];
  const active = lane.activeBatch;
  if (!active) return slice;
  if (active.phase !== "waiting" && active.phase !== "cooking") return slice;
  if (sourceBatchIds.length === 0) return slice;

  const activeNorm = normalizeRecipeName(active.recipeName);
  const idSet = new Set(sourceBatchIds);
  const toMerge = lane.queue.filter((b) => idSet.has(b.id) && normalizeRecipeName(b.recipeName) === activeNorm);
  if (toMerge.length === 0) return slice;

  const mergedIds = new Set(toMerge.map((b) => b.id));
  const extraOrders = toMerge.flatMap((b) => b.orders);
  const qtyAdd = toMerge.reduce((sum, b) => sum + b.quantity, 0);
  const newQueue = lane.queue.filter((b) => !mergedIds.has(b.id));

  const newActive: KitchenBatch = {
    ...active,
    orders: [...active.orders, ...extraOrders],
    quantity: active.quantity + qtyAdd,
  };

  return {
    ...slice,
    lanes: {
      ...slice.lanes,
      [staffKey]: { ...lane, activeBatch: newActive, queue: newQueue },
    },
  };
}

function voiceDispatch(state: AppState, storeId: StoreId, staffKey: StaffKey, command: string, now: number): AppState {
  const c = command.toLowerCase().trim();
  if (c.includes("start cooking")) {
    const slice = state.stores[storeIndex(state.stores, storeId)];
    const batch = slice?.lanes[staffKey].activeBatch;
    if (batch?.phase === "waiting" && batch.assignmentSuggestion) {
      return appReducer(state, { type: "ACCEPT_AI_SUGGESTION", storeId, staffKey }, now);
    }
    if (batch?.phase === "waiting") {
      return appReducer(state, { type: "START_COOKING", storeId, staffKey }, now);
    }
    return state;
  }
  if (
    c.includes("repeat recipe") ||
    c.includes("recipe steps") ||
    c.includes("open menu") ||
    c.includes("menu details") ||
    c.includes("describe packaging") ||
    c.includes("dictate menu") ||
    c.includes("open and dictate")
  ) {
    const lane = state.stores[storeIndex(state.stores, storeId)]?.lanes[staffKey];
    if (!lane?.menuExpanded) {
      return mapStore(state, storeId, (slice) => ({
        ...slice,
        lanes: {
          ...slice.lanes,
          [staffKey]: { ...slice.lanes[staffKey], menuExpanded: true },
        },
      }));
    }
    return state;
  }
  if (c.includes("show next") || c.includes("next order")) {
    const slice = state.stores[storeIndex(state.stores, storeId)];
    if (!slice) return state;
    const lane = slice.lanes[staffKey];
    if (lane.activeBatch) return state;
    const q = lane.queue[0];
    if (!q) return state;
    return mapStore(state, storeId, (s) => ({
      ...s,
      lanes: {
        ...s.lanes,
        [staffKey]: {
          ...s.lanes[staffKey],
          activeBatch: resetBatchTimersForActivation({ ...q }, now),
          queue: s.lanes[staffKey].queue.slice(1),
        },
      },
    }));
  }
  if (c.includes("mark order packed")) {
    return appReducer(state, { type: "MARK_ORDER_PACKED", storeId, staffKey }, now);
  }
  if (c.includes("mark batch complete") || c.includes("mark final batch complete")) {
    const slice = state.stores[storeIndex(state.stores, storeId)];
    const b = slice?.lanes[staffKey].activeBatch;
    if (b?.phase === "cooking") {
      return appReducer(state, { type: "MARK_ORDER_PACKED", storeId, staffKey }, now);
    }
    if (b?.phase === "packed") {
      return appReducer(state, { type: "MARK_READY_FOR_PICKUP", storeId, staffKey }, now);
    }
    return state;
  }
  if (c.includes("packed")) {
    return appReducer(state, { type: "MARK_ORDER_PACKED", storeId, staffKey }, now);
  }
  if (c.includes("ready for pickup")) {
    return appReducer(state, { type: "MARK_READY_FOR_PICKUP", storeId, staffKey }, now);
  }
  if (c.includes("pending") || c.includes("how many")) {
    return state;
  }
  if (c.includes("fetch similar orders") && c.includes("current batch")) {
    const slice = state.stores[storeIndex(state.stores, storeId)];
    if (!slice) return state;
    const lane = slice.lanes[staffKey];
    const active = lane.activeBatch;
    if (!active || (active.phase !== "waiting" && active.phase !== "cooking")) return state;
    const activeNorm = normalizeRecipeName(active.recipeName);
    const ids = lane.queue
      .filter((b) => normalizeRecipeName(b.recipeName) === activeNorm)
      .map((b) => b.id);
    if (ids.length === 0) return state;
    return appReducer(
      state,
      { type: "MERGE_QUEUE_BATCHES_INTO_ACTIVE", storeId, staffKey, sourceBatchIds: ids },
      now,
    );
  }
  return state;
}

function appReducer(state: AppState, action: AppAction, now: number): AppState {
  switch (action.type) {
    case "TICK": {
      const stores = state.stores.map((s) => tickStoreSlice(s, action.now));
      return { ...state, stores };
    }
    case "SET_UI_VIEW":
      return { ...state, ui: { ...state.ui, view: action.view } };
    case "LOGIN_STAFF":
      return {
        ...state,
        ui: {
          ...state.ui,
          role: "staff",
          view: "staff_dashboard",
          activeStaffKey: action.staffKey,
          selectedStoreId: state.ui.selectedStoreId,
        },
      };
    case "LOGIN_ADMIN":
      return {
        ...state,
        ui: {
          ...state.ui,
          role: "admin",
          view: "admin_home",
          adminNavTab: "dashboard",
        },
      };
    case "LOGOUT": {
      const fresh = createInitialAppState(now);
      return {
        ...fresh,
        ui: {
          ...fresh.ui,
          view: "login",
          role: null,
          highContrast: state.ui.highContrast,
        },
      };
    }
    case "SET_ADMIN_TAB":
      return { ...state, ui: { ...state.ui, adminNavTab: action.tab } };
    case "SELECT_STORE":
      return { ...state, ui: { ...state.ui, selectedStoreId: action.storeId } };
    case "SET_ACTIVE_STAFF":
      return { ...state, ui: { ...state.ui, activeStaffKey: action.staffKey } };
    case "TOGGLE_HIGH_CONTRAST":
      return { ...state, ui: { ...state.ui, highContrast: !state.ui.highContrast } };
    case "TOGGLE_MENU":
      return mapStore(state, action.storeId, (slice) => {
        const lane = slice.lanes[action.staffKey];
        return {
          ...slice,
          lanes: {
            ...slice.lanes,
            [action.staffKey]: { ...lane, menuExpanded: !lane.menuExpanded },
          },
        };
      });
    case "START_COOKING":
    case "ACCEPT_AI_SUGGESTION":
      return mapStore(state, action.storeId, (slice) => {
        const lane = slice.lanes[action.staffKey];
        const b = lane.activeBatch;
        if (!b || b.phase !== "waiting") return slice;
        return {
          ...slice,
          lanes: {
            ...slice.lanes,
            [action.staffKey]: {
              ...lane,
              activeBatch: {
                ...b,
                phase: "cooking",
                cookingEndsAt: now + COOK_DURATION_MS,
                assignmentSuggestion: null,
                delayed: false,
              },
            },
          },
        };
      });
    case "DISMISS_AI_SUGGESTION":
      return mapStore(state, action.storeId, (slice) => {
        const lane = slice.lanes[action.staffKey];
        const b = lane.activeBatch;
        if (!b) return slice;
        return {
          ...slice,
          lanes: {
            ...slice.lanes,
            [action.staffKey]: {
              ...lane,
              activeBatch: { ...b, assignmentSuggestion: null },
            },
          },
        };
      });
    case "MARK_ORDER_PACKED":
      return mapStore(state, action.storeId, (slice) => {
        const lane = slice.lanes[action.staffKey];
        const b = lane.activeBatch;
        if (!b || b.phase !== "cooking") return slice;
        return {
          ...slice,
          lanes: {
            ...slice.lanes,
            [action.staffKey]: {
              ...lane,
              activeBatch: { ...b, phase: "packed", cookingEndsAt: b.cookingEndsAt },
            },
          },
        };
      });
    case "MARK_READY_FOR_PICKUP":
      return mapStore(state, action.storeId, (slice) => markReadyForPickupAndAdvance(slice, action.staffKey, now));
    case "MARK_PICKED_UP":
      return mapStore(state, action.storeId, (slice) => {
        const ready = slice.readyForPickup.find((t) => t.tokenId === action.tokenId);
        if (!ready) return slice;
        return {
          ...slice,
          readyForPickup: slice.readyForPickup.filter((t) => t.tokenId !== action.tokenId),
          pickedUp: [...slice.pickedUp, { tokenId: ready.tokenId, provider: ready.provider, pickedUpAt: now }],
        };
      });
    case "MARK_DELIVERED":
      return mapStore(state, action.storeId, (slice) => {
        const picked = slice.pickedUp.find((t) => t.tokenId === action.tokenId);
        if (!picked) return slice;
        const revenueDelta = 899;
        return {
          ...slice,
          pickedUp: slice.pickedUp.filter((t) => t.tokenId !== action.tokenId),
          delivered: [...slice.delivered, { tokenId: picked.tokenId, provider: picked.provider, fulfilledAt: now }],
          metrics: {
            ...slice.metrics,
            deliveredTodayCount: slice.metrics.deliveredTodayCount + 1,
            revenueTodayCents: slice.metrics.revenueTodayCents + revenueDelta,
            liveOrders: Math.max(0, slice.metrics.liveOrders - 1),
          },
        };
      });
    case "SET_AGENT_STATUS":
      return mapStore(state, action.storeId, (slice) => ({
        ...slice,
        agents: slice.agents.map((a) =>
          a.id === action.agentId ? { ...a, status: action.status } : a,
        ),
      }));
    case "INJECT_DEMO_BATCH": {
      return mapStore(state, action.storeId, (slice) => {
        const staffKey = slice.nextAssignee;
        const lane = slice.lanes[staffKey];
        const idSuffix = Math.random().toString(36).slice(2, 6);
        const demoNo = 900 + Math.floor(Math.random() * 89);
        const token = `${demoNo}`.padStart(4, "0").slice(-4);
        const demo: KitchenBatch = {
          id: `demo-${idSuffix}`,
          batchNo: 90 + Math.floor(Math.random() * 9),
          recipeName: action.mode === "jit" ? "JIT single" : "Smart batch",
          quantity: 1,
          priority: "normal",
          cookingInstructions: action.mode === "jit" ? "Ship immediately — SLA tight." : "Hold for batch grouping window.",
          orders: [
            {
              orderId: `ord-demo-${idSuffix}`,
              orderNo: 300 + Math.floor(Math.random() * 50),
              tokenId: token,
              provider: staffKey === "yann" ? "swiggy" : "zomato",
            },
          ],
          recipeMenu: {
            ingredients: ["Demo dough", "Demo sauce"],
            steps: ["Open box", "Verify ticket"],
            ovenInstructions: "Reheat if needed.",
            packagingInstructions: "Sticker + receipt.",
            specialNotes: `Injected (${action.mode})`,
          },
          createdAt: now,
          batchWindowEndsAt: now + BATCH_WINDOW_MS,
          cookingEndsAt: null,
          phase: "waiting",
          delayed: false,
          assignmentSuggestion: null,
        };
        const other: StaffKey = staffKey === "yann" ? "pranav" : "yann";
        if (!lane.activeBatch) {
          return {
            ...slice,
            nextAssignee: other,
            metrics: { ...slice.metrics, liveOrders: slice.metrics.liveOrders + 1 },
            lanes: {
              ...slice.lanes,
              [staffKey]: { ...lane, activeBatch: demo },
            },
          };
        }
        return {
          ...slice,
          nextAssignee: other,
          metrics: { ...slice.metrics, liveOrders: slice.metrics.liveOrders + 1 },
          lanes: {
            ...slice.lanes,
            [staffKey]: { ...lane, queue: [...lane.queue, demo] },
          },
        };
      });
    }
    case "MERGE_QUEUE_BATCHES_INTO_ACTIVE":
      return mapStore(state, action.storeId, (slice) =>
        mergeQueueBatchesIntoActive(slice, action.staffKey, action.sourceBatchIds),
      );
    case "VOICE_COMMAND":
      return voiceDispatch(state, action.storeId, action.staffKey, action.command, now);
    default:
      return state;
  }
}

export function kitchenReducer(state: AppState, action: AppAction): AppState {
  const now = action.type === "TICK" ? action.now : Date.now();
  return appReducer(state, action, now);
}

export function getInitialState(): AppState {
  return createInitialAppState();
}

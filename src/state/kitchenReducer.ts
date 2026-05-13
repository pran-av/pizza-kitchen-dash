import type {
  AppState,
  KitchenBatch,
  KitchenOrder,
  LiveTrackingCard,
  LiveTrackingDay,
  StaffKey,
  StoreId,
  StoreSlice,
} from "../types/kitchen";
import { localDateKey } from "../types/kitchen";
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
  | { type: "SET_LIVE_TRACKING_BOARD_DATE"; storeId: StoreId; dateKey: string }
  | { type: "VOICE_PICKUP"; storeId: StoreId; text: string }
  | { type: "SET_AGENT_STATUS"; storeId: StoreId; agentId: string; status: StoreSlice["agents"][number]["status"] }
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

const EMPTY_LIVE_DAY: LiveTrackingDay = { ready: [], pickedUp: [], delivered: [] };

function getDay(slice: StoreSlice, key: string): LiveTrackingDay {
  return slice.liveTrackingByDate[key] ?? EMPTY_LIVE_DAY;
}

function setDay(slice: StoreSlice, key: string, day: LiveTrackingDay): StoreSlice {
  return {
    ...slice,
    liveTrackingByDate: { ...slice.liveTrackingByDate, [key]: day },
  };
}

function ordersToReadyCards(orders: KitchenOrder[], slice: StoreSlice, ts: number): LiveTrackingCard[] {
  const by = new Map<string, KitchenOrder[]>();
  for (const o of orders) {
    const g = by.get(o.tokenId) ?? [];
    g.push(o);
    by.set(o.tokenId, g);
  }
  const cards: LiveTrackingCard[] = [];
  for (const [tokenId, list] of by) {
    const ag = slice.agents.find((a) => a.tokenId === tokenId);
    cards.push({
      cardId: `card-${tokenId}-${ts}`,
      tokenId,
      provider: list[0]!.provider,
      agentName: ag?.name ?? "Dispatch",
      agentStatus: ag?.status ?? "en_route",
      orders: list.map((o) => ({ orderNo: o.orderNo })),
      readySinceAt: ts,
    });
  }
  return cards;
}

function mergeReadyWithNew(existing: LiveTrackingCard[], incoming: LiveTrackingCard[], ts: number): LiveTrackingCard[] {
  const out = [...existing];
  for (const c of incoming) {
    const i = out.findIndex((x) => x.tokenId === c.tokenId);
    if (i >= 0) {
      const base = out[i]!;
      out[i] = {
        ...base,
        orders: [...base.orders, ...c.orders],
        readySinceAt: Math.min(base.readySinceAt ?? ts, c.readySinceAt ?? ts),
      };
    } else {
      out.push(c);
    }
  }
  return out;
}

function moveReadyToPickedUpByToken(slice: StoreSlice, tokenId: string, ts: number): StoreSlice {
  const todayKey = localDateKey(ts);
  const day = getDay(slice, todayKey);
  const card = day.ready.find((c) => c.tokenId === tokenId);
  if (!card) return slice;
  const newReady = day.ready.filter((c) => c.tokenId !== tokenId);
  const moved: LiveTrackingCard = {
    ...card,
    pickedUpAt: ts,
    readySinceAt: undefined,
    agentStatus: "reached",
  };
  const newDay: LiveTrackingDay = { ...day, ready: newReady, pickedUp: [...day.pickedUp, moved] };
  const agents = slice.agents.map((a) => (a.tokenId === tokenId ? { ...a, status: "reached" as const } : a));
  return { ...setDay(slice, todayKey, newDay), agents };
}

function advanceLiveTrackingSimulation(slice: StoreSlice, ts: number): StoreSlice {
  const todayKey = localDateKey(ts);
  const day = getDay(slice, todayKey);
  if (day.pickedUp.length === 0) return slice;
  if (ts - slice.lastLiveSimAtMs < 8000) return slice;
  const [head, ...rest] = day.pickedUp;
  const deliveredHead: LiveTrackingCard = {
    ...head,
    fulfilledAt: ts,
    agentStatus: "en_route",
  };
  const nextDay: LiveTrackingDay = {
    ...day,
    pickedUp: rest,
    delivered: [...day.delivered, deliveredHead],
  };
  const revenueDelta = 899 * Math.max(1, head.orders.length);
  return {
    ...setDay(slice, todayKey, nextDay),
    lastLiveSimAtMs: ts,
    agents: slice.agents.map((a) => (a.tokenId === head.tokenId ? { ...a, status: "en_route" } : a)),
    metrics: {
      ...slice.metrics,
      deliveredTodayCount: slice.metrics.deliveredTodayCount + 1,
      revenueTodayCents: slice.metrics.revenueTodayCents + revenueDelta,
      liveOrders: Math.max(0, slice.metrics.liveOrders - head.orders.length),
    },
  };
}

function parseVoicePickupToken(text: string): string | null {
  const lower = text.toLowerCase();
  if (!lower.includes("picked")) return null;
  const m = text.match(/\b(\d{4})\b/);
  return m?.[1] ?? null;
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
  let next: StoreSlice = { ...slice, lanes };
  next = advanceLiveTrackingSimulation(next, now);
  return next;
}

function markReadyForPickupAndAdvance(s: StoreSlice, staffKey: StaffKey, now: number): StoreSlice {
  const lane = s.lanes[staffKey];
  const active = lane.activeBatch;
  if (!active || active.phase !== "packed") return s;

  const todayKey = localDateKey(now);
  const day = getDay(s, todayKey);
  const newCards = ordersToReadyCards(active.orders, s, now);
  const mergedReady = mergeReadyWithNew(day.ready, newCards, now);
  const nextDay: LiveTrackingDay = { ...day, ready: mergedReady };

  const clearedLane: StoreSlice["lanes"][StaffKey] = {
    ...lane,
    activeBatch: null,
    queue: lane.queue,
  };
  const afterAdvance = activateNextFromQueue(clearedLane, now);

  return {
    ...setDay(s, todayKey, nextDay),
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
      return mapStore(state, action.storeId, (slice) => moveReadyToPickedUpByToken(slice, action.tokenId, now));
    case "SET_LIVE_TRACKING_BOARD_DATE":
      return mapStore(state, action.storeId, (slice) => ({
        ...slice,
        liveTrackingBoardDate: action.dateKey,
      }));
    case "VOICE_PICKUP": {
      const token = parseVoicePickupToken(action.text);
      if (!token) return state;
      return mapStore(state, action.storeId, (slice) => moveReadyToPickedUpByToken(slice, token, now));
    }
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

export type StaffKey = "yann" | "pranav";

export type AgentStatus = "available" | "en_route" | "reached";

/** Order source / partner fleet */
export type DeliveryProvider = "swiggy" | "zomato" | "native";

export type StoreId = "store-downtown" | "store-airport" | "store-west";

export type AppRole = "staff" | "admin";

export type UiView = "login" | "admin_home" | "admin_store" | "staff_dashboard";

export type AdminNavTab = "dashboard" | "orders" | "delivery" | "analytics";

/** Batch-level lifecycle (MVP: one phase per active batch). */
export type BatchLifecyclePhase = "waiting" | "cooking" | "packed";

export type RecipeMenuDetails = {
  ingredients: string[];
  steps: string[];
  ovenInstructions: string;
  packagingInstructions: string;
  specialNotes: string;
};

export type AssignmentSuggestion = {
  message: string;
  recommendedAction: "wait" | "cook_now";
};

export type KitchenOrder = {
  /** Stable key for React lists */
  orderId: string;
  orderNo: number;
  /** Four-digit customer token */
  tokenId: string;
  provider: DeliveryProvider;
  requirement?: string;
};

export type KitchenBatch = {
  id: string;
  batchNo: number;
  recipeName: string;
  quantity: number;
  priority: "normal" | "high" | "rush";
  cookingInstructions?: string;
  orders: KitchenOrder[];
  recipeMenu: RecipeMenuDetails;
  createdAt: number;
  /** End of 5-minute smart-batch window (PRD) */
  batchWindowEndsAt: number;
  /** Set when phase is `cooking`; wall clock when cooking should finish */
  cookingEndsAt: number | null;
  phase: BatchLifecyclePhase;
  delayed: boolean;
  assignmentSuggestion: AssignmentSuggestion | null;
};

export type StaffLane = {
  staffKey: StaffKey;
  displayName: string;
  activeBatch: KitchenBatch | null;
  queue: KitchenBatch[];
  menuExpanded: boolean;
};

export type DeliveryAgent = {
  id: string;
  name: string;
  tokenId: string | null;
  status: AgentStatus;
  provider: DeliveryProvider;
};

/** One handoff row on the Live Tracking board (orders may share a token / agent). */
export type LiveTrackingOrderRef = {
  orderNo: number;
};

export type LiveTrackingCard = {
  cardId: string;
  tokenId: string;
  provider: DeliveryProvider;
  agentName: string;
  agentStatus: AgentStatus;
  orders: LiveTrackingOrderRef[];
  readySinceAt?: number;
  pickedUpAt?: number;
  fulfilledAt?: number;
};

export type LiveTrackingDay = {
  ready: LiveTrackingCard[];
  pickedUp: LiveTrackingCard[];
  delivered: LiveTrackingCard[];
};

export function localDateKey(ms: number = Date.now()): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type StoreMetrics = {
  liveOrders: number;
  deliveredTodayCount: number;
  revenueTodayCents: number;
  avgDeliveryMin: number;
  avgKitchenPrepMin: number;
};

export type StoreSlice = {
  id: StoreId;
  name: string;
  lanes: Record<StaffKey, StaffLane>;
  /** Boards keyed by local YYYY-MM-DD; kitchen writes to “today” only. */
  liveTrackingByDate: Record<string, LiveTrackingDay>;
  /** Which day the Live Tracking UI is showing */
  liveTrackingBoardDate: string;
  /** Throttle simulated agent-app updates (picked → delivered). */
  lastLiveSimAtMs: number;
  agents: DeliveryAgent[];
  nextAssignee: StaffKey;
  metrics: StoreMetrics;
};

export type AppUiState = {
  view: UiView;
  role: AppRole | null;
  activeStaffKey: StaffKey;
  adminNavTab: AdminNavTab;
  selectedStoreId: StoreId;
  highContrast: boolean;
};

export type AppState = {
  ui: AppUiState;
  stores: StoreSlice[];
};

/** Mock order row for admin placeholder tables */
export type AdminOrderRow = {
  orderNo: number;
  storeName: string;
  recipe: string;
  provider: DeliveryProvider;
  status: string;
};

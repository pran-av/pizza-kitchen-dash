export type StaffKey = "yann" | "pranav";

export type AgentStatus = "available" | "en_route" | "reached";

/** Food-aggregator partner for an order or delivery agent */
export type DeliveryProvider = "swiggy" | "zomato";

export type KitchenOrder = {
  orderId: string;
  tokenId: string;
  provider: DeliveryProvider;
  requirement?: string;
};

export type KitchenBatch = {
  id: string;
  recipeName: string;
  orders: KitchenOrder[];
  menuDetails: string;
  /** Epoch ms when cooking must end; null before cooking starts */
  cookingEndsAt: number | null;
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
  /** Partner fleet this rider belongs to — must match any assigned token’s order provider */
  provider: DeliveryProvider;
};

/** Token waiting for handoff to the matching partner rider */
export type ReadyForPickupOrder = {
  tokenId: string;
  provider: DeliveryProvider;
};

/** One order marked delivered, with wall-clock time for daily stats */
export type FulfilledDelivery = {
  tokenId: string;
  provider: DeliveryProvider;
  fulfilledAt: number;
};

export type KitchenState = {
  lanes: Record<StaffKey, StaffLane>;
  readyForPickup: ReadyForPickupOrder[];
  delivered: FulfilledDelivery[];
  agents: DeliveryAgent[];
  /** Round-robin target for the next synthetic incoming batch */
  nextAssignee: StaffKey;
};

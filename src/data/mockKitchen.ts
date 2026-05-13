import type { DeliveryProvider, KitchenBatch, KitchenState, StaffKey } from "../types/kitchen";

function batch(
  id: string,
  recipeName: string,
  orders: {
    orderId: string;
    tokenId: string;
    provider: DeliveryProvider;
    requirement?: string;
  }[],
  menuDetails: string,
  cookingEndsAt: number | null,
): KitchenBatch {
  return {
    id,
    recipeName,
    orders,
    menuDetails,
    cookingEndsAt,
  };
}

const COOK_MS = 15 * 60 * 1000;

export function createInitialKitchenState(now: number = Date.now()): KitchenState {
  const yannActive = batch(
    "B-101",
    "Margherita",
    [
      { orderId: "O-501", tokenId: "T-9001", provider: "swiggy", requirement: "Extra basil" },
      { orderId: "O-502", tokenId: "T-9002", provider: "zomato" },
    ],
    "Dough: thin. Sauce: classic tomato. Cheese: mozzarella. Bake: stone deck.",
    now + COOK_MS,
  );

  const pranavActive = batch(
    "B-204",
    "Pepperoni",
    [{ orderId: "O-601", tokenId: "T-9100", provider: "swiggy", requirement: "Light cheese" }],
    "Dough: hand-tossed. Toppings: pepperoni cup-and-char.",
    now + COOK_MS - 120_000,
  );

  const yannQueue: KitchenBatch[] = [
    batch(
      "B-102",
      "Margherita",
      [{ orderId: "O-503", tokenId: "T-9003", provider: "swiggy" }],
      "Same recipe line — batch for efficiency.",
      null,
    ),
  ];

  const pranavQueue: KitchenBatch[] = [
    batch(
      "B-205",
      "Veggie",
      [
        { orderId: "O-602", tokenId: "T-9101", provider: "zomato" },
        { orderId: "O-603", tokenId: "T-9102", provider: "swiggy" },
      ],
      "Peppers, onions, olives, mushrooms.",
      null,
    ),
  ];

  return {
    lanes: {
      yann: {
        staffKey: "yann",
        displayName: "Yann",
        activeBatch: yannActive,
        queue: yannQueue,
        menuExpanded: false,
      },
      pranav: {
        staffKey: "pranav",
        displayName: "Pranav",
        activeBatch: pranavActive,
        queue: pranavQueue,
        menuExpanded: false,
      },
    },
    readyForPickup: [
      { tokenId: "T-8800", provider: "swiggy" },
      { tokenId: "T-8801", provider: "zomato" },
    ],
    delivered: [{ tokenId: "T-8000", provider: "swiggy", fulfilledAt: now }],
    agents: [
      { id: "a1", name: "Alex", tokenId: "T-8800", status: "available", provider: "swiggy" },
      { id: "a2", name: "Sam", tokenId: "T-8801", status: "reached", provider: "zomato" },
      { id: "a3", name: "Jordan", tokenId: null, status: "available", provider: "swiggy" },
    ],
    nextAssignee: "yann" satisfies StaffKey,
  };
}

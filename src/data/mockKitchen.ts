import type {
  AppState,
  DeliveryProvider,
  KitchenBatch,
  RecipeMenuDetails,
  StaffKey,
  StoreId,
  StoreSlice,
} from "../types/kitchen";

const BATCH_WINDOW_MS = 5 * 60 * 1000;
const COOK_MS = 15 * 60 * 1000;

function menu(recipeName: string): RecipeMenuDetails {
  return {
    ingredients: ["00 flour", "San Marzano tomatoes", "Mozzarella", "Olive oil", "Sea salt"],
    steps: ["Stretch dough", "Sauce to edge", "Cheese", "Bake rotating once"],
    ovenInstructions: "Deck 320°C, 6–8 minutes until leopard spotting.",
    packagingInstructions: "Vent box; add oregano sachet.",
    specialNotes: recipeName.includes("Demo") ? "Demo batch — no allergens logged." : "Watch nut trace for pesto sides.",
  };
}

function makeBatch(params: {
  id: string;
  batchNo: number;
  recipeName: string;
  quantity: number;
  priority: KitchenBatch["priority"];
  cookingInstructions?: string;
  orders: { orderId: string; orderNo: number; tokenId: string; provider: DeliveryProvider; requirement?: string }[];
  now: number;
  phase: KitchenBatch["phase"];
  cookingEndsAt: number | null;
  createdOffsetMs?: number;
}): KitchenBatch {
  const createdAt = params.now - (params.createdOffsetMs ?? 0);
  return {
    id: params.id,
    batchNo: params.batchNo,
    recipeName: params.recipeName,
    quantity: params.quantity,
    priority: params.priority,
    cookingInstructions: params.cookingInstructions,
    orders: params.orders.map((o) => ({
      orderId: o.orderId,
      orderNo: o.orderNo,
      tokenId: o.tokenId,
      provider: o.provider,
      requirement: o.requirement,
    })),
    recipeMenu: menu(params.recipeName),
    createdAt,
    batchWindowEndsAt: createdAt + BATCH_WINDOW_MS,
    cookingEndsAt: params.cookingEndsAt,
    phase: params.phase,
    delayed: false,
    assignmentSuggestion: null,
  };
}

function buildStore(id: StoreId, name: string, now: number, seed: "a" | "b"): StoreSlice {
  const yannActive =
    seed === "a"
      ? makeBatch({
          id: `b-y-${id}-1`,
          batchNo: 21,
          recipeName: "Margherita",
          quantity: 2,
          priority: "normal",
          cookingInstructions: "Stone deck; rotate at 4 min.",
          orders: [
            { orderId: `ord-y1`, orderNo: 104, tokenId: "4821", provider: "swiggy", requirement: "Extra basil" },
            { orderId: `ord-y2`, orderNo: 105, tokenId: "9103", provider: "zomato" },
          ],
          now,
          phase: "cooking",
          cookingEndsAt: now + COOK_MS,
          createdOffsetMs: 6 * 60 * 1000,
        })
      : makeBatch({
          id: `b-y-${id}-1`,
          batchNo: 3,
          recipeName: "Paneer Tikka",
          quantity: 1,
          priority: "high",
          orders: [{ orderId: `ord-y1`, orderNo: 12, tokenId: "2201", provider: "native" }],
          now,
          phase: "waiting",
          cookingEndsAt: null,
          createdOffsetMs: 60_000,
        });

  const pranavActive = makeBatch({
    id: `b-p-${id}-1`,
    batchNo: seed === "a" ? 22 : 4,
    recipeName: seed === "a" ? "Pepperoni" : "Classic Veg",
    quantity: 1,
    priority: "normal",
    cookingInstructions: seed === "a" ? "Cup-and-char pepperoni." : "Light on cheese.",
    orders:
      seed === "a"
        ? [{ orderId: `ord-p1`, orderNo: 201, tokenId: "7730", provider: "swiggy", requirement: "Light cheese" }]
        : [
            { orderId: `ord-p1`, orderNo: 13, tokenId: "3300", provider: "zomato" },
            { orderId: `ord-p2`, orderNo: 14, tokenId: "3301", provider: "swiggy" },
          ],
    now,
    phase: "cooking",
    cookingEndsAt: now + COOK_MS - 120_000,
    createdOffsetMs: 8 * 60 * 1000,
  });

  const yannQueue: KitchenBatch[] = [
    makeBatch({
      id: `b-y-${id}-q1`,
      batchNo: seed === "a" ? 23 : 5,
      recipeName: "Margherita",
      quantity: 1,
      priority: "normal",
      orders: [{ orderId: `ord-y3`, orderNo: 106, tokenId: "1022", provider: "swiggy" }],
      now,
      phase: "waiting",
      cookingEndsAt: null,
    }),
  ];

  const pranavQueue: KitchenBatch[] = [
    makeBatch({
      id: `b-p-${id}-q1`,
      batchNo: seed === "a" ? 24 : 6,
      recipeName: seed === "a" ? "Veggie" : "Farmhouse",
      quantity: seed === "a" ? 2 : 1,
      priority: "normal",
      orders:
        seed === "a"
          ? [
              { orderId: `ord-p2`, orderNo: 202, tokenId: "4410", provider: "zomato" },
              { orderId: `ord-p3`, orderNo: 203, tokenId: "4411", provider: "swiggy" },
            ]
          : [{ orderId: `ord-p3`, orderNo: 15, tokenId: "4412", provider: "native" }],
      now,
      phase: "waiting",
      cookingEndsAt: null,
    }),
  ];

  const readySince = now - 4 * 60 * 1000;
  const readySince2 = now - 12 * 60 * 1000;

  return {
    id,
    name,
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
      { tokenId: "8800", provider: "swiggy", readySinceAt: readySince },
      { tokenId: "8801", provider: "zomato", readySinceAt: readySince2 },
    ],
    pickedUp: [{ tokenId: "6600", provider: "swiggy", pickedUpAt: now - 90_000 }],
    delivered: [{ tokenId: "5001", provider: "zomato", fulfilledAt: now - 3600_000 }],
    agents: [
      { id: `${id}-a1`, name: "Alex", tokenId: "8800", status: "available", provider: "swiggy" },
      { id: `${id}-a2`, name: "Sam", tokenId: "8801", status: "reached", provider: "zomato" },
      { id: `${id}-a3`, name: "Jordan", tokenId: null, status: "available", provider: "swiggy" },
    ],
    nextAssignee: "yann" satisfies StaffKey,
    metrics: {
      liveOrders: seed === "a" ? 18 : 9,
      deliveredTodayCount: seed === "a" ? 42 : 21,
      revenueTodayCents: seed === "a" ? 128_900 : 64_200,
      avgDeliveryMin: seed === "a" ? 24 : 28,
      avgKitchenPrepMin: seed === "a" ? 14 : 16,
    },
  };
}

export function createInitialAppState(now: number = Date.now()): AppState {
  return {
    ui: {
      view: "login",
      role: null,
      activeStaffKey: "yann",
      adminNavTab: "dashboard",
      selectedStoreId: "store-downtown",
      highContrast: false,
    },
    stores: [
      buildStore("store-downtown", "Downtown", now, "a"),
      buildStore("store-airport", "Airport", now, "b"),
      buildStore("store-west", "Westside", now, "a"),
    ],
  };
}

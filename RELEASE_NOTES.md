# Kitchen Dashboard — Release notes

## Overview

- Frontend-only **Yann’s Pizzeria** kitchen ops UI (Vite + React + TypeScript); no backend, auth APIs, or real speech.
- **Mock roles**: Cooking staff (Yann / Pranav tablets) vs **Admin** (metrics, store list, drill-in to same store view).

## Staff experience

- **Single lane per tablet** — one active batch + queue for the logged-in chef only.
- **Batch lifecycle**: Waiting (5 min batch window + AI suggestion) → Cooking (15 min countdown, **no auto-advance**; **Delayed** if timer overrun) → Packed → **Ready for pickup** (pushes to live tracking).
- **Structured recipe** menu (ingredients, steps, oven, packaging, notes) in a collapsible panel.
- **Simulated orders**: JIT vs smart-batch inject buttons.
- **Queue merge (voice-style)**: “Fetch similar orders…” flow to merge same-recipe queued batches into the active batch (simulated agent copy).

## Live tracking (pickup & delivery)

- **Kanban**: three columns — **Ready for Pickup** · **Picked Up** · **Delivered**.
- **Counters** per column = total **orders** in stacks (multi-order stacks share one **4-digit token** / agent card).
- **Date switch**: header **Live Tracking** + dropdown; **today** vs other seeded days (e.g. empty yesterday).
- **Kitchen**: **Mark "Picked Up"** on a ready stack only on **today’s** board; short **buffering** line under that stack’s CTA (pulsing dot + agent copy) before the card moves.
- **Voice (simulated)**: suggested command triggers same handoff + buffering under the **matching token**’s CTA.
- **Picked up → Delivered**: no kitchen buttons; **mock driver app** periodically advances the first picked stack to delivered and updates metrics.

## Admin experience

- **Cumulative metrics** (live orders, delivered today, revenue, avg delivery / prep) across stores; **per-store** snapshot + store cards.
- **Open store dashboard** embeds the staff view with **“View as staff”** (Yann / Pranav).
- **Nav stubs**: Orders table, Delivery, Analytics (placeholder copy).
- **High contrast** toggle (global body class).

## Technical

- Central state in **`useReducer`** (`kitchenReducer`); per-store slices: lanes, **liveTrackingByDate**, agents, metrics.
- **Tablet-oriented** layout and touch targets; responsive stacking where needed.

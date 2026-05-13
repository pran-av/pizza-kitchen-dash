# Pizza Delivery Kitchen Dashboard PRD

## Context

We are a pizza delivery chain "Yann's Pizzeria" with existing kitchens launching an online ordering and delivery platform.

This PRD defines the **Kitchen Operations Dashboard** used by:

* Cooking Staff
* Store Admins
* Central Operations Admins

The company operates as an **AI + Human-in-the-loop operational system**.
The dashboard should reduce cognitive load on kitchen staff using:

* AI-assisted batching
* Voice AI interaction
* Simplified operational flows
* Minimal manual input

The kitchen operates with only **2 cooking staff members per store**, so the system must optimize:

* Task assignment
* Cooking efficiency
* Delivery coordination
* Context switching reduction

---

# User Roles

Note: For logins just add buttons to trigger flow, avoid writing actual login.

## 1. Cooking Staff Login

Flow:

* Staff logs in on assigned kitchen tablet
* Store is auto-selected based on login
* User directly lands on Staff Dashboard

Characteristics:

* Hands-busy environment
* Minimal typing
* Voice-first interactions
* Focus only on assigned operational tasks

---

## 2. Admin Login

Flow:

* Admin logs in
* Selects Store from navigation dropdown
* Lands on Store Dashboard

Admin has visibility into:

* Total Live Orders
* Orders Delivered Today
* Total Revenue Today
* Staff workload
* Delivery operations
* Kitchen performance metrics

So post Admin login - show the above metrics per store. With a top section showin the key metrics in cumulative fashion.

The admin clicks on Store Card to open the Store Dashboard that is visible to Staff

---

# Navigation

## Admin Navigation

* Store Selector Dropdown (better to be a metrics driven screen in itself as clarified above)
* Dashboard
* Orders
* Delivery Status
* Analytics

---

## Staff Navigation

No complex navigation.

Staff lands directly into (this is the Store Dashboard):

* Active Queue
* Current Batch / Order
* Voice AI Controls

---

# Core Operational Principles

## 1. AI-Assisted Kitchen Management

The system should use AI agents to reduce operational overhead. Users should be able to say/click default commands/flows visible on screen for them to be triggered.

AI responsibilities:

* Mark the current ongoing Batch or Order as "Ready for Delivery"
* Ask about the pickup status of an Order either: "No Agent Assigned", "Agent Assigned", "Delivery Agent En-Route", "Order PickUp Compelted", "Delivered"
* Switch to menu and explain a recipe

---

## 2. Hybrid Order Assignment Strategy

The system supports:

### A. JIT (Just-In-Time) Assignment

If batching opportunity is low:

* Assign immediately
* Optimize for delivery SLA

### B. Smart Batching

If similar recipes arrive within batching window:

* Wait up to 5 minutes
* Group similar recipes
* Cook simultaneously
* Reduce repetitive preparation effort

---

## Smart Batch Rules

Inputs:

* Current active orders
* Recipe similarity
* Oven capacity
* Delivery SLA
* Estimated prep time

Default assumptions:

Keep an existing timers on these for the respective cards and do not auto switch to next when completed, instead mark the status as Delayed. The staff can command agent to mark complete whenever done that's when it shows the next order or batch.

* Batch Formation Window: 5 mins
* Cooking Time: 15 mins post Batch Formation Window
* Delivery SLA: 30 mins post Order received in Database


AI should determine:

Post the 5 min batching wait: give AI suggestion for staff to proceed with order or if batch/partial complete, proceed with that. Mark the order as 'Ongoing' when this happens.

* Whether to wait for batching
* Whether immediate cooking is better

---

# Dashboard Structure

# 1. Staff Dashboard

## Layout Principles

* Single-task focused
* Large touch targets
* Minimal text input
* Voice-first interaction
* Recipe visibility prioritized
* No split-screen by staff

Each staff tablet only shows:

* Their assigned workload
* Current queue
* Pickup visibility
* Voice controls

---

## Dashboard Sections

### A. Active Assignment Section

Displays:

* Current Active Batch OR Order
* Recipe Name
* Quantity
* Timer
* Cooking Instructuins: if any
* Priority Status

Identifiers:

* Batch Number (simple daily incremental number)
* Order Number (simple daily incremental number)

Avoid:

* Long UUIDs
* Complex IDs

Example:

* Batch #21
* Order #104

---

## B. Cooking Timer

When cooking starts:

* Auto-start 15 minute timer
* Visual countdown
* Voice reminders near completion

States:

* Waiting
* Cooking
* Packed
* Ready for Pickup
* Picked Up
* Delivered

---

## C. Menu Details

Collapsed by default.

Can be opened:

* Manually
* Via Voice AI

Menu Details Include:

* Ingredients
* Steps
* Oven instructions
* Packaging instructions
* Special notes

---

## D. Voice AI Assistant

Voice-first operational assistant integrated directly into dashboard.

### Supported Commands

Navigation:

* "Show next order"
* "Open menu details"
* "Repeat recipe steps"

Completion:

* "Mark batch complete"
* "Mark order packed"
* "Ready for pickup"

Information:

* "How many pending orders?"
* "What is next after this?"
* "Describe recipe step 3"

---

## E. Pickup & Delivery Visibility

Since only 2 staff exist, cooking staff also need lightweight pickup visibility.

Display:

* Ready for pickup orders
* Delivery agent reached/not reached
* Pickup pending duration

Token IDs:

* Use simple 4-digit OTPs
* Easy to read and speak

Example:

* Token 4821

---

# 2. Admin Dashboard

## Store Selector

Admins can:

* Switch stores from top navigation
* View store-specific operational metrics

---

## Admin Metrics

Display prominently at top:

### Daily Metrics

* Total Live Orders
* Total Delivered Orders
* Total Revenue
* Average Delivery Time
* Average Kitchen Prep Time

---

## Operational Visibility

Admin can monitor:

* Current active batches
* Staff utilization
* Delayed orders
* Delivery bottlenecks
* Batch efficiency

---

# Order Flow

## 1. Order Intake

Orders may originate from:

* Native App
* Swiggy
* Zomato

Captured:

* Order Number
* Store ID
* Recipe Details
* Delivery Address
* Provider
* Token ID

---

## 2. Store Assignment

System identifies:

* Closest store
* Store capacity
* Estimated delivery time

Order assigned automatically.

---

## 3. AI Assignment Engine

AI determines:

* JIT assignment
* Batch assignment
* Staff assignment

Goal:

* Reduce context switching
* Improve throughput
* Maintain SLA

---

## 4. Cooking

Staff receives:

* Recipe
* Timer
* Queue position
* Voice assistance

---

## 5. Completion

Staff marks:

* Batch complete
  OR
* Order complete

Supported via:

* Manual tap
* Voice command

---

## 6. Pickup

Delivery agent verifies pickup using:

* Token OTP
* Order Number

Dashboard updates:

* Picked Up

---

## 7. Delivery

Order marked:

* Delivered

Visible on:

* Staff dashboard
* Admin dashboard
* Customer app

---

# Assignment Logic

## Staff Assignment Priorities

Priority order:

1. Continue same recipe if already active
2. Batch similar recipes if within batch window
3. Balance workload between staff
4. Respect delivery SLA

---

# UI Requirements

## Design Requirements

* Tablet optimized
* Large typography
* Minimal interaction steps
* High visibility timers
* Kitchen-safe UX
* Fast status updates

---

# Non Functional Requirements

## Performance

* Real-time updates
* Sub-second dashboard refresh

## Reliability

* Dashboard should continue operating during temporary network instability

## Accessibility

* Voice-first support
* High contrast readability
* Large clickable elements

---

# Frontend Scope

## Note

Only frontend implementation is required.

Do NOT implement:

* Backend
* Database
* Authentication APIs
* AI backend services

Frontend should:

* Simulate operational flows
* Demonstrate dashboard states
* Include mock AI interactions
* Match Figma wireframes closely

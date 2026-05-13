# Pizza Delivery Kitchen Dashboard

## Context

We are a pizza delivery chain with existing kitchens - we are launching an app soon to collect online delivery. This PRD is for the Kitchen Dashboard where the Orders Come In and assigned to the Staff and marked done when completed.

## Key Elements

1. Batch Collection
    - Vertically split this section for Staff 1 and Staff 2
    - Each section has a Batch and Menu sub section, describing sub section
        - This section shows Batches (Batch ID) of Pizzas. Each batch has multiple orders (Order ID) - of the same recipe
        - Different Batches can have different recipes (we are sorting recipes by batches for efficiency)
        - Each Order has a Token ID
        - When Cooking is in process show a timer on batch say 15 mins autocontinues
        - Minimimize the menu details for each staff section by default
    - Each individual Staff section has a Batch Completed CTA that automatically switches to next batch post 15 min timer
2. Batch Assignment to Staff + Show Menu Details
    - There are two staff members. As soon as a new batch occurs assign it to one Staff Member (Yann or Pranav)    
3. Status Section
    - Part 1: Display list of Orders ready to collect with Token ID (do not show clubbing with batches here)
    - Part 2: Delivery Agent Status displays if a agent with particular Token ID is available/reached or not
4. Mark Batch/Order Completed
5. Orders Ready for Pickup
6. Orders Delivered

### Requirements

Note: Do not code any backend, only code the frontend as per the requirements and the figma wireframe.

Create the basic structure of above key elements within the dashboard screen.
Refer to this wireframe for basic structure of the dashboard: [Dash Wireframe](../pizza-kitchen-dash/wireframe-2.png)


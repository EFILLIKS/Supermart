# Freshly — Grocery Supermart AI

A responsive React + TypeScript grocery commerce prototype with four role-based portals.

## Run locally

```bash
npm install
npm run dev
```

Vite prints the local development URL (normally http://localhost:5173).

## Stack

- React + TypeScript + Vite
- Tailwind-ready custom CSS design system
- Framer Motion for transitions and interaction
- Recharts for dashboard analytics
- Lucide React icons

## Demo portals

Use the workspace selector in the left sidebar to switch between:

### Customer
- Discover storefront with promotional hero and categories
- Product catalogue, product filtering and add-to-basket interactions
- AI shopping assistant demo chat
- My orders
- Wishlist placeholder
- Saved address and payment preference cards

### Admin
- Overview dashboard with KPIs, revenue chart, order distribution and recent orders
- Products catalogue management screen
- Inventory screen
- Orders screen
- Customers screen
- Delivery operations screen
- Analytics screen
- Settings screen
- Quick-create modal and searchable demo tables

### Sales
- Point of sale with product catalogue and current basket
- Sales history
- Customer/transaction reporting view

### Delivery
- My deliveries dashboard and route illustration
- Earnings summary
- Delivery history

## Notes

- All data is local demo data. No backend, real customer accounts, payment processing, live GPS, barcode scanning, or production AI inference is connected.
- The Freshly AI assistant is a UI prototype with canned demo responses.
- Cart state is held in React component state and resets on refresh.
- Connect a backend such as Supabase before using this for a real store.
- Add server-side authorization and validation before exposing admin, sales or delivery operations.
- Respect reduced-motion preferences.

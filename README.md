# Grocery Supermart AI

A grocery business in one React app: a customer shop, an admin back office, a sales billing counter and a delivery portal, all working from the same data.

It runs in two modes:

| | Demo mode (default) | Live mode |
|---|---|---|
| Turned on by | No environment variables | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| Data | This browser's `localStorage` | Your Supabase Postgres database |
| Sign-in | Pick a demo persona, no password | Supabase email and password |
| Access control | Route guards only, so **not secure** | Row level security on the server |

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints. To watch the portals work together, open two tabs and sign in as different personas: an order placed in one tab appears in the other.

**Try one order end to end**

1. Sign in as the **Customer**, fill a basket and check out. Coupon `WEEKEND10` works. UPI ID `fail@test` previews a declined payment.
2. Sign in as the **Admin**. In Orders, mark the order confirmed, then packed, then assign Imran Qureshi.
3. Sign in as **Delivery**. Open the drop and tap "I have collected it".
4. The **Customer** now sees a 6-digit code on the order page. The driver enters it to finish. Demo mode also shows the code on the driver's screen so that you can test alone.

Admin Settings has a button to reset the demo data.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_schema.sql`, then `supabase/seed.sql`. Or use the Supabase CLI with `supabase db push`.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
4. Restart `npm run dev` and create an account in the app. Every new account is a `CUSTOMER`.
5. Promote your first admin in the SQL editor:

   ```sql
   update public.users set role = 'ADMIN' where email = 'you@example.com';
   ```

6. From then on, have staff sign up, then set their role in **Admin > Employees and roles**. A staff member needs an `employees` row for their code and department to show. Without one, those columns show `-`.

The seed contains only the catalogue and coupons, with no people or orders, so a live store starts empty.

## Security model

Clients can read what policies allow, but they cannot write orders, payments or stock directly. Every such change goes through a `SECURITY DEFINER` function that recomputes the numbers on the server.

- Sign-up always creates a `CUSTOMER`. Metadata sent by the client cannot choose a role.
- Only an admin can change a role, and not their own.
- Checkout takes prices from the database, never from the browser.
- Stock is decremented under a row lock, and each change writes a ledger entry.
- Sales staff see in-store orders only. Drivers see only orders assigned to them, and have no access to the customer table.
- A delivery code is readable only by the customer who owns the order. Five wrong attempts lock it.

`npm run test:db` runs the real migration on PGlite (Postgres compiled to WebAssembly) and tries to break these rules as each role.

## What is simulated

These are clearly labelled in the interface as well.

- **AI.** No model is connected. The assistant is a keyword and tag matcher over the live catalogue. Recommendations, sales insights and stock forecasts are real calculations on your orders (purchase frequency and a 28-day moving average), but they are not AI. To connect a provider, implement `AssistantProvider` in `src/lib/ai.ts` behind a server function, so that the API key never reaches the browser.
- **Payments.** No gateway is connected and no money moves. In demo mode, online orders show as paid. In live mode they stay `PENDING`, and only cash on delivery and staff-recorded in-store sales become `PAID`. A real gateway needs a server webhook to mark payments as paid.
- **Maps.** The map is an original illustration. The marker shows an order's status, not a GPS position. The driver's Navigate button opens real directions in Google Maps.
- **Barcode scanning.** USB and Bluetooth scanners work because they type like a keyboard. The Test scan button simulates one. There is no camera scanning.

## Images

Every image in `public/images` is original SVG artwork made for this project by `scripts/generate-art.mjs` (`npm run art`). Package brands such as Verdant Dairy and Harvest Row are invented. There is no stock art and no real branding.

These are illustrations, not photographs. To use your own photos, set a product's image path or URL in **Admin > Products**, or replace the catalogue paths in `src/data/catalog.ts`.

## Motion

Animation uses Framer Motion and respects the visitor's "reduce motion" setting throughout. It includes scroll-linked parallax and a pinned order journey on the landing page, cursor-following produce, products that fly into the basket, shared-element product transitions, animated filtering, count-up figures, route drawing on the map, a scanner sweep, a receipt that feeds out of the printer, and a confetti burst on success.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build for production |
| `npm run test:db` | Database security tests on PGlite |
| `npm run test:e2e` | One order through all four portals in Chrome, then every route on desktop and mobile. Set `SHOTS=<folder>` to save screenshots |
| `npm run art` | Regenerate the images |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from the catalogue |

## Layout

```
src/pages/          landing, login, and the shop, admin, sales and delivery portals
src/components/     motion toolkit, shared components, charts, map, invoice, assistant
src/components/ui/  shadcn/ui components
src/store/          shared state, with demo and Supabase paths for each action
src/lib/            pricing, Supabase backend, analytics, assistant rules
src/data/           catalogue and demo seed
supabase/           schema, policies, functions and seed
```

The earlier prototype is kept in `.archive/prototype-v1`.

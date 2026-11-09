// Runs the real migration on PGlite (Postgres compiled to WASM) and attacks it as each role.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const IDS = {
  admin: "00000000-0000-4000-8000-000000000001",
  sales: "00000000-0000-4000-8000-000000000002",
  driver: "00000000-0000-4000-8000-000000000003",
  driver2: "00000000-0000-4000-8000-000000000004",
  alice: "00000000-0000-4000-8000-000000000005",
  bob: "00000000-0000-4000-8000-000000000006",
};

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, phone text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
await db.exec(readFileSync(new URL("../supabase/migrations/0001_schema.sql", import.meta.url), "utf8"));

// A hostile sign-up asking for ADMIN through metadata must still become a CUSTOMER.
for (const [name, id] of Object.entries(IDS)) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id, `${name}@test.dev`, JSON.stringify({ full_name: name, role: "ADMIN" })]);
}
await db.exec(`
  update public.users set role = 'ADMIN' where email = 'admin@test.dev';
  update public.users set role = 'SALES' where email = 'sales@test.dev';
  update public.users set role = 'DELIVERY' where email in ('driver@test.dev', 'driver2@test.dev');
  insert into public.categories (id, slug, name) values ('10000000-0000-4000-8000-000000000001', 'fruits', 'Fruits');
  insert into public.products (id, category_id, slug, barcode, name, brand, unit, price, mrp, tax_rate) values
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'apple', '111', 'Apple', 'X', '1 kg', 200, 220, 0),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'choc', '222', 'Chocolate', 'X', '100 g', 118, 130, 18);
  insert into public.inventory (product_id, quantity) values ('20000000-0000-4000-8000-000000000001', 10), ('20000000-0000-4000-8000-000000000002', 10);
  insert into public.coupons (code, kind, value, min_order) values ('SAVE10', 'PERCENT', 10, 100);
  insert into public.addresses (id, customer_id, line1, city, state, postal_code)
    select '30000000-0000-4000-8000-000000000001', id, '1 Lake Rd', 'Pune', 'MH', '411001' from public.customers where email = 'alice@test.dev';
  insert into public.addresses (id, customer_id, line1, city, state, postal_code)
    select '30000000-0000-4000-8000-000000000002', id, '2 Hill Rd', 'Pune', 'MH', '411002' from public.customers where email = 'bob@test.dev';
`);

const APPLE = "20000000-0000-4000-8000-000000000001";
const CHOC = "20000000-0000-4000-8000-000000000002";
const ALICE_ADDR = "30000000-0000-4000-8000-000000000001";
const BOB_ADDR = "30000000-0000-4000-8000-000000000002";

async function as(who, sql, params = []) {
  const role = who === "anon" ? "anon" : "authenticated";
  const uid = who === "anon" ? "" : IDS[who];
  await db.exec(`set test.uid = '${uid}'; set role ${role};`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role; set test.uid = '';`);
  }
}

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  pass  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
};
const denied = async (name, who, sql, params) => {
  try {
    const r = await as(who, sql, params);
    // RLS hides rows rather than raising: zero affected rows is also a denial.
    ok(name, (r.affectedRows ?? 0) === 0 && r.rows.length === 0, `-> allowed: ${JSON.stringify(r.rows).slice(0, 120)} affected=${r.affectedRows}`);
  } catch (e) {
    ok(name, true);
  }
};
const items = (...pairs) => JSON.stringify(pairs.map(([product_id, quantity]) => ({ product_id, quantity })));
const scalar = async (sql, params) => Object.values((await db.query(sql, params)).rows[0])[0];

console.log("\nIdentity");
ok("sign-up metadata cannot grant a role", (await scalar(`select role::text from public.users where email='bob@test.dev'`)) === "CUSTOMER");
await denied("customer cannot promote themselves", "alice", `update public.users set role='ADMIN' where id=$1 returning id`, [IDS.alice]);
await denied("sales cannot promote themselves", "sales", `update public.users set role='ADMIN' where id=$1 returning id`, [IDS.sales]);
await denied("admin cannot change their own role", "admin", `update public.users set role='CUSTOMER' where id=$1 returning id`, [IDS.admin]);
ok("customer sees only their own user row", (await as("alice", `select id from public.users`)).rows.length === 1);
ok("admin can change another user's role", (await as("admin", `update public.users set role='SALES' where id=$1 returning role`, [IDS.driver2])).rows.length === 1);
await as("admin", `update public.users set role='DELIVERY' where id=$1`, [IDS.driver2]);

console.log("\nCatalogue");
ok("anon can browse products", (await as("anon", `select id from public.products`)).rows.length === 2);
await denied("anon cannot read orders", "anon", `select id from public.orders`);
await denied("anon cannot call place_order", "anon", `select public.place_order($1::jsonb, $2, 'UPI')`, [items([APPLE, 1]), ALICE_ADDR]);
await denied("customer cannot change a price", "alice", `update public.products set price=1 where id=$1 returning id`, [APPLE]);
await denied("sales cannot change a price", "sales", `update public.products set price=1 where id=$1 returning id`, [APPLE]);
await denied("customer cannot edit inventory", "alice", `update public.inventory set quantity=999 where product_id=$1 returning product_id`, [APPLE]);
await denied("admin cannot bypass the stock ledger", "admin", `update public.inventory set quantity=999 where product_id=$1 returning product_id`, [APPLE]);
await denied("customer cannot adjust stock", "alice", `select public.adjust_stock($1, 100, 'RESTOCK')`, [APPLE]);
await denied("internal take_stock is not callable", "alice", `select public.take_stock($1::jsonb, gen_random_uuid())`, [items([APPLE, 1])]);
await denied("internal release_stock is not callable", "admin", `select public.release_stock(gen_random_uuid())`);

console.log("\nCheckout");
await denied("cannot forge an order row directly", "alice", `insert into public.orders (customer_name, channel, subtotal, total) values ('x','ONLINE',0,0) returning id`);
await denied("cannot use someone else's address", "alice", `select public.place_order($1::jsonb, $2, 'UPI')`, [items([APPLE, 1]), BOB_ADDR]);
await denied("cannot order more than stock", "alice", `select public.place_order($1::jsonb, $2, 'UPI')`, [items([APPLE, 11]), ALICE_ADDR]);
await denied("cannot order a negative quantity", "alice", `select public.place_order($1::jsonb, $2, 'UPI')`, [items([APPLE, -3]), ALICE_ADDR]);
ok("failed checkout leaves stock untouched", (await scalar(`select quantity from public.inventory where product_id=$1`, [APPLE])) === 10);
ok("failed checkout leaves no order behind", (await scalar(`select count(*)::int from public.orders`)) === 0);

const oid = Object.values((await as("alice", `select public.place_order($1::jsonb, $2, 'COD', 'save10', 'Today 6-8pm')`, [items([APPLE, 2], [CHOC, 1]), ALICE_ADDR])).rows[0])[0];
const order = (await db.query(`select subtotal::float8, discount::float8, tax::float8, delivery_fee::float8, total::float8 from public.orders where id=$1`, [oid])).rows[0];
ok("server computes subtotal from its own prices", order.subtotal === 518, JSON.stringify(order));
ok("server applies the coupon", order.discount === 51.8, JSON.stringify(order));
ok("server computes inclusive GST", order.tax === 16.2, JSON.stringify(order));
ok("server computes the total", order.total === 466.2 + 39, JSON.stringify(order));
ok("stock was decremented", (await scalar(`select quantity from public.inventory where product_id=$1`, [APPLE])) === 8);
ok("sale wrote a ledger entry", (await scalar(`select count(*)::int from public.stock_movements where order_id=$1 and reason='SALE'`, [oid])) === 2);
ok("online payment is not auto-marked paid", (await scalar(`select status::text from public.payments where order_id=$1`, [oid])) === "PENDING");

console.log("\nOrder isolation");
ok("owner can read their order", (await as("alice", `select id from public.orders`)).rows.length === 1);
await denied("another customer cannot read it", "bob", `select id from public.orders`);
await denied("another customer cannot read its items", "bob", `select id from public.order_items`);
await denied("another customer cannot read its OTP", "bob", `select code from public.delivery_otps`);
await denied("sales cannot read online orders", "sales", `select id from public.orders where channel='ONLINE'`);
await denied("unassigned driver cannot read it", "driver", `select id from public.orders`);
await denied("customer cannot rewrite their total", "alice", `update public.orders set total=1 where id=$1 returning id`, [oid]);
await denied("customer cannot mark their payment paid", "alice", `update public.payments set status='PAID' where order_id=$1 returning id`, [oid]);
await denied("customer cannot edit another customer's address", "alice", `update public.addresses set city='X' where id=$1 returning id`, [BOB_ADDR]);
const driverSees = (await as("driver", `select user_id from public.customers`)).rows;
ok("driver sees only their own customer row", driverSees.length === 1 && driverSees[0].user_id === IDS.driver, JSON.stringify(driverSees));
await denied("customer cannot award themselves points", "alice", `update public.customers set loyalty_points=99999 where user_id=$1 returning id`, [IDS.alice]);
ok("customer can still edit their contact details", (await as("alice", `update public.customers set phone='9000000000' where user_id=$1 returning id`, [IDS.alice])).rows.length === 1);
const aliceCustomer = await scalar(`select id from public.customers where user_id=$1`, [IDS.alice]);
await as("alice", `insert into public.reviews (product_id, customer_id, author_name, rating, body) values ($1, $2, 'The CEO', 5, 'great')`, [APPLE, aliceCustomer]);
ok("review author cannot be spoofed", (await scalar(`select author_name from public.reviews where customer_id=$1`, [aliceCustomer])) === "alice");
const bobCustomer = await scalar(`select id from public.customers where user_id=$1`, [IDS.bob]);
await denied("cannot review as someone else", "alice", `insert into public.reviews (product_id, customer_id, author_name, rating, body) values ($1, $2, 'x', 1, 'bad') returning id`, [CHOC, bobCustomer]);

console.log("\nDelivery");
await denied("customer cannot advance an order", "alice", `select public.update_order_status($1, 'CONFIRMED')`, [oid]);
await denied("invalid transition is refused", "admin", `select public.update_order_status($1, 'DELIVERED')`, [oid]);
await as("admin", `select public.update_order_status($1, 'CONFIRMED')`, [oid]);
await denied("customer cannot cancel once preparing", "alice", `select public.cancel_my_order($1)`, [oid]);
await as("admin", `select public.assign_driver($1, $2)`, [oid, IDS.driver]);
await denied("cannot assign to a non-driver", "admin", `select public.assign_driver($1, $2)`, [oid, IDS.alice]);
await denied("driver cannot pick up before packing", "driver", `select public.driver_pick_up($1)`, [oid]);
await as("admin", `select public.update_order_status($1, 'PACKED')`, [oid]);
await denied("a different driver cannot pick it up", "driver2", `select public.driver_pick_up($1)`, [oid]);
await as("driver", `select public.driver_pick_up($1)`, [oid]);
ok("assigned driver can now read the order", (await as("driver", `select id from public.orders`)).rows.length === 1);
await denied("driver cannot read the OTP", "driver", `select code from public.delivery_otps`);
await denied("other driver cannot read the order", "driver2", `select id from public.orders`);
const code = (await as("alice", `select code from public.delivery_otps where order_id=$1`, [oid])).rows[0].code;
ok("customer can read their OTP, 6 digits", /^\d{6}$/.test(code), code);
await denied("other driver cannot confirm", "driver2", `select public.confirm_delivery($1, $2)`, [oid, code]);
const wrong = code === "000000" ? "111111" : "000000";
ok("wrong OTP returns false", Object.values((await as("driver", `select public.confirm_delivery($1, $2)`, [oid, wrong])).rows[0])[0] === false);
ok("wrong OTP is counted", (await scalar(`select attempts from public.delivery_otps where order_id=$1`, [oid])) === 1);
ok("order is still undelivered", (await scalar(`select status::text from public.orders where id=$1`, [oid])) === "OUT_FOR_DELIVERY");
ok("right OTP confirms", Object.values((await as("driver", `select public.confirm_delivery($1, $2)`, [oid, code])).rows[0])[0] === true);
ok("order is delivered", (await scalar(`select status::text from public.orders where id=$1`, [oid])) === "DELIVERED");
ok("COD is paid on delivery", (await scalar(`select status::text from public.payments where order_id=$1`, [oid])) === "PAID");

console.log("\nOTP brute force");
const o2 = Object.values((await as("alice", `select public.place_order($1::jsonb, $2, 'UPI')`, [items([APPLE, 1]), ALICE_ADDR])).rows[0])[0];
await as("admin", `select public.update_order_status($1, 'CONFIRMED')`, [o2]);
await as("admin", `select public.update_order_status($1, 'PACKED')`, [o2]);
await as("admin", `select public.assign_driver($1, $2)`, [o2, IDS.driver]);
await as("driver", `select public.driver_pick_up($1)`, [o2]);
const realCode = await scalar(`select code from public.delivery_otps where order_id=$1`, [o2]);
const bad = realCode === "000000" ? "111111" : "000000";
for (let i = 0; i < 5; i++) await as("driver", `select public.confirm_delivery($1, $2)`, [o2, bad]);
await denied("locked out after 5 wrong codes, even with the right one", "driver", `select public.confirm_delivery($1, $2)`, [o2, realCode]);

console.log("\nPOS");
await denied("customer cannot ring up a sale", "alice", `select public.create_pos_sale($1::jsonb, 'CASH')`, [items([APPLE, 1])]);
await denied("driver cannot ring up a sale", "driver", `select public.create_pos_sale($1::jsonb, 'CASH')`, [items([APPLE, 1])]);
await denied("sales discount is capped", "sales", `select public.create_pos_sale($1::jsonb, 'CASH', 90)`, [items([APPLE, 1])]);
const sale = Object.values((await as("sales", `select public.create_pos_sale($1::jsonb, 'CASH', 10)`, [items([CHOC, 1])])).rows[0])[0];
ok("sale total honours discount", (await scalar(`select total::float8 from public.orders where id=$1`, [sale])) === 106.2);
ok("sale is paid and complete", (await scalar(`select status::text from public.payments where order_id=$1`, [sale])) === "PAID");
ok("sales can read their POS sale", (await as("sales", `select id from public.orders where id=$1`, [sale])).rows.length === 1);
ok("sales can look up customers", (await as("sales", `select id from public.customers`)).rows.length > 0);

console.log("\nCancellation");
const o3 = Object.values((await as("bob", `select public.place_order($1::jsonb, $2, 'UPI')`, [items([CHOC, 3]), BOB_ADDR])).rows[0])[0];
const before = await scalar(`select quantity from public.inventory where product_id=$1`, [CHOC]);
await denied("another customer cannot cancel it", "alice", `select public.cancel_my_order($1)`, [o3]);
await as("bob", `select public.cancel_my_order($1)`, [o3]);
ok("cancelling restores stock", (await scalar(`select quantity from public.inventory where product_id=$1`, [CHOC])) === before + 3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

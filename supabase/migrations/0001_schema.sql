-- Grocery Supermart AI: schema, row level security and transactional RPCs.
-- Rule of thumb: clients may READ what policies allow, but every money or stock
-- changing write goes through a SECURITY DEFINER function that recomputes the numbers.

create type public.app_role as enum ('ADMIN', 'SALES', 'DELIVERY', 'CUSTOMER');
create type public.order_status as enum ('PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED');
create type public.order_channel as enum ('ONLINE', 'POS');
create type public.payment_method as enum ('UPI', 'CARD', 'COD', 'CASH', 'ONLINE');
create type public.payment_status as enum ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
create type public.assignment_status as enum ('ASSIGNED', 'PICKED_UP', 'DELIVERED', 'FAILED');
create type public.movement_reason as enum ('SALE', 'RESTOCK', 'RETURN', 'DAMAGE', 'ADJUSTMENT');
create type public.coupon_kind as enum ('PERCENT', 'FLAT');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'CUSTOMER',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.employees (
  user_id uuid primary key references public.users (id) on delete cascade,
  employee_code text not null unique,
  department text not null,
  shift text not null default 'Morning',
  hired_on date not null default current_date
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users (id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  created_at timestamptz not null default now()
);
create index customers_phone_idx on public.customers (phone);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text not null default 'Home',
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  is_default boolean not null default false
);
create index addresses_customer_idx on public.addresses (customer_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  slug text not null unique,
  barcode text not null unique,
  name text not null,
  brand text not null,
  description text not null default '',
  unit text not null,
  price numeric(10, 2) not null check (price >= 0),
  mrp numeric(10, 2) not null check (mrp >= 0),
  tax_rate numeric(4, 2) not null default 0 check (tax_rate between 0 and 40),
  image_url text,
  origin text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);

create table public.inventory (
  product_id uuid primary key references public.products (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reorder_level integer not null default 10 check (reorder_level >= 0),
  updated_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  description text not null default '',
  kind public.coupon_kind not null,
  value numeric(10, 2) not null check (value > 0),
  min_order numeric(10, 2) not null default 0,
  max_discount numeric(10, 2),
  usage_limit integer,
  used_count integer not null default 0,
  ends_at timestamptz,
  is_active boolean not null default true
);

create sequence public.order_number_seq start 10001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SM-' || nextval('public.order_number_seq')),
  customer_id uuid references public.customers (id) on delete set null,
  -- Snapshots: an order keeps what was true when placed, and lets drivers work
  -- without any access to the customers or addresses tables.
  customer_name text not null,
  customer_phone text,
  address_snapshot jsonb,
  channel public.order_channel not null,
  status public.order_status not null default 'PLACED',
  subtotal numeric(10, 2) not null,
  discount numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  coupon_id uuid references public.coupons (id) on delete set null,
  slot text,
  created_by uuid references public.users (id) on delete set null,
  placed_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_placed_idx on public.orders (placed_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  unit text not null,
  image_url text,
  unit_price numeric(10, 2) not null,
  tax_rate numeric(4, 2) not null,
  quantity integer not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  actor uuid references public.users (id) on delete set null,
  at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'PENDING',
  amount numeric(10, 2) not null,
  reference text,
  paid_at timestamptz
);
create index payments_order_idx on public.payments (order_id);

create table public.delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  driver_id uuid not null references public.users (id) on delete restrict,
  status public.assignment_status not null default 'ASSIGNED',
  earning numeric(10, 2) not null default 45,
  failure_reason text,
  assigned_at timestamptz not null default now(),
  picked_up_at timestamptz,
  delivered_at timestamptz
);
create index delivery_assignments_driver_idx on public.delivery_assignments (driver_id);

-- Kept apart from orders so that a driver can never read the code they must collect.
create table public.delivery_otps (
  order_id uuid primary key references public.orders (id) on delete cascade,
  code text not null,
  attempts integer not null default 0
);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  delta integer not null,
  reason public.movement_reason not null,
  note text,
  order_id uuid references public.orders (id) on delete set null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

create table public.wishlists (
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz not null default now(),
  unique (product_id, customer_id)
);

create table public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'Grocery Supermart AI',
  support_phone text not null default '',
  free_delivery_over numeric(10, 2) not null default 499,
  delivery_fee numeric(10, 2) not null default 39,
  driver_payout numeric(10, 2) not null default 45
);
insert into public.store_settings default values;

/* ---------- Identity helpers ---------- */

create function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.users where id = auth.uid() and is_active
$$;

create function public.current_customer_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.customers where user_id = auth.uid()
$$;

-- Sign-up always creates a CUSTOMER. Client-supplied metadata cannot choose a role.
create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, full_name, phone)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.phone);
  insert into public.customers (user_id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email, new.phone);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Only an admin (or a trusted server context with no end user) may change role or active flag.
create function public.guard_user_privileges() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and auth.uid() is not null
     and public.current_app_role() is distinct from 'ADMIN' then
    raise exception 'Only an administrator can change roles' using errcode = '42501';
  end if;
  if new.id = auth.uid() and new.role is distinct from old.role then
    raise exception 'Administrators cannot change their own role' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger guard_user_privileges before update on public.users
  for each row execute function public.guard_user_privileges();

/* ---------- Row level security ---------- */

alter table public.users enable row level security;
alter table public.employees enable row level security;
alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.payments enable row level security;
alter table public.delivery_assignments enable row level security;
alter table public.delivery_otps enable row level security;
alter table public.stock_movements enable row level security;
alter table public.wishlists enable row level security;
alter table public.reviews enable row level security;
alter table public.store_settings enable row level security;

create policy users_read on public.users for select to authenticated
  using (id = auth.uid() or public.current_app_role() = 'ADMIN');
create policy users_update on public.users for update to authenticated
  using (id = auth.uid() or public.current_app_role() = 'ADMIN')
  with check (id = auth.uid() or public.current_app_role() = 'ADMIN');

create policy employees_read on public.employees for select to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'ADMIN');
create policy employees_admin on public.employees for all to authenticated
  using (public.current_app_role() = 'ADMIN') with check (public.current_app_role() = 'ADMIN');

create policy customers_read on public.customers for select to authenticated
  using (user_id = auth.uid() or public.current_app_role() in ('ADMIN', 'SALES'));
create policy customers_update_self on public.customers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy customers_staff_insert on public.customers for insert to authenticated
  with check (public.current_app_role() in ('ADMIN', 'SALES') and user_id is null);
create policy customers_admin_update on public.customers for update to authenticated
  using (public.current_app_role() = 'ADMIN') with check (public.current_app_role() = 'ADMIN');

create policy addresses_owner on public.addresses for all to authenticated
  using (customer_id = public.current_customer_id()) with check (customer_id = public.current_customer_id());
create policy addresses_admin_read on public.addresses for select to authenticated
  using (public.current_app_role() = 'ADMIN');

create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or public.current_app_role() = 'ADMIN');
create policy categories_admin on public.categories for all to authenticated
  using (public.current_app_role() = 'ADMIN') with check (public.current_app_role() = 'ADMIN');

create policy products_read on public.products for select to anon, authenticated
  using (is_active or public.current_app_role() in ('ADMIN', 'SALES'));
create policy products_admin on public.products for all to authenticated
  using (public.current_app_role() = 'ADMIN') with check (public.current_app_role() = 'ADMIN');

create policy inventory_read on public.inventory for select to anon, authenticated using (true);
-- Quantity changes go through adjust_stock so that each one leaves a movement record.
create policy inventory_admin_settings on public.inventory for update to authenticated
  using (public.current_app_role() = 'ADMIN') with check (public.current_app_role() = 'ADMIN');
create policy inventory_admin_insert on public.inventory for insert to authenticated
  with check (public.current_app_role() = 'ADMIN');

create policy coupons_staff_read on public.coupons for select to authenticated
  using (public.current_app_role() in ('ADMIN', 'SALES') or is_active);
create policy coupons_admin on public.coupons for all to authenticated
  using (public.current_app_role() = 'ADMIN') with check (public.current_app_role() = 'ADMIN');

create function public.can_read_order(p_order uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.current_app_role()
    when 'ADMIN' then true
    when 'SALES' then exists (select 1 from public.orders o where o.id = p_order and o.channel = 'POS')
    when 'DELIVERY' then exists (select 1 from public.delivery_assignments a where a.order_id = p_order and a.driver_id = auth.uid())
    when 'CUSTOMER' then exists (select 1 from public.orders o where o.id = p_order and o.customer_id = public.current_customer_id())
    else false
  end
$$;

create policy orders_read on public.orders for select to authenticated using (public.can_read_order(id));
create policy order_items_read on public.order_items for select to authenticated using (public.can_read_order(order_id));
create policy order_events_read on public.order_events for select to authenticated using (public.can_read_order(order_id));
create policy payments_read on public.payments for select to authenticated
  using (public.can_read_order(order_id));
create policy assignments_read on public.delivery_assignments for select to authenticated
  using (driver_id = auth.uid() or public.can_read_order(order_id));
create policy otps_customer_read on public.delivery_otps for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = public.current_customer_id()));

create policy stock_movements_read on public.stock_movements for select to authenticated
  using (public.current_app_role() = 'ADMIN');

create policy wishlists_owner on public.wishlists for all to authenticated
  using (customer_id = public.current_customer_id()) with check (customer_id = public.current_customer_id());

create policy reviews_read on public.reviews for select to anon, authenticated using (true);
create policy reviews_insert on public.reviews for insert to authenticated
  with check (customer_id = public.current_customer_id());
create policy reviews_update on public.reviews for update to authenticated
  using (customer_id = public.current_customer_id()) with check (customer_id = public.current_customer_id());
create policy reviews_admin_delete on public.reviews for delete to authenticated
  using (public.current_app_role() = 'ADMIN' or customer_id = public.current_customer_id());

create policy settings_read on public.store_settings for select to anon, authenticated using (true);
create policy settings_admin on public.store_settings for update to authenticated
  using (public.current_app_role() = 'ADMIN') with check (public.current_app_role() = 'ADMIN');

/* ---------- Transactions ---------- */

-- Prices are GST inclusive. Tax is the share of each discounted line that is GST.
create function public.price_lines(p_items jsonb, p_discount numeric, p_subtotal numeric) returns numeric
language sql immutable set search_path = '' as $$
  select coalesce(round(sum(
    (i.unit_price * i.quantity) * (1 - case when p_subtotal > 0 then p_discount / p_subtotal else 0 end)
    * i.tax_rate / (100 + i.tax_rate)
  ), 2), 0)
  from jsonb_to_recordset(p_items) as i(unit_price numeric, quantity int, tax_rate numeric)
$$;

-- Locks each product row in a stable order, checks stock, decrements, and returns priced lines.
create function public.take_stock(p_items jsonb, p_order uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  rec record;
  lines jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'The basket is empty' using errcode = 'P0001';
  end if;
  for rec in
    select (x.value ->> 'product_id')::uuid as product_id, sum((x.value ->> 'quantity')::int)::int as quantity
    from jsonb_array_elements(p_items) x group by 1 order by 1
  loop
    declare
      p public.products%rowtype;
      available int;
    begin
      if rec.quantity <= 0 then raise exception 'Quantity must be positive' using errcode = 'P0001'; end if;
      select quantity into available from public.inventory where product_id = rec.product_id for update;
      select * into p from public.products where id = rec.product_id and is_active;
      if not found or available is null then raise exception 'A product in this basket is no longer sold' using errcode = 'P0001'; end if;
      if available < rec.quantity then raise exception 'Only % left of %', available, p.name using errcode = 'P0001'; end if;
      update public.inventory set quantity = quantity - rec.quantity, updated_at = now() where product_id = rec.product_id;
      insert into public.stock_movements (product_id, delta, reason, order_id, created_by)
        values (rec.product_id, -rec.quantity, 'SALE', p_order, auth.uid());
      insert into public.order_items (order_id, product_id, name, unit, image_url, unit_price, tax_rate, quantity)
        values (p_order, p.id, p.name, p.unit, p.image_url, p.price, p.tax_rate, rec.quantity);
      lines := lines || jsonb_build_object('unit_price', p.price, 'quantity', rec.quantity, 'tax_rate', p.tax_rate);
    end;
  end loop;
  return lines;
end $$;

create function public.place_order(
  p_items jsonb, p_address_id uuid, p_method public.payment_method, p_coupon_code text default null, p_slot text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  cust public.customers%rowtype;
  addr public.addresses%rowtype;
  coup public.coupons%rowtype;
  cfg public.store_settings%rowtype;
  new_id uuid := gen_random_uuid();
  lines jsonb;
  v_subtotal numeric;
  v_discount numeric := 0;
  v_fee numeric;
begin
  select * into cust from public.customers where user_id = auth.uid();
  if not found then raise exception 'Only customers can place orders' using errcode = '42501'; end if;
  if p_method not in ('UPI', 'CARD', 'COD') then raise exception 'Unsupported payment method' using errcode = 'P0001'; end if;
  select * into addr from public.addresses where id = p_address_id and customer_id = cust.id;
  if not found then raise exception 'Choose one of your saved addresses' using errcode = 'P0001'; end if;
  select * into cfg from public.store_settings;

  insert into public.orders (id, customer_id, customer_name, customer_phone, address_snapshot, channel, subtotal, total, slot, created_by)
  values (new_id, cust.id, cust.full_name, cust.phone, to_jsonb(addr), 'ONLINE', 0, 0, p_slot, auth.uid());

  lines := public.take_stock(p_items, new_id);
  select sum((l ->> 'unit_price')::numeric * (l ->> 'quantity')::int) into v_subtotal from jsonb_array_elements(lines) l;

  if nullif(trim(p_coupon_code), '') is not null then
    select * into coup from public.coupons where code = upper(trim(p_coupon_code)) for update;
    if not found or not coup.is_active or (coup.ends_at is not null and coup.ends_at < now()) then
      raise exception 'This coupon is not valid' using errcode = 'P0001';
    end if;
    if coup.usage_limit is not null and coup.used_count >= coup.usage_limit then
      raise exception 'This coupon has been fully redeemed' using errcode = 'P0001';
    end if;
    if v_subtotal < coup.min_order then
      raise exception 'This coupon needs a minimum order of %', coup.min_order using errcode = 'P0001';
    end if;
    v_discount := case coup.kind when 'PERCENT' then round(v_subtotal * coup.value / 100, 2) else coup.value end;
    v_discount := least(v_discount, coalesce(coup.max_discount, v_discount), v_subtotal);
    update public.coupons set used_count = used_count + 1 where id = coup.id;
  end if;

  v_fee := case when v_subtotal - v_discount >= cfg.free_delivery_over then 0 else cfg.delivery_fee end;

  update public.orders set
    subtotal = v_subtotal, discount = v_discount, delivery_fee = v_fee, coupon_id = coup.id,
    tax = public.price_lines(lines, v_discount, v_subtotal), total = v_subtotal - v_discount + v_fee
  where id = new_id;

  -- No payment gateway is connected, so the server never records an online order as paid here.
  insert into public.payments (order_id, method, status, amount)
  values (new_id, p_method, 'PENDING', v_subtotal - v_discount + v_fee);
  insert into public.order_events (order_id, status, actor) values (new_id, 'PLACED', auth.uid());
  insert into public.delivery_otps (order_id, code)
  values (new_id, ((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 900000) + 100000)::text);
  return new_id;
end $$;

create function public.create_pos_sale(
  p_items jsonb, p_method public.payment_method, p_discount_percent numeric default 0, p_customer_id uuid default null, p_reference text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  cust public.customers%rowtype;
  new_id uuid := gen_random_uuid();
  lines jsonb;
  v_subtotal numeric;
  v_discount numeric;
begin
  if public.current_app_role() not in ('ADMIN', 'SALES') then raise exception 'Staff only' using errcode = '42501'; end if;
  if p_method not in ('CASH', 'UPI', 'ONLINE') then raise exception 'Unsupported payment method' using errcode = 'P0001'; end if;
  if p_discount_percent < 0 or p_discount_percent > 30 then raise exception 'Discount must be between 0 and 30 percent' using errcode = 'P0001'; end if;
  if p_customer_id is not null then select * into cust from public.customers where id = p_customer_id; end if;

  insert into public.orders (id, customer_id, customer_name, customer_phone, channel, status, subtotal, total, created_by)
  values (new_id, cust.id, coalesce(cust.full_name, 'Walk-in customer'), cust.phone, 'POS', 'COMPLETED', 0, 0, auth.uid());

  lines := public.take_stock(p_items, new_id);
  select sum((l ->> 'unit_price')::numeric * (l ->> 'quantity')::int) into v_subtotal from jsonb_array_elements(lines) l;
  v_discount := round(v_subtotal * p_discount_percent / 100, 2);

  update public.orders set subtotal = v_subtotal, discount = v_discount,
    tax = public.price_lines(lines, v_discount, v_subtotal), total = v_subtotal - v_discount
  where id = new_id;

  insert into public.payments (order_id, method, status, amount, reference, paid_at)
  values (new_id, p_method, 'PAID', v_subtotal - v_discount, p_reference, now());
  insert into public.order_events (order_id, status, actor) values (new_id, 'COMPLETED', auth.uid());
  if cust.id is not null then
    update public.customers set loyalty_points = loyalty_points + floor((v_subtotal - v_discount) / 100)::int where id = cust.id;
  end if;
  return new_id;
end $$;

-- Puts stock back for a cancelled order. Internal: not exposed to clients.
create function public.release_stock(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare it record;
begin
  for it in select product_id, quantity from public.order_items where order_id = p_order and product_id is not null order by product_id loop
    update public.inventory set quantity = quantity + it.quantity, updated_at = now() where product_id = it.product_id;
    insert into public.stock_movements (product_id, delta, reason, order_id, created_by)
      values (it.product_id, it.quantity, 'RETURN', p_order, auth.uid());
  end loop;
end $$;

create function public.update_order_status(p_order uuid, p_status public.order_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur public.order_status;
  allowed boolean;
begin
  if public.current_app_role() is distinct from 'ADMIN' then raise exception 'Admins only' using errcode = '42501'; end if;
  select status into cur from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  allowed := (cur, p_status) in (
    ('PLACED', 'CONFIRMED'), ('CONFIRMED', 'PACKED'),
    ('PLACED', 'CANCELLED'), ('CONFIRMED', 'CANCELLED'), ('PACKED', 'CANCELLED')
  );
  if not allowed then raise exception 'An order cannot move from % to %', cur, p_status using errcode = 'P0001'; end if;
  update public.orders set status = p_status where id = p_order;
  insert into public.order_events (order_id, status, actor) values (p_order, p_status, auth.uid());
  if p_status = 'CANCELLED' then
    perform public.release_stock(p_order);
    update public.payments set status = case when status = 'PAID' then 'REFUNDED'::public.payment_status else 'FAILED'::public.payment_status end where order_id = p_order;
    delete from public.delivery_assignments where order_id = p_order;
  end if;
end $$;

create function public.cancel_my_order(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare cur public.order_status;
begin
  select status into cur from public.orders where id = p_order and customer_id = public.current_customer_id() for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if cur <> 'PLACED' then raise exception 'This order is already being prepared' using errcode = 'P0001'; end if;
  update public.orders set status = 'CANCELLED' where id = p_order;
  insert into public.order_events (order_id, status, actor) values (p_order, 'CANCELLED', auth.uid());
  perform public.release_stock(p_order);
  update public.payments set status = 'FAILED' where order_id = p_order and status = 'PENDING';
end $$;

create function public.assign_driver(p_order uuid, p_driver uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur public.order_status;
  payout numeric;
begin
  if public.current_app_role() is distinct from 'ADMIN' then raise exception 'Admins only' using errcode = '42501'; end if;
  if not exists (select 1 from public.users where id = p_driver and role = 'DELIVERY' and is_active) then
    raise exception 'That user is not an active delivery partner' using errcode = 'P0001';
  end if;
  select status into cur from public.orders where id = p_order and channel = 'ONLINE' for update;
  if not found or cur not in ('CONFIRMED', 'PACKED') then raise exception 'Only confirmed or packed orders can be assigned' using errcode = 'P0001'; end if;
  select driver_payout into payout from public.store_settings;
  insert into public.delivery_assignments (order_id, driver_id, earning) values (p_order, p_driver, payout)
  on conflict (order_id) do update set driver_id = excluded.driver_id, assigned_at = now(), status = 'ASSIGNED';
end $$;

create function public.driver_pick_up(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_app_role() is distinct from 'DELIVERY' then raise exception 'Delivery partners only' using errcode = '42501'; end if;
  update public.delivery_assignments set status = 'PICKED_UP', picked_up_at = now()
    where order_id = p_order and driver_id = auth.uid() and status = 'ASSIGNED'
      and exists (select 1 from public.orders o where o.id = p_order and o.status = 'PACKED');
  if not found then raise exception 'This order is not packed and assigned to you yet' using errcode = 'P0001'; end if;
  update public.orders set status = 'OUT_FOR_DELIVERY' where id = p_order;
  insert into public.order_events (order_id, status, actor) values (p_order, 'OUT_FOR_DELIVERY', auth.uid());
end $$;

create function public.confirm_delivery(p_order uuid, p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare otp public.delivery_otps%rowtype;
begin
  if public.current_app_role() is distinct from 'DELIVERY' then raise exception 'Delivery partners only' using errcode = '42501'; end if;
  if not exists (select 1 from public.delivery_assignments where order_id = p_order and driver_id = auth.uid() and status = 'PICKED_UP') then
    raise exception 'This order is not out for delivery with you' using errcode = 'P0001';
  end if;
  select * into otp from public.delivery_otps where order_id = p_order for update;
  if not found then raise exception 'No delivery code exists for this order' using errcode = 'P0001'; end if;
  if otp.attempts >= 5 then raise exception 'Too many wrong codes. Contact the store.' using errcode = 'P0001'; end if;
  if otp.code <> trim(p_code) then
    update public.delivery_otps set attempts = attempts + 1 where order_id = p_order;
    return false;
  end if;
  update public.delivery_assignments set status = 'DELIVERED', delivered_at = now() where order_id = p_order;
  update public.orders set status = 'DELIVERED' where id = p_order;
  insert into public.order_events (order_id, status, actor) values (p_order, 'DELIVERED', auth.uid());
  update public.payments set status = 'PAID', paid_at = now() where order_id = p_order and method = 'COD';
  delete from public.delivery_otps where order_id = p_order;
  return true;
end $$;

create function public.fail_delivery(p_order uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_app_role() is distinct from 'DELIVERY' then raise exception 'Delivery partners only' using errcode = '42501'; end if;
  update public.delivery_assignments set status = 'FAILED', failure_reason = p_reason
    where order_id = p_order and driver_id = auth.uid() and status = 'PICKED_UP';
  if not found then raise exception 'This order is not out for delivery with you' using errcode = 'P0001'; end if;
  update public.orders set status = 'PACKED' where id = p_order;
  insert into public.order_events (order_id, status, actor) values (p_order, 'PACKED', auth.uid());
end $$;

create function public.adjust_stock(p_product uuid, p_delta integer, p_reason public.movement_reason, p_note text default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare result integer;
begin
  if public.current_app_role() is distinct from 'ADMIN' then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_reason = 'SALE' then raise exception 'Sales are recorded by orders' using errcode = 'P0001'; end if;
  update public.inventory set quantity = quantity + p_delta, updated_at = now()
    where product_id = p_product returning quantity into result;
  if not found then raise exception 'Product has no inventory record' using errcode = 'P0001'; end if;
  insert into public.stock_movements (product_id, delta, reason, note, created_by) values (p_product, p_delta, p_reason, p_note, auth.uid());
  return result;
end $$;

-- Quantity may only change through take_stock, release_stock or adjust_stock.
create function public.guard_inventory_quantity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.quantity is distinct from old.quantity and pg_trigger_depth() = 1 and current_user in ('authenticated', 'anon') then
    raise exception 'Use adjust_stock to change quantity' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger guard_inventory_quantity before update on public.inventory
  for each row execute function public.guard_inventory_quantity();

-- A customer may edit their contact details, but points only move through a sale or an admin.
create function public.guard_customer_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and public.current_app_role() is distinct from 'ADMIN'
     and (new.loyalty_points is distinct from old.loyalty_points or new.user_id is distinct from old.user_id) then
    raise exception 'Loyalty points cannot be edited directly' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger guard_customer_fields before update on public.customers
  for each row execute function public.guard_customer_fields();

-- The name on a review always comes from the account, never from the request.
create function public.stamp_review_author() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select full_name into new.author_name from public.customers where id = new.customer_id;
  return new;
end $$;
create trigger stamp_review_author before insert or update on public.reviews
  for each row execute function public.stamp_review_author();

/* ---------- Privileges ---------- */

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.current_app_role(), public.current_customer_id(), public.can_read_order(uuid),
  public.place_order(jsonb, uuid, public.payment_method, text, text),
  public.create_pos_sale(jsonb, public.payment_method, numeric, uuid, text),
  public.update_order_status(uuid, public.order_status),
  public.cancel_my_order(uuid),
  public.assign_driver(uuid, uuid),
  public.driver_pick_up(uuid),
  public.confirm_delivery(uuid, text),
  public.fail_delivery(uuid, text),
  public.adjust_stock(uuid, integer, public.movement_reason, text)
to authenticated;
grant execute on function public.current_app_role(), public.current_customer_id() to anon;

revoke all on public.delivery_otps from anon;
revoke all on public.order_events, public.stock_movements from anon;
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.inventory, public.reviews, public.store_settings to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

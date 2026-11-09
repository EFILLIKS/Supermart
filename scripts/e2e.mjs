// Drives the demo app in real Chrome: one order through all four portals, then every route at
// desktop and mobile width. Fails on console errors, crashes, blank pages, or sideways scrolling.
// Run: npm run test:e2e   Optional: SHOTS=<folder> saves screenshots. CHROME=<path> overrides Chrome.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const PORT = 5199;
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS;
const CHROME = process.env.CHROME ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome"].find(existsSync);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = spawn(`npx vite --port ${PORT} --strictPort`, { shell: true, stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* still starting */ }
  await sleep(500);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const problems = [];
let results = 0;
let current = "startup";
page.on("console", (m) => { if (m.type() === "error") problems.push(`[${current}] console: ${m.text().slice(0, 240)}`); });
page.on("pageerror", (e) => problems.push(`[${current}] crash: ${e.message.slice(0, 240)}`));
page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) problems.push(`[${current}] ${r.status()} ${r.url()}`); });

const pass = (name) => { results++; console.log(`  pass  ${name}`); };
const check = (name, cond, extra = "") => { if (cond) pass(name); else problems.push(`[${current}] FAILED: ${name} ${extra}`); };
const shot = async (name, full = false) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: full }); };

async function go(path) {
  current = path;
  await page.goto(BASE + path, { waitUntil: "networkidle0" });
  await sleep(350);
}

async function waitText(text, timeout = 6000) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
}

/** Clicks the first visible element of this kind whose text contains the words. */
async function click(text, selector = "button, a, [role=option], [role=menuitem], [role=radio], [role=tab]") {
  const ok = await page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((e) => (e.innerText?.includes(t) || e.getAttribute("aria-label")?.includes(t)) && e.getBoundingClientRect().width > 0 && !e.disabled);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }, text, selector);
  if (!ok) throw new Error(`Could not find "${text}" on ${page.url()}`);
  await sleep(250);
}

async function signInAs(name) {
  await go("/login");
  await click(`Sign in as ${name}`);
  await sleep(500);
}

const getState = () => page.evaluate(() => JSON.parse(localStorage.getItem("supermart-demo-v1")).state);

async function selectOption(triggerLabel, option) {
  await page.evaluate((l) => {
    const el = [...document.querySelectorAll('[role=combobox]')].find((e) => e.getAttribute("aria-label")?.includes(l));
    el.scrollIntoView({ block: "center" });
  }, triggerLabel);
  await sleep(120);
  const box = await page.evaluate((l) => {
    const r = [...document.querySelectorAll('[role=combobox]')].find((e) => e.getAttribute("aria-label")?.includes(l)).getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, triggerLabel);
  await page.mouse.click(box.x, box.y);
  await page.waitForSelector("[role=option]");
  await sleep(150);
  await click(option, "[role=option]");
  await sleep(350);
}

const typeInto = async (selector, text) => { await page.focus(selector); await page.$eval(selector, (el) => el.select()); await page.type(selector, text); };

try {
  console.log("\nLanding page");
  await go("/");
  await sleep(1600);
  await shot("01-landing-hero");
  check("hero headline renders", await page.evaluate(() => document.querySelector("h1")?.getAttribute("aria-label") !== "" && document.body.innerText.includes("supermarket")));
  const brokenImages = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  check("no broken images", brokenImages.length === 0, brokenImages.join());
  const third = await page.evaluate(() => { const hosts = [...document.querySelectorAll("img, link[rel=stylesheet], script[src]")].map((e) => e.src || e.href).filter((u) => u && !u.startsWith(location.origin)); return hosts; });
  check("every asset is self-hosted", third.length === 0, third.join());
  await page.evaluate(() => document.querySelector("#journey").scrollIntoView());
  await sleep(600);
  await page.evaluate(() => window.scrollBy(0, 1100));
  await sleep(900);
  await shot("02-landing-journey");
  await page.evaluate(() => document.querySelector("#portals").scrollIntoView());
  await sleep(900);
  await shot("03-landing-portals");

  console.log("\nCustomer places an order");
  await signInAs("Ananya Rao");
  await go("/shop");
  await sleep(700);
  await shot("04-shop-home");
  await go("/shop/products?category=fruits");
  await shot("05-catalog");
  const before = (await getState()).products.find((p) => p.slug === "royal-gala-apple").stock;
  await click("Add Royal Gala Apples to basket");
  await sleep(900);
  await shot("06-add-to-cart");
  await go("/shop/products/pomegranate");
  await shot("07-product-detail");
  await click("Add for");
  await sleep(300);
  check("basket holds 2 items", Object.keys((await getState()).cart).length === 2);
  await go("/shop/cart");
  await shot("08-cart");
  await click("Go to checkout");
  await waitText("Where should we deliver?");
  await click("Continue");
  await waitText("When suits you?");
  await click("Continue");
  await waitText("How would you like to pay?");
  await typeInto('[aria-label="Coupon code"]', "NOPE");
  await click("Apply");
  await waitText("not valid");
  pass("invalid coupon is refused");
  await typeInto('[aria-label="Coupon code"]', "WEEKEND10");
  await click("Apply");
  await waitText("saved you");
  pass("valid coupon applies");
  await click("Pay ₹", "button:not([role=radio])");
  await waitText("Enter a UPI ID");
  pass("empty UPI ID shows an error beside the field");
  await typeInto("#upi", "fail@test");
  await click("Pay ₹", "button:not([role=radio])");
  await waitText("test payment was declined", 5000);
  await shot("09-payment-declined");
  check("declined payment keeps the basket", Object.keys((await getState()).cart).length === 2);
  await typeInto("#upi", "ananya@okbank");
  await click("Pay ₹", "button:not([role=radio])");
  await waitText("Order placed", 6000);
  await sleep(500);
  await shot("10-order-placed");
  let state = await getState();
  const order = state.orders[0];
  check("order is first in the queue", order.customerName === "Ananya Rao" && order.status === "PLACED");
  check("coupon reached the order", order.couponCode === "WEEKEND10" && order.discount > 0);
  check("stock dropped", state.products.find((p) => p.slug === "royal-gala-apple").stock === before - 1);
  check("basket was emptied", Object.keys(state.cart).length === 0);

  console.log("\nAdmin moves it along");
  await signInAs("Nisha Verma");
  await sleep(1200);
  await shot("11-admin-overview");
  await go("/admin/orders");
  await typeInto('[aria-label="Search orders"]', order.number);
  await waitText(order.number);
  await sleep(300);
  await click("Mark confirmed");
  await waitText("Mark packed");
  await click("Mark packed");
  await sleep(300);
  await selectOption(`Assign driver to ${order.number}`, "Imran Qureshi");
  await shot("12-admin-orders");
  state = await getState();
  let live = state.orders.find((o) => o.id === order.id);
  check("order is packed and assigned", live.status === "PACKED" && live.assignment?.driverId === "emp-driver");

  console.log("\nDriver delivers it");
  await signInAs("Imran Qureshi");
  await go(`/delivery/orders/${order.id}`);
  await sleep(1500);
  await shot("13-delivery-collect");
  await click("I have collected it");
  await waitText("Confirm with the customer's code");
  await sleep(300);
  const otp = (await getState()).orders.find((o) => o.id === order.id).otp;
  check("customer's code exists", /^\d{6}$/.test(otp));

  await page.focus('[aria-label="Digit 1"]');
  const wrong = otp === "111111" ? "222222" : "111111";
  await page.keyboard.type(wrong, { delay: 25 });
  await click("Confirm delivery");
  await waitText("not right");
  pass("wrong code is refused");
  check("order still undelivered", (await getState()).orders.find((o) => o.id === order.id).status === "OUT_FOR_DELIVERY");
  await shot("14-delivery-wrong-code");

  console.log("\nCustomer sees the code while it is out for delivery");
  await signInAs("Ananya Rao");
  await go(`/shop/orders/${order.id}`);
  await sleep(1700);
  await shot("15-customer-tracking");
  check("customer can see their code", (await page.evaluate(() => document.body.innerText)).includes(otp));

  await signInAs("Imran Qureshi");
  await go(`/delivery/orders/${order.id}`);
  await page.focus('[aria-label="Digit 1"]');
  await page.keyboard.type(otp, { delay: 25 });
  await click("Confirm delivery");
  await waitText("Delivered");
  await sleep(600);
  await shot("16-delivered");
  live = (await getState()).orders.find((o) => o.id === order.id);
  check("right code delivers the order", live.status === "DELIVERED" && live.assignment.status === "DELIVERED");
  check("code is removed after use", !live.otp);

  console.log("\nSales rings up a sale");
  await signInAs("Rahul Pawar");
  await sleep(800);
  await shot("17-pos");
  const barcodeOf = (await getState()).products.find((p) => p.slug === "toned-milk");
  await page.focus('[aria-label="Barcode"]');
  await page.keyboard.type(barcodeOf.barcode);
  await page.keyboard.press("Enter");
  await waitText("Added Toned Milk");
  pass("barcode entry adds the product");
  await page.focus('[aria-label="Barcode"]');
  await page.keyboard.type("123");
  await page.keyboard.press("Enter");
  await waitText("not in the catalogue");
  pass("unknown barcode is refused");
  await click("10%");
  await click("Complete sale");
  await waitText("Sale complete");
  await sleep(1100);
  await shot("18-invoice");
  state = await getState();
  const sale = state.orders[0];
  check("sale reaches shared orders", sale.channel === "POS" && sale.status === "COMPLETED" && sale.discount > 0);
  check("sale lowered online stock", state.products.find((p) => p.slug === "toned-milk").stock === barcodeOf.stock - 1);

  console.log("\nAssistant is honest and useful");
  await signInAs("Ananya Rao");
  await go("/shop/assistant");
  check("assistant is labelled as simulated", (await page.evaluate(() => document.body.innerText)).includes("Simulated, no AI provider connected"));
  await typeInto('[aria-label="Message the assistant"]', "vegan breakfast under 200");
  await page.keyboard.press("Enter");
  await waitText("Add all", 5000);
  await sleep(400);
  await shot("19-assistant");
  pass("assistant returns products");

  console.log("\nSmart list");
  await go("/shop/list");
  await typeInto('[aria-label="Add a list item"]', "tomatoes");
  await page.keyboard.press("Enter");
  await waitText("Vine Tomatoes");
  pass("typed item matches a product");
  await click("Dal tadka");
  await waitText("Unpolished Toor Dal");
  await sleep(400);
  await shot("20-smart-list");

  console.log("\nMotion");
  await signInAs("Ananya Rao");
  await go("/shop/products/paneer"); // Loads the page's code, so that the next visit has no loading state.
  await go("/shop/products?category=dairy");
  const from = await page.evaluate(() => { const r = document.querySelector('a[href="/shop/products/paneer"] img').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  await page.evaluate(() => document.querySelector('a[href="/shop/products/paneer"]').click());
  const samples = [];
  for (let i = 0; i < 12; i++) {
    samples.push(await page.evaluate(() => { const r = document.querySelector('img[alt^="Malai Paneer"]')?.getBoundingClientRect(); return r ? Math.round(r.width) : null; }));
    await sleep(40);
  }
  await sleep(700);
  const settled = await page.evaluate(() => Math.round(document.querySelector('img[alt^="Malai Paneer"]').getBoundingClientRect().width));
  const seen = samples.filter((n) => n != null);
  check("product image morphs from card to detail page", seen.some((w) => w < settled - 8), `card ${Math.round(from.w)}, samples ${seen.join()}, settled ${settled}`);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await go("/");
  await sleep(300);
  const running = await page.evaluate(() => getComputedStyle(document.querySelector(".animate-marquee")).animationDuration);
  check("reduced motion stops the marquee", parseFloat(running) < 0.01, running);
  await page.emulateMediaFeatures([]);

  console.log("\nAccess control");
  await signInAs("Ananya Rao");
  await go("/admin");
  check("a customer cannot open admin", page.url().includes("/login"));
  await go("/delivery");
  check("a customer cannot open delivery", page.url().includes("/login"));
  await go(`/login?next=${encodeURIComponent("https://example.com")}&role=ADMIN`);
  await click("Sign in as Nisha Verma");
  await sleep(500);
  check("sign-in ignores an off-site redirect", page.url().startsWith(BASE));

  console.log("\nEvery route, desktop and mobile");
  const ROUTES = {
    "Ananya Rao": ["/", "/login", "/shop", "/shop/products", "/shop/products/paneer", "/shop/cart", "/shop/wishlist", "/shop/list", "/shop/assistant", "/shop/orders", "/shop/account", "/shop/checkout", "/shop/products/not-a-real-product", "/shop/orders/not-real", "/no-such-page"],
    "Nisha Verma": ["/admin", "/admin/analytics", "/admin/ai", "/admin/orders", "/admin/delivery", "/admin/products", "/admin/categories", "/admin/inventory", "/admin/customers", "/admin/employees", "/admin/coupons", "/admin/reports", "/admin/settings"],
    "Rahul Pawar": ["/sales", "/sales/invoices", "/sales/customers", "/sales/reports"],
    "Imran Qureshi": ["/delivery", "/delivery/orders", "/delivery/history"],
  };
  for (const [viewport, label] of [[{ width: 1440, height: 900 }, "desktop"], [{ width: 390, height: 844, isMobile: true, hasTouch: true }, "mobile"]]) {
    await page.setViewport(viewport);
    for (const [person, routes] of Object.entries(ROUTES)) {
      await signInAs(person);
      for (const route of routes) {
        await go(route);
        const info = await page.evaluate(() => ({ text: document.body.innerText.length, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth, boundary: document.body.innerText.includes("This page could not load") }));
        check(`${label} ${route} has content`, info.text > 40, `only ${info.text} chars`);
        check(`${label} ${route} did not crash`, !info.boundary);
        check(`${label} ${route} no sideways scroll`, info.wide <= 1, `${info.wide}px too wide`);
        const name = `${label}-${route.replace(/\W+/g, "_")}`;
        if (SHOTS) { await sleep(label === "desktop" ? 1100 : 250); await shot(name); }
      }
    }
  }
} catch (e) {
  problems.push(`[${current}] stopped: ${e.message}`);
  await shot("failure").catch(() => {});
}

// Kill the whole tree. Killing the shell first would orphan Vite and leave the port taken.
await browser.close();
if (process.platform === "win32" && server.pid) spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
else server.kill();

const unique = [...new Set(problems)];
console.log(`\n${results} checks passed, ${unique.length} problems`);
unique.forEach((p) => console.log(`  ${p}`));
process.exit(unique.length ? 1 : 0);

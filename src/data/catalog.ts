import type { Category, Coupon, Product } from "../types.ts";

/** Tuple: slug, name, brand, unit, price, mrp, taxRate, origin, stock, tags, description */
type Row = [string, string, string, string, number, number, number, string, number, string[], string];

export const CATEGORIES: Category[] = [
  ["fruits", "Fruits", "Orchard picked, ripened on schedule"],
  ["vegetables", "Vegetables", "Harvested within 36 hours"],
  ["dairy", "Dairy & Eggs", "Cold chain, farm to fridge"],
  ["bakery", "Bakery", "Baked before sunrise"],
  ["staples", "Staples & Spices", "The pantry, done properly"],
  ["snacks", "Snacks", "Better things to reach for"],
  ["beverages", "Beverages", "Chai to cold pressed"],
  ["household", "Household", "Gentler on home and planet"],
].map(([slug, name, description]) => ({ id: `cat-${slug}`, slug, name, description, image: `/images/categories/${slug}.svg`, active: true }));

const ROWS: Record<string, Row[]> = {
  fruits: [
    ["alphonso-mango", "Alphonso Mangoes", "Orchard Mill", "1 kg", 449, 549, 0, "Ratnagiri, Maharashtra", 42, ["seasonal", "vegan", "breakfast", "dessert", "kids"], "Naturally ripened, saffron-fleshed mangoes picked at the right week. Rest them a day at room temperature for the fullest aroma."],
    ["hass-avocado", "Hass Avocados", "Orchard Mill", "2 pcs", 189, 229, 0, "Wayanad, Kerala", 28, ["vegan", "keto", "healthy", "breakfast", "salad"], "Buttery, nutty and ready to eat within two days. Delivered firm so that they ripen on your counter."],
    ["strawberries", "Mahabaleshwar Strawberries", "Orchard Mill", "250 g", 129, 159, 0, "Mahabaleshwar, Maharashtra", 8, ["seasonal", "vegan", "dessert", "kids", "breakfast"], "Sweet, deep-red berries packed in a single layer so that none get bruised on the way."],
    ["banana-robusta", "Robusta Bananas", "Orchard Mill", "6 pcs", 49, 60, 0, "Theni, Tamil Nadu", 120, ["vegan", "breakfast", "kids", "healthy", "budget"], "The everyday energy fruit. Ripened gently without carbide and sorted by hand."],
    ["royal-gala-apple", "Royal Gala Apples", "Orchard Mill", "4 pcs", 169, 199, 0, "Kinnaur, Himachal Pradesh", 64, ["vegan", "kids", "healthy", "snack"], "Crisp, honey-sweet apples from high-altitude orchards. Unwaxed, so a rinse is all they need."],
    ["pomegranate", "Bhagwa Pomegranate", "Orchard Mill", "2 pcs", 159, 189, 0, "Solapur, Maharashtra", 35, ["vegan", "healthy", "salad"], "Ruby arils with a soft seed. Heavy for their size, which is how you know they are juicy."],
  ],
  vegetables: [
    ["vine-tomato", "Vine Tomatoes", "Green Acre", "500 g", 45, 58, 0, "Nashik, Maharashtra", 90, ["vegan", "dinner", "salad", "budget", "indian"], "Vine-ripened with real tomato smell. Good for a quick curry base or sliced with salt."],
    ["broccoli", "Green Broccoli", "Green Acre", "1 head", 79, 95, 0, "Ooty, Tamil Nadu", 6, ["vegan", "keto", "healthy", "dinner"], "Tight florets and a sweet stem. Steam for three minutes or roast until the edges char."],
    ["baby-spinach", "Baby Spinach", "Green Acre", "200 g", 59, 75, 0, "Bengaluru, Karnataka", 31, ["vegan", "keto", "healthy", "salad", "breakfast"], "Tender, triple-washed leaves ready for salads, smoothies and a last-minute dal."],
    ["carrot", "Ooty Carrots", "Green Acre", "500 g", 39, 49, 0, "Ooty, Tamil Nadu", 75, ["vegan", "healthy", "dinner", "kids", "budget"], "Sweet, crunchy carrots with the earth rinsed off and the flavour left on."],
    ["red-onion", "Red Onions", "Green Acre", "1 kg", 42, 55, 0, "Lasalgaon, Maharashtra", 140, ["vegan", "dinner", "indian", "budget"], "Sharp and full-bodied. Cured properly, so they store for weeks in a cool corner."],
    ["potato", "Farm Potatoes", "Green Acre", "1 kg", 38, 48, 0, "Hassan, Karnataka", 160, ["vegan", "dinner", "indian", "budget", "kids"], "All-purpose potatoes that hold their shape in curries and crisp up in the pan."],
  ],
  dairy: [
    ["toned-milk", "Toned Milk", "Verdant Dairy", "1 L", 62, 66, 0, "Anand, Gujarat", 95, ["vegetarian", "breakfast", "kids", "indian"], "Pasteurised within hours of milking, chilled all the way to your door."],
    ["greek-yogurt", "Greek Yogurt", "Verdant Dairy", "400 g", 149, 175, 5, "Pune, Maharashtra", 22, ["vegetarian", "keto", "healthy", "breakfast"], "Strained until thick, with 10 g of protein a serving and nothing added."],
    ["paneer", "Malai Paneer", "Verdant Dairy", "200 g", 95, 110, 5, "Anand, Gujarat", 4, ["vegetarian", "dinner", "keto", "indian"], "Soft, slow-set paneer that stays tender in a hot gravy."],
    ["salted-butter", "Salted Butter", "Verdant Dairy", "200 g", 118, 130, 12, "Anand, Gujarat", 48, ["vegetarian", "breakfast", "baking", "indian"], "Churned from fresh cream and lightly salted. Spreads well, browns beautifully."],
    ["free-range-eggs", "Free Range Eggs", "Verdant Dairy", "6 pcs", 89, 105, 0, "Namakkal, Tamil Nadu", 70, ["breakfast", "keto", "healthy", "kids"], "Deep-yolked eggs from hens with room to roam. Dated by the day they were laid."],
    ["cheddar", "Aged Cheddar", "Verdant Dairy", "200 g", 245, 290, 12, "Kodaikanal, Tamil Nadu", 18, ["vegetarian", "keto", "snack"], "Aged nine months for a clean, nutty bite. Superb on toast."],
  ],
  bakery: [
    ["sourdough-loaf", "Country Sourdough", "Daybreak Bakehouse", "450 g", 165, 190, 0, "Baked in-store", 14, ["vegan", "breakfast", "healthy"], "A 36-hour ferment, a blistered crust and an open, chewy crumb."],
    ["multigrain-sandwich", "Multigrain Loaf", "Daybreak Bakehouse", "400 g", 75, 85, 0, "Baked in-store", 36, ["vegetarian", "breakfast", "kids", "budget"], "Soft sandwich slices with oats, flax and sunflower seeds."],
    ["butter-croissant", "Butter Croissants", "Daybreak Bakehouse", "2 pcs", 140, 160, 18, "Baked in-store", 3, ["vegetarian", "breakfast", "dessert"], "Twenty-seven flaky layers laminated with real butter."],
    ["oat-cookies", "Oat Choc Cookies", "Daybreak Bakehouse", "6 pcs", 120, 140, 18, "Baked in-store", 26, ["vegetarian", "snack", "kids", "dessert"], "Chewy in the middle, crisp at the edge, with dark chocolate throughout."],
    ["blueberry-muffin", "Blueberry Muffins", "Daybreak Bakehouse", "2 pcs", 110, 130, 18, "Baked in-store", 19, ["vegetarian", "breakfast", "dessert", "kids"], "Bursting with whole berries under a golden, sugared top."],
  ],
  staples: [
    ["basmati-rice", "Aged Basmati Rice", "Harvest Row", "1 kg", 165, 199, 5, "Karnal, Haryana", 110, ["vegan", "dinner", "indian"], "Aged two years for long, fragrant grains that cook up separate."],
    ["whole-wheat-atta", "Stone Milled Atta", "Harvest Row", "5 kg", 289, 335, 5, "Sehore, Madhya Pradesh", 58, ["vegan", "dinner", "indian", "budget"], "Slow milled to keep the bran and flavour, for soft rotis that stay soft."],
    ["toor-dal", "Unpolished Toor Dal", "Harvest Row", "1 kg", 179, 210, 0, "Gulbarga, Karnataka", 84, ["vegan", "dinner", "indian", "healthy"], "Unpolished lentils that cook quickly into a creamy, comforting dal."],
    ["groundnut-oil", "Cold Pressed Groundnut Oil", "Orchard Mill", "1 L", 345, 399, 5, "Junagadh, Gujarat", 40, ["vegan", "dinner", "indian"], "Pressed slowly from whole peanuts. Nutty, golden and made for high heat."],
    ["turmeric-powder", "Stone Ground Turmeric", "Spice Trail", "100 g", 85, 99, 5, "Sangli, Maharashtra", 66, ["vegan", "indian", "healthy", "dinner"], "Bright, earthy turmeric with naturally high curcumin."],
    ["rock-salt", "Fine Rock Salt", "Spice Trail", "500 g", 55, 65, 0, "Mandi, Himachal Pradesh", 88, ["vegan", "indian", "budget"], "Gently mineral and finely ground, for everyday cooking."],
  ],
  snacks: [
    ["masala-makhana", "Peri Masala Makhana", "Nibble & Co", "80 g", 125, 150, 12, "Darbhanga, Bihar", 52, ["vegan", "snack", "healthy", "party"], "Roasted, never fried, and dusted in smoky peri masala."],
    ["dark-chocolate", "70% Dark Chocolate", "Cocoa Row", "80 g", 199, 240, 18, "Idukki, Kerala", 7, ["vegan", "snack", "dessert", "keto"], "Single-estate cocoa with notes of cherry and roasted coffee."],
    ["trail-mix", "Nuts & Berries Trail Mix", "Nibble & Co", "200 g", 299, 349, 12, "Blended in Pune", 33, ["vegan", "snack", "healthy", "party"], "Almonds, cashews, cranberries and pumpkin seeds, lightly salted."],
    ["banana-chips", "Kerala Banana Chips", "Nibble & Co", "150 g", 95, 115, 12, "Thrissur, Kerala", 44, ["vegan", "snack", "party", "budget"], "Thin-cut nendran bananas fried in coconut oil."],
    ["honey-granola", "Honey Almond Granola", "Morning Field", "400 g", 325, 375, 18, "Baked in Pune", 24, ["vegetarian", "breakfast", "healthy", "kids"], "Slow-baked clusters of oats, almonds and forest honey."],
    ["seed-crisps", "Baked Seed Crisps", "Morning Field", "120 g", 145, 170, 12, "Baked in Pune", 29, ["vegan", "snack", "keto", "party"], "Crackly seeded crisps that are baked, not fried, and made for dips."],
  ],
  beverages: [
    ["orange-juice", "Cold Pressed Orange", "Sunrow", "1 L", 195, 225, 12, "Nagpur, Maharashtra", 21, ["vegan", "breakfast", "healthy", "kids"], "Nagpur oranges and nothing else. Keep cold, shake well."],
    ["masala-chai", "Assam Masala Chai", "Hilltop Leaf", "250 g", 225, 260, 5, "Dibrugarh, Assam", 57, ["vegan", "breakfast", "indian"], "Strong Assam leaf with ginger, cardamom and clove."],
    ["filter-coffee", "South Indian Filter Kaapi", "Hilltop Leaf", "250 g", 275, 320, 5, "Chikmagalur, Karnataka", 39, ["vegan", "breakfast", "indian"], "A dark roast with 20% chicory, ground for the traditional filter."],
    ["tender-coconut-water", "Tender Coconut Water", "Sunrow", "500 ml", 85, 99, 12, "Pollachi, Tamil Nadu", 62, ["vegan", "healthy", "kids"], "Sterile-filtered, never heated, with no added sugar."],
    ["ginger-kombucha", "Ginger Lime Kombucha", "Sunrow", "330 ml", 165, 190, 12, "Brewed in Goa", 15, ["vegan", "healthy", "party"], "A lively, small-batch brew with real ginger heat."],
    ["spring-water", "Himalayan Spring Water", "Hilltop", "1 L", 45, 50, 18, "Solan, Himachal Pradesh", 200, ["vegan", "party", "budget"], "Bottled at source in recyclable PET."],
  ],
  household: [
    ["dish-liquid", "Lime & Neem Dish Wash", "Clean Row", "750 ml", 149, 175, 18, "Made in Pune", 47, ["home", "eco"], "Plant-derived surfactants that cut grease and rinse clean."],
    ["laundry-liquid", "Plant Based Laundry Liquid", "Clean Row", "1 L", 279, 325, 18, "Made in Pune", 38, ["home", "eco"], "Enzyme cleaning at low temperatures. Gentle on skin and fabric."],
    ["bamboo-tissue", "Bamboo Kitchen Rolls", "Clean Row", "3 rolls", 199, 235, 12, "Made in Assam", 55, ["home", "eco"], "Strong, absorbent rolls made from fast-growing bamboo."],
    ["floor-cleaner", "Lavender Floor Care", "Clean Row", "1 L", 189, 220, 18, "Made in Pune", 9, ["home", "eco"], "A pH-neutral cleaner with real lavender oil. Safe around pets."],
    ["compost-bags", "Compostable Bin Bags", "Clean Row", "30 bags", 225, 260, 12, "Made in Chennai", 41, ["home", "eco"], "Certified compostable, and strong enough for wet kitchen waste."],
    ["beeswax-wrap", "Beeswax Food Wraps", "Clean Row", "3 pcs", 349, 399, 12, "Made in Coorg", 16, ["home", "eco"], "Washable cotton wraps that replace a year of cling film."],
  ],
};

const barcodeFor = (index: number) => {
  // EAN-13 in the 890 (India) prefix with a valid check digit.
  const body = `890${String(1000000 + index * 137).padStart(9, "0")}`.slice(0, 12);
  const sum = [...body].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0);
  return body + ((10 - (sum % 10)) % 10);
};

let counter = 0;
export const PRODUCTS: Product[] = Object.entries(ROWS).flatMap(([category, rows]) =>
  rows.map(([slug, name, brand, unit, price, mrp, taxRate, origin, stock, tags, description]) => ({
    id: `p-${slug}`,
    slug,
    categoryId: `cat-${category}`,
    barcode: barcodeFor(++counter),
    name,
    brand,
    description,
    unit,
    price,
    mrp,
    taxRate,
    image: `/images/products/${slug}.svg`,
    origin,
    tags,
    active: true,
    stock,
    reorderLevel: 10,
  })),
);

export const COUPONS: Coupon[] = [
  { id: "c-welcome", code: "WELCOME15", description: "15% off your first basket, up to ₹150", kind: "PERCENT", value: 15, minOrder: 299, maxDiscount: 150, usageLimit: 500, usedCount: 214, active: true },
  { id: "c-fresh", code: "FRESH50", description: "₹50 off baskets over ₹499", kind: "FLAT", value: 50, minOrder: 499, usedCount: 88, active: true },
  { id: "c-weekend", code: "WEEKEND10", description: "10% off every weekend", kind: "PERCENT", value: 10, minOrder: 0, maxDiscount: 200, usedCount: 141, active: true },
  { id: "c-festive", code: "FESTIVE25", description: "Last season's festive offer", kind: "PERCENT", value: 25, minOrder: 999, maxDiscount: 400, usageLimit: 100, usedCount: 100, active: false },
];

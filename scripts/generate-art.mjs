// Generates the project's original image set as real SVG files in public/images.
// Every drawing here is authored for this project: no stock, no third-party art, no real brands.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "images");
let uid = 0;
const id = () => `g${++uid}`;

/** Radial "lit from upper-left" gradient: returns [defs, url]. */
function ball(light, mid, dark) {
  const i = id();
  return [`<radialGradient id="${i}" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient>`, `url(#${i})`];
}
function linear(a, b, horizontal = false) {
  const i = id();
  return [`<linearGradient id="${i}" x1="0" y1="0" x2="${horizontal ? 1 : 0}" y2="${horizontal ? 0 : 1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`, `url(#${i})`];
}
const shadow = (cx = 100, cy = 176, rx = 56, ry = 9) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#14241c" opacity=".13"/>`;
const shine = (cx, cy, rx, ry, rot = -28, o = 0.5) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${o}" transform="rotate(${rot} ${cx} ${cy})"/>`;
const leaf = (x, y, s, rot, a = "#6fbf4a", b = "#2f7d33") => {
  const [d, f] = linear(a, b);
  return `<defs>${d}</defs><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0C10-16 34-18 48-4 34 10 12 14 0 0Z" fill="${f}"/><path d="M3 0C16-4 30-5 44-4" stroke="#1f5c28" stroke-width="1.2" fill="none" opacity=".55"/></g>`;
};

/* ---------- Produce ---------- */
const round = (l, m, d, extra = "", r = 58, cy = 104) => {
  const [g, f] = ball(l, m, d);
  return `<defs>${g}</defs>${shadow()}<circle cx="100" cy="${cy}" r="${r}" fill="${f}"/>${extra}`;
};
const D = {
  "alphonso-mango": () => {
    const [g, f] = ball("#ffe680", "#fbb024", "#e8791a");
    const [b, fb] = linear("#e23d2a", "#e23d2a00");
    const body = "M34 128C28 88 62 46 110 38c32-5 56 12 60 40 4 32-24 68-64 86-34 14-66 2-72-36Z";
    return `<defs>${g}${b}</defs>${shadow(100, 176, 62, 8)}<path d="${body}" fill="${f}"/><path d="${body}" fill="${fb}" opacity=".8"/>${shine(72, 104, 17, 8, -46)}<path d="M146 44c3-8 8-13 14-15" stroke="#6b4a22" stroke-width="5" stroke-linecap="round" fill="none"/>${leaf(154, 32, 0.8, -160)}`;
  },
  "hass-avocado": () => {
    const [g, f] = ball("#5d7f3a", "#35512a", "#1c2f1b");
    const [g2, f2] = ball("#f5f3a4", "#dfe07a", "#a9c25a");
    const [g3, f3] = ball("#b0713d", "#7c4a24", "#4e2c14");
    return `<defs>${g}${g2}${g3}</defs>${shadow()}<path d="M100 26c26 0 36 30 46 62 10 34-8 80-46 80s-56-46-46-80c10-32 20-62 46-62Z" fill="${f}"/><path d="M100 38c20 0 28 26 36 52 8 28-6 66-36 66s-44-38-36-66c8-26 16-52 36-52Z" fill="${f2}"/><circle cx="100" cy="118" r="24" fill="${f3}"/>${shine(92, 110, 7, 4)}`;
  },
  strawberries: () => {
    const berry = (x, y, s, rot) => {
      const [g, f] = ball("#ff7a70", "#e0262f", "#99101f");
      let seeds = "";
      for (const [a, b] of [[-14, -10], [2, -14], [16, -8], [-20, 6], [-6, 4], [10, 6], [22, 8], [-10, 20], [6, 22], [0, 36]]) seeds += `<ellipse cx="${a}" cy="${b}" rx="1.7" ry="2.8" fill="#ffd97a"/>`;
      return `<defs>${g}</defs><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0-30C24-32 36-16 32 6 28 26 10 50 0 50-10 50-28 26-32 6-36-16-24-32 0-30Z" fill="${f}"/>${seeds}<path d="M-22-28C-12-22-6-26 0-36 6-26 12-22 22-28 18-14 8-16 0-18-8-16-18-14-22-28Z" fill="#3f9142"/></g>`;
    };
    return `${shadow()}${berry(70, 104, 1, -14)}${berry(134, 100, 0.95, 12)}${berry(102, 122, 1.08, 2)}`;
  },
  "banana-robusta": () => {
    const [g, f] = linear("#ffe66d", "#efb820");
    const one = (rot) => `<path transform="rotate(${rot} 142 44)" d="M142 44C146 90 120 146 54 154c-8 2-12-6-6-10 44-24 66-60 78-102 2-8 16-6 16 2Z" fill="${f}" stroke="#c78f12" stroke-width="1.2"/>`;
    return `<defs>${g}</defs>${shadow(100, 172, 60, 8)}${one(16)}${one(6)}${one(-6)}<path d="M132 44l8-16 12 3-4 17Z" fill="#7a5a22"/>`;
  },
  "royal-gala-apple": () => `${round("#ffb199", "#d9342b", "#8e1420", `<path d="M74 54c14-8 38-8 52 0" stroke="#7a1420" stroke-width="3" fill="none" opacity=".45"/><path d="M100 54c0-10 3-18 9-24" stroke="#5e3d1e" stroke-width="5" stroke-linecap="round" fill="none"/>${leaf(106, 40, 0.85, -14)}${shine(78, 84, 17, 10)}`)}`,
  pomegranate: () => `${round("#f08a84", "#b81d3a", "#6c0d24", `<path d="M86 48l-6-20 12 8 8-12 8 12 12-8-6 20Z" fill="#94162f"/>${shine(78, 86, 16, 9)}<path d="M112 120a26 26 0 0 1 26 18l-26 14Z" fill="#fbe2d8"/><g fill="#d81f47"><circle cx="118" cy="132" r="4"/><circle cx="126" cy="138" r="4"/><circle cx="116" cy="142" r="4"/></g>`)}`,
  "vine-tomato": () => {
    const t = (x, y, r) => { const [g, f] = ball("#ff9a7a", "#e4352a", "#9d1a17"); return `<defs>${g}</defs><circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>${shine(x - r * .35, y - r * .4, r * .28, r * .16)}<path d="M${x} ${y - r}l-9-5 6 8-9 3 10 0 2 7 2-7 10 0-9-3 6-8Z" fill="#3a8a3d"/>`; };
    return `${shadow()}<path d="M48 54C80 36 124 36 156 56" stroke="#3a8a3d" stroke-width="6" fill="none" stroke-linecap="round"/>${t(68, 96, 30)}${t(134, 98, 29)}${t(100, 132, 33)}`;
  },
  broccoli: () => {
    const [g, f] = ball("#7fca5a", "#3f9140", "#1d5a2a");
    const [g2, f2] = linear("#c6e39a", "#86bb5e");
    let tops = "";
    for (const [x, y, r] of [[66, 84, 24], [134, 84, 24], [100, 62, 28], [80, 60, 20], [122, 60, 20], [100, 94, 28], [56, 66, 14], [146, 66, 14]]) tops += `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
    return `<defs>${g}${g2}</defs>${shadow()}<path d="M82 100c2 26-2 52-6 68 10 6 40 6 50 0-4-16-8-42-6-68Z" fill="${f2}"/>${tops}`;
  },
  "baby-spinach": () => {
    const l = (x, y, s, r) => leaf(x, y, s, r, "#58b25a", "#1f6d36");
    return `${shadow()}${l(100, 160, 2.1, -100)}${l(92, 160, 1.9, -135)}${l(108, 160, 1.9, -62)}${l(96, 164, 1.7, -165)}${l(104, 164, 1.7, -20)}`;
  },
  carrot: () => {
    const c = (rot, dx) => { const [g, f] = linear("#ffa64d", "#e8650f", true); return `<defs>${g}</defs><g transform="translate(${dx} 0) rotate(${rot} 100 60)"><path d="M78 62c10-8 34-8 44 0 4 34-10 84-22 106-12-22-26-72-22-106Z" fill="${f}"/><path d="M86 86h16M92 112h14M94 136h9" stroke="#b94d08" stroke-width="2.2" stroke-linecap="round" opacity=".6"/></g>`; };
    return `${shadow()}${leaf(96, 58, 1.1, -120)}${leaf(100, 58, 1.1, -60)}${leaf(98, 58, 1.2, -90)}${c(-16, -10)}${c(14, 12)}`;
  },
  "red-onion": () => `${round("#c9719f", "#8a2663", "#4d0f3a", `<path d="M100 46c-2-8 0-16 4-24M100 46c-6-6-10-14-10-20" stroke="#b08a56" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M100 48C72 70 72 138 100 162M100 48c28 22 28 90 0 114M100 48C56 70 50 136 100 162M100 48c44 22 50 88 0 114" stroke="#e9b7d3" stroke-width="1.6" fill="none" opacity=".55"/>${shine(76, 84, 12, 8)}`)}`,
  potato: () => {
    const p = (x, y, rx, ry, r) => { const [g, f] = ball("#e8c78f", "#c49a5e", "#8b6735"); return `<defs>${g}</defs><g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"/><circle cx="${x - 12}" cy="${y - 6}" r="1.8" fill="#7a5a2c"/><circle cx="${x + 14}" cy="${y + 4}" r="1.8" fill="#7a5a2c"/><circle cx="${x + 2}" cy="${y + 11}" r="1.5" fill="#7a5a2c"/></g>`; };
    return `${shadow()}${p(70, 118, 36, 28, -18)}${p(132, 120, 34, 27, 14)}${p(102, 86, 38, 29, 6)}`;
  },
  "free-range-eggs": () => {
    const [g, f] = linear("#a8c9a0", "#7ba274");
    const egg = (x, c1, c2) => { const [gg, ff] = ball("#fff8ec", c1, c2); return `<defs>${gg}</defs><path d="M${x} 62c14 0 22 22 22 38s-10 24-22 24-22-8-22-24 8-38 22-38Z" fill="${ff}"/>`; };
    return `<defs>${g}</defs>${shadow()}${egg(62, "#efd3ae", "#c99d6c")}${egg(100, "#f6e4cc", "#d7b48a")}${egg(138, "#efd3ae", "#c99d6c")}<path d="M28 108h144l-12 58H40Z" fill="${f}"/><path d="M28 108h144" stroke="#5f8558" stroke-width="3"/><path d="M62 118l-5 40M100 118v40M138 118l5 40" stroke="#5f8558" stroke-width="2" opacity=".6"/>`;
  },
  paneer: () => {
    const [a, fa] = linear("#fffdf4", "#efe8d2");
    return `<defs>${a}</defs>${shadow()}<path d="M40 88l58-26 62 24v56l-62 28-58-26Z" fill="#e5dcc1"/><path d="M40 88l60 26 60-28-62-24Z" fill="${fa}"/><path d="M100 114v56l60-28V86Z" fill="#ede5cd"/><g fill="#d9cfae"><circle cx="72" cy="128" r="3"/><circle cx="132" cy="122" r="3"/><circle cx="118" cy="146" r="2.4"/><circle cx="60" cy="108" r="2"/></g>`;
  },
  cheddar: () => {
    const [a, fa] = linear("#ffd768", "#f2ab2c");
    return `<defs>${a}</defs>${shadow()}<path d="M30 110L150 56c10 12 18 28 20 54Z" fill="#ffe08a"/><path d="M30 110h140v46H30Z" fill="${fa}"/><circle cx="66" cy="132" r="9" fill="#d98d1c"/><circle cx="118" cy="142" r="6" fill="#d98d1c"/><circle cx="144" cy="124" r="7" fill="#d98d1c"/><ellipse cx="116" cy="88" rx="9" ry="4" fill="#e7a932"/>`;
  },
  "salted-butter": () => {
    const [a, fa] = linear("#fff0a8", "#f4d052");
    return `<defs>${a}</defs>${shadow()}<path d="M34 96l90-30 44 22-90 32Z" fill="#fff4bd"/><path d="M34 96l44 24v44l-44-24Z" fill="#e7c343"/><path d="M78 120l90-32v44l-90 32Z" fill="${fa}"/><path d="M34 118l44 22 90-32v24l-90 32-44-24Z" fill="#fff" opacity=".82"/><text x="120" y="130" transform="rotate(-19 120 130)" font-family="Georgia,serif" font-size="11" font-weight="700" fill="#047857" text-anchor="middle">SALTED</text>`;
  },
  "sourdough-loaf": () => {
    const [g, f] = ball("#e0ad6c", "#b87a36", "#6f4217");
    return `<defs>${g}</defs>${shadow()}<path d="M24 118c0-44 36-68 76-68s76 24 76 68c0 28-20 44-76 44S24 146 24 118Z" fill="${f}"/><path d="M58 82l18 62M88 68l14 88M120 70l8 80M148 88l-2 50" stroke="#f3dab0" stroke-width="5" stroke-linecap="round" opacity=".85"/>`;
  },
  "multigrain-sandwich": () => {
    const [a, fa] = linear("#d7a768", "#a06c32");
    let seeds = ""; for (const [x, y] of [[70, 92], [92, 80], [118, 96], [80, 124], [108, 128], [134, 116], [62, 112], [126, 74], [98, 106], [144, 92]]) seeds += `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="1.5" fill="#6b4217" transform="rotate(${x} ${x} ${y})"/>`;
    return `<defs>${a}</defs>${shadow()}<path d="M150 66c20-6 30 14 18 28v62l-16 8Z" fill="#8a5a28"/><path d="M50 60c30-12 80-12 100 0 18 10 12 30 2 36v62c0 4-3 6-6 6H52c-3 0-6-2-6-6V96c-12-8-12-28 4-36Z" fill="#f1dcb6" stroke="${fa}" stroke-width="7"/>${seeds}`;
  },
  "butter-croissant": () => {
    const [g, f] = ball("#f6c877", "#d68f35", "#92561a");
    const s = (x, y, rx, ry, r) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" stroke="#a5651f" stroke-width="1.4" transform="rotate(${r} ${x} ${y})"/>`;
    return `<defs>${g}</defs>${shadow()}${s(44, 132, 22, 14, -58)}${s(156, 132, 22, 14, 58)}${s(60, 104, 26, 20, -42)}${s(140, 104, 26, 20, 42)}${s(82, 88, 26, 24, -18)}${s(118, 88, 26, 24, 18)}${s(100, 84, 24, 28, 0)}`;
  },
  "oat-cookies": () => {
    const c = (x, y, r) => { const [g, f] = ball("#e9c08a", "#c48f4f", "#8f6129"); let chips = ""; for (const [a, b] of [[-.4, -.3], [.3, -.4], [0, .1], [-.3, .4], [.4, .3]]) chips += `<circle cx="${x + a * r}" cy="${y + b * r}" r="${r * .1}" fill="#4a2b14"/>`; return `<defs>${g}</defs><circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>${chips}`; };
    return `${shadow()}${c(70, 122, 36)}${c(134, 118, 34)}${c(102, 82, 36)}`;
  },
  "blueberry-muffin": () => {
    const [g, f] = ball("#f0cb8c", "#d5a25b", "#9a6a2c");
    const [a, fa] = linear("#10b981", "#047857", true);
    return `<defs>${g}${a}</defs>${shadow()}<path d="M54 104h92l-12 64H66Z" fill="${fa}"/><path d="M72 108l5 56M100 108v58M128 108l-5 56" stroke="#fff" stroke-width="2" opacity=".35"/><path d="M42 104c-8-30 22-58 58-58s66 28 58 58c-2 10-114 10-116 0Z" fill="${f}"/><g fill="#3b3a78"><circle cx="78" cy="78" r="7"/><circle cx="116" cy="68" r="7"/><circle cx="130" cy="92" r="6"/><circle cx="96" cy="94" r="6"/></g>`;
  },
};

/* ---------- Original fictional packaging ---------- */
const labelText = (brand, title, sub, cx, y, ink = "#fff") => `<text x="${cx}" y="${y}" text-anchor="middle" font-family="Georgia,serif" font-size="8" letter-spacing="1" fill="${ink}" opacity=".85">${brand}</text><text x="${cx}" y="${y + 17}" text-anchor="middle" font-family="Georgia,serif" font-size="15" font-weight="700" fill="${ink}">${title}</text>${sub ? `<text x="${cx}" y="${y + 30}" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="${ink}" opacity=".85">${sub}</text>` : ""}`;
const sprig = (x, y) => leaf(x, y, 0.4, -40, "#a7e27c", "#5fb35a") + leaf(x, y, 0.4, -130, "#a7e27c", "#5fb35a");

const carton = (c1, c2, brand, title, sub) => { const [g, f] = linear(c1, c2, true); return `<defs>${g}</defs>${shadow(100, 178, 44, 7)}<path d="M64 62l14-24h44l14 24Z" fill="#fff"/><path d="M78 38h44v-8H78Z" fill="#e8e6da"/><rect x="64" y="62" width="72" height="114" rx="4" fill="${f}"/>${labelText(brand, title, sub, 100, 96).replaceAll('font-size="15"', 'font-size="12"').replaceAll('font-size="8"', 'font-size="6.5"')}${sprig(100, 160)}<rect x="64" y="62" width="10" height="114" fill="#fff" opacity=".14"/>`; };
const bottle = (c1, c2, cap, brand, title, sub) => { const [g, f] = linear(c1, c2, true); return `<defs>${g}</defs>${shadow(100, 178, 34, 6)}<rect x="88" y="20" width="24" height="16" rx="3" fill="${cap}"/><path d="M90 36h20v14c0 10 18 16 18 34v84c0 6-4 10-10 10H82c-6 0-10-4-10-10V84c0-18 18-24 18-34Z" fill="${f}"/><rect x="72" y="96" width="56" height="58" fill="#ffffffee"/>${labelText(brand, title, sub, 100, 110, "#0f3d2e").replaceAll('font-size="15"', 'font-size="9.5"').replaceAll('font-size="8"', 'font-size="6"')}<path d="M80 62c-3 6-4 14-4 22v80" stroke="#fff" stroke-width="4" opacity=".3" fill="none" stroke-linecap="round"/>`; };
const pouch = (c1, c2, brand, title, sub) => { const [g, f] = linear(c1, c2); return `<defs>${g}</defs>${shadow(100, 178, 50, 7)}<path d="M52 34h96l6 12-6 8c8 40 8 80 4 118-1 4-3 6-8 6H58c-5 0-7-2-8-6-4-38-4-78 4-118l-6-8Z" fill="${f}"/><path d="M50 50h100" stroke="#fff" stroke-width="1.4" stroke-dasharray="3 3" opacity=".6"/><rect x="60" y="74" width="80" height="62" rx="8" fill="#fff" opacity=".93"/>${labelText(brand, title, sub, 100, 90, "#0f3d2e").replaceAll('font-size="15"', 'font-size="13"')}${sprig(100, 160)}`; };
const jar = (c1, c2, lid, brand, title, sub) => { const [g, f] = linear(c1, c2, true); return `<defs>${g}</defs>${shadow(100, 178, 44, 7)}<rect x="62" y="30" width="76" height="22" rx="5" fill="${lid}"/><rect x="58" y="50" width="84" height="126" rx="14" fill="${f}"/><rect x="58" y="88" width="84" height="56" fill="#fff" opacity=".94"/>${labelText(brand, title, sub, 100, 102, "#0f3d2e").replaceAll('font-size="15"', 'font-size="12"')}<rect x="66" y="58" width="7" height="110" rx="3" fill="#fff" opacity=".3"/>`; };
const tub = (c1, c2, brand, title, sub) => { const [g, f] = linear(c1, c2, true); return `<defs>${g}</defs>${shadow(100, 174, 52, 8)}<ellipse cx="100" cy="66" rx="60" ry="15" fill="#fff"/><path d="M40 66l10 96c1 8 26 14 50 14s49-6 50-14l10-96c-8 12-110 12-120 0Z" fill="${f}"/>${labelText(brand, title, sub, 100, 104)}${sprig(100, 160)}`; };
const box = (c1, c2, brand, title, sub) => { const [g, f] = linear(c1, c2, true); return `<defs>${g}</defs>${shadow(100, 178, 54, 7)}<path d="M146 44l14-8v132l-14 8Z" fill="#00000030"/><path d="M54 44l14-8h92l-14 8Z" fill="#ffffff66"/><rect x="54" y="44" width="92" height="132" fill="${f}"/>${labelText(brand, title, sub, 100, 88).replaceAll('font-size="15"', 'font-size="13"')}${sprig(100, 156)}`; };
const bar = (c1, c2, brand, title, sub) => { const [g, f] = linear(c1, c2); return `<defs>${g}</defs>${shadow(100, 170, 64, 7)}<g transform="rotate(-8 100 100)"><path d="M112 34h46v76h-46Z" fill="#3a2013"/><path d="M112 60h46M135 34v76" stroke="#26130a" stroke-width="2"/><path d="M38 72L150 58v96L38 168Z" fill="${f}"/><g transform="rotate(-7 94 112)">${labelText(brand, title, sub, 94, 100)}</g></g>`; };
const roll = (brand, title) => { const [g, f] = linear("#ffffff", "#dfe5da", true); const r = (x) => `<rect x="${x}" y="54" width="44" height="112" rx="6" fill="${f}" stroke="#d3d8ca"/><ellipse cx="${x + 22}" cy="54" rx="22" ry="8" fill="#f4f5ef" stroke="#d3d8ca"/><ellipse cx="${x + 22}" cy="54" rx="8" ry="3" fill="#a78b66"/>`; return `<defs>${g}</defs>${shadow(100, 172, 66, 8)}${r(34)}${r(78)}${r(122)}<rect x="34" y="100" width="132" height="40" fill="#047857" opacity=".94"/>${labelText(brand, title, "", 100, 114).replaceAll('font-size="15"', 'font-size="12"')}`; };

Object.assign(D, {
  "toned-milk": () => carton("#10a874", "#047857", "VERDANT DAIRY", "Toned Milk", "1 litre, 3% fat"),
  "greek-yogurt": () => tub("#60a5d8", "#2d6fa8", "VERDANT DAIRY", "Greek", "unsweetened"),
  "basmati-rice": () => pouch("#d9a441", "#a8701c", "HARVEST ROW", "Basmati", "aged 2 years"),
  "whole-wheat-atta": () => pouch("#c98d4b", "#8a5a27", "HARVEST ROW", "Atta", "stone milled"),
  "toor-dal": () => pouch("#f0b429", "#c98212", "HARVEST ROW", "Toor Dal", "unpolished"),
  "groundnut-oil": () => bottle("#f5d565", "#d29c16", "#7a5512", "ORCHARD MILL", "Groundnut", "cold pressed"),
  "turmeric-powder": () => jar("#f5a81c", "#c97a06", "#8a4f03", "SPICE TRAIL", "Turmeric", "stone ground"),
  "rock-salt": () => jar("#f7e3e3", "#e5bcbc", "#047857", "SPICE TRAIL", "Rock Salt", "fine ground"),
  "masala-makhana": () => pouch("#e4572e", "#a8321a", "NIBBLE &amp; CO", "Makhana", "peri masala"),
  "dark-chocolate": () => bar("#6d3c24", "#3a1e10", "COCOA ROW", "70% Dark", "single estate"),
  "trail-mix": () => pouch("#8a6bb1", "#5a3f85", "NIBBLE &amp; CO", "Trail Mix", "nuts + berries"),
  "banana-chips": () => pouch("#f2c230", "#c8920c", "NIBBLE &amp; CO", "Banana", "Kerala chips"),
  "honey-granola": () => box("#e7a122", "#b46f0b", "MORNING FIELD", "Granola", "honey almond"),
  "seed-crisps": () => box("#2f9e78", "#116149", "MORNING FIELD", "Seed Crisps", "baked, not fried"),
  "orange-juice": () => carton("#fb923c", "#ea580c", "SUNROW", "Orange", "no added sugar"),
  "masala-chai": () => box("#b4432f", "#7a2415", "HILLTOP LEAF", "Masala Chai", "Assam blend"),
  "filter-coffee": () => pouch("#5b3a29", "#2e1b11", "HILLTOP LEAF", "Kaapi", "80:20 chicory"),
  "tender-coconut-water": () => bottle("#d7f0d2", "#9fd49a", "#047857", "SUNROW", "Coconut", "tender water"),
  "ginger-kombucha": () => bottle("#c9772b", "#8a4a12", "#14241c", "SUNROW", "Kombucha", "ginger lime"),
  "spring-water": () => bottle("#c9ecf7", "#7fc6e3", "#1672a3", "HILLTOP", "Spring", "1 litre"),
  "dish-liquid": () => bottle("#7ddc8b", "#2bab5a", "#0f6b39", "CLEAN ROW", "Dish Wash", "lime + neem"),
  "laundry-liquid": () => bottle("#73b6f0", "#2d73c4", "#114a8a", "CLEAN ROW", "Laundry", "plant based"),
  "bamboo-tissue": () => roll("CLEAN ROW", "Bamboo Roll"),
  "floor-cleaner": () => bottle("#c8a4ef", "#8455c4", "#4b2a85", "CLEAN ROW", "Floor Care", "lavender"),
  "compost-bags": () => box("#7aa25c", "#47693a", "CLEAN ROW", "Compost", "30 bags"),
  "beeswax-wrap": () => box("#f0c75e", "#c7941c", "CLEAN ROW", "Beeswax", "reusable wraps"),
});

const svg = (body, w = 200, h = 200) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}" role="img">${body}</svg>`;
const place = (key, x, y, s, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${D[key]()}</g>`;
const write = (rel, content) => { const p = join(OUT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); };

for (const key of Object.keys(D)) write(`products/${key}.svg`, svg(D[key]()));

/* ---------- Category compositions ---------- */
const categories = {
  fruits: ["royal-gala-apple", "alphonso-mango", "banana-robusta"],
  vegetables: ["broccoli", "carrot", "vine-tomato"],
  dairy: ["toned-milk", "paneer", "free-range-eggs"],
  bakery: ["sourdough-loaf", "butter-croissant", "blueberry-muffin"],
  staples: ["basmati-rice", "toor-dal", "groundnut-oil"],
  snacks: ["masala-makhana", "dark-chocolate", "oat-cookies"],
  beverages: ["orange-juice", "filter-coffee", "spring-water"],
  household: ["dish-liquid", "bamboo-tissue", "laundry-liquid"],
};
for (const [c, [a, b, m]] of Object.entries(categories)) write(`categories/${c}.svg`, svg(place(a, -6, 36, 0.62, -8) + place(b, 82, 36, 0.62, 8) + place(m, 28, 40, 0.74)));

/* ---------- Scenes ---------- */
const crate = () => {
  const [w, fw] = linear("#c99a62", "#94683a");
  const items = [["royal-gala-apple", 40, 20, .62, -10], ["broccoli", 130, 2, .72, 6], ["alphonso-mango", 250, 18, .64, 10], ["hass-avocado", 345, 10, .62, -6], ["toned-milk", 200, -46, .78, 3], ["vine-tomato", 80, 44, .66, 0], ["carrot", 300, -24, .72, 12], ["pomegranate", 190, 54, .6, 0], ["basmati-rice", 395, 2, .62, 6]];
  return `<defs>${w}</defs><ellipse cx="260" cy="316" rx="240" ry="16" fill="#14241c" opacity=".14"/>${items.map(([k, x, y, s, r]) => place(k, x, y + 30, s, r)).join("")}<g>${[0, 1, 2].map((i) => `<rect x="20" y="${172 + i * 48}" width="480" height="40" rx="5" fill="${fw}" stroke="#7d5730" stroke-width="1.4"/>`).join("")}<rect x="34" y="166" width="24" height="150" rx="4" fill="#7f5830"/><rect x="462" y="166" width="24" height="150" rx="4" fill="#7f5830"/><text x="260" y="248" text-anchor="middle" font-family="Georgia,serif" font-size="26" font-weight="700" fill="#4d3216" opacity=".8">FARM PICKED</text></g>`;
};
write("scenes/market-crate.svg", svg(crate(), 520, 340));

const van = () => {
  const [b, fb] = linear("#10b981", "#047857");
  return `<defs>${b}</defs><ellipse cx="200" cy="208" rx="170" ry="10" fill="#14241c" opacity=".15"/><path d="M40 60c0-10 8-18 18-18h170c8 0 12 2 18 8l62 66c6 6 40 8 46 24 4 12 4 30 2 46-1 6-5 10-11 10H52c-7 0-12-5-12-12Z" fill="${fb}"/><path d="M238 62h-2c-5 0-8 3-8 8v44h76Z" fill="#d9f3ec"/><text x="128" y="112" text-anchor="middle" font-family="Georgia,serif" font-size="27" font-weight="700" fill="#fff">Supermart</text><path d="M60 136h150" stroke="#fff" stroke-width="3" opacity=".5"/><text x="128" y="162" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#fff" opacity=".9">fresh, to your door</text>${[100, 300].map((x) => `<circle cx="${x}" cy="196" r="26" fill="#1f2a24"/><circle cx="${x}" cy="196" r="12" fill="#dfe5da"/>`).join("")}<circle cx="346" cy="146" r="7" fill="#ffe27a"/>`;
};
write("scenes/delivery-van.svg", svg(van(), 400, 224));

const hills = () => {
    const [a, fa] = linear("#7fd1a6", "#34a678");
  const [c, fc] = linear("#34a678", "#047857");
  let rows = ""; for (let i = 0; i < 9; i++) rows += `<path d="M${-60 + i * 170} 420C${60 + i * 170} 330 ${180 + i * 150} 300 ${300 + i * 130} 280" stroke="#a7e3c1" stroke-width="3" fill="none" opacity=".35"/>`;
  return `<defs>${a}${c}</defs><circle cx="960" cy="110" r="62" fill="#ffe29a" opacity=".85"/><path d="M0 240C200 150 420 170 620 230S1020 290 1200 190V420H0Z" fill="${fa}"/><path d="M0 320C260 240 480 270 700 320S1060 350 1200 290V420H0Z" fill="${fc}"/>${rows}`;
};
write("scenes/farm-hills.svg", svg(hills(), 1200, 420));

console.log(`Wrote ${Object.keys(D).length} products, ${Object.keys(categories).length} categories, 3 scenes.`);

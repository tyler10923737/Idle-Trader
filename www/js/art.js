// Original 2D art for Idle Trader: shared gradients (DEFS), the character and props drawn as SVG
// sprites, icons, and the 2D side-view car profiles that the 3D car models are extruded from.
// Everything is generated in code — a few KB, retina-sharp, no third-party licensing.

const f = v => Math.round(v * 10) / 10;
const P = p => `${f(p[0])} ${f(p[1])}`;

// Rounded polygon path. Each point is [x, y, radius?].
export function rp(pts, r = 8) {
  const n = pts.length; let d = "";
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n], v = pts[i], q = pts[(i + 1) % n];
    const ri = v[2] !== undefined ? v[2] : r;
    const d1 = [p[0] - v[0], p[1] - v[1]], d2 = [q[0] - v[0], q[1] - v[1]];
    const l1 = Math.hypot(d1[0], d1[1]) || 1, l2 = Math.hypot(d2[0], d2[1]) || 1;
    const c = Math.min(ri, l1 / 2, l2 / 2);
    const a = [v[0] + d1[0] / l1 * c, v[1] + d1[1] / l1 * c], b = [v[0] + d2[0] / l2 * c, v[1] + d2[1] / l2 * c];
    d += (i === 0 ? `M${P(a)}` : `L${P(a)}`) + `Q${P(v)} ${P(b)}`;
  }
  return d + "Z";
}
// Lighten (f>0) or darken (f<0) a hex color.
export function adjust(hex, amt) {
  let c = hex.replace("#", ""); if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const n = parseInt(c, 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.min(1, Math.abs(amt));
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
const seeded = seed => { let s = seed % 2147483647 || 7; return () => (s = (s * 48271) % 2147483647) / 2147483647; };
export const svg = (inner, vb, cls = "", extra = "") => `<svg viewBox="${vb}" class="${cls}" ${extra} xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

// ---------- shared defs (gradients / masks referenced by every drawing) ----------
export const DEFS = `<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>
<linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fd0ff"/><stop offset="1" stop-color="#5f8dff"/></linearGradient>
<linearGradient id="g-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3d9e"/><stop offset=".6" stop-color="#ff7e9b"/><stop offset="1" stop-color="#ffb86b"/></linearGradient>
<linearGradient id="g-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1240"/><stop offset="1" stop-color="#3a2e86"/></linearGradient>
<linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8f4ff"/><stop offset=".5" stop-color="#7cc6f5"/><stop offset="1" stop-color="#3f7fcf"/></linearGradient>
<linearGradient id="g-chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b9c2cf"/><stop offset="1" stop-color="#f1f4f8"/></linearGradient>
<linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset=".55" stop-color="#ffb400"/><stop offset="1" stop-color="#e08a00"/></linearGradient>
<linearGradient id="g-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="g-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>
<linearGradient id="g-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#143a6b"/><stop offset="1" stop-color="#0a1a3a"/></linearGradient>
<linearGradient id="g-floorfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<linearGradient id="g-reflect" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000"/><stop offset=".9" stop-color="#fff"/></linearGradient>
<radialGradient id="g-platform" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8ff3ff"/><stop offset=".55" stop-color="#3a8dff"/><stop offset="1" stop-color="#1b2a7a"/></radialGradient>
<radialGradient id="g-spot" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="g-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="m-reflect" maskContentUnits="userSpaceOnUse"><rect x="-20" y="0" width="300" height="130" fill="url(#g-reflect)"/></mask>
</defs></svg>`;

// ---------- CARS (side view, local box 260x130, ground y=113) ----------
export const CAR = {
  hatch: { rear: 50, front: 214, bumperH: 72, trunkY: 48, trunkStart: 60, roofY: 40, roofStart: 74, roofEnd: 134, hoodStart: 164, hoodY: 66, belt: 64, wheels: [88, 178], wheelR: 17, split: 118 },
  sedan: { rear: 40, front: 226, bumperH: 70, trunkY: 58, trunkStart: 64, roofY: 40, roofStart: 102, roofEnd: 148, hoodStart: 174, hoodY: 64, belt: 64, wheels: [82, 186], split: 124 },
  coupe: { rear: 40, front: 228, bumperH: 72, trunkY: 58, trunkStart: 58, roofY: 44, roofStart: 106, roofEnd: 140, hoodStart: 170, hoodY: 66, belt: 66, wheels: [82, 188], split: 126 },
  muscle: { rear: 38, front: 228, bumperH: 70, trunkY: 56, trunkStart: 62, roofY: 42, roofStart: 98, roofEnd: 134, hoodStart: 156, hoodY: 62, belt: 64, wheels: [82, 188], split: 120, stripes: "#1b1e27" },
  pickup: { rear: 36, front: 228, bumperH: 66, trunkY: 58, trunkStart: 120, roofY: 36, roofStart: 126, roofEnd: 160, hoodStart: 178, hoodY: 60, belt: 60, wheels: [76, 190], wheelR: 19, split: 140, bed: true },
  suv: { rear: 42, front: 224, bumperH: 66, trunkY: 44, trunkStart: 50, roofY: 34, roofStart: 60, roofEnd: 150, hoodStart: 176, hoodY: 58, belt: 60, wheels: [84, 184], wheelR: 19, split: 118, pillars: [118, 158], rack: true },
  roadster: { rear: 44, front: 224, bumperH: 72, trunkY: 62, trunkStart: 64, hoodStart: 150, hoodY: 66, belt: 66, wheels: [84, 186], split: 120, openTop: true, chrome: true },
  supercar: { rear: 36, front: 232, bumperH: 78, trunkY: 62, trunkStart: 70, roofY: 52, roofStart: 112, roofEnd: 142, hoodStart: 162, hoodY: 72, belt: 72, wheels: [80, 190], split: 128, spoiler: true },
  hypercar: { rear: 30, front: 236, bumperH: 80, trunkY: 62, trunkStart: 66, roofY: 54, roofStart: 110, roofEnd: 138, hoodStart: 158, hoodY: 74, belt: 74, wheels: [78, 192], wheelR: 19, split: 126, spoiler: true, stripes: "#ffffff" },
  gt: { rear: 30, front: 236, bumperH: 70, trunkY: 58, trunkStart: 58, roofY: 42, roofStart: 106, roofEnd: 152, hoodStart: 182, hoodY: 64, belt: 64, wheels: [76, 194], split: 128, chrome: true },
  // v2 bodies
  van: { rear: 40, front: 226, bumperH: 66, trunkY: 32, trunkStart: 46, roofY: 30, roofStart: 52, roofEnd: 170, hoodStart: 192, hoodY: 60, belt: 62, wheels: [84, 186], wheelR: 18, split: 112, pillars: [104, 150] },
  offroad: { rear: 36, front: 228, bumperH: 58, trunkY: 50, trunkStart: 120, roofY: 26, roofStart: 126, roofEnd: 160, hoodStart: 178, hoodY: 52, belt: 54, wheels: [76, 190], wheelR: 22, split: 140, bed: true, rack: true, lift: 8 },
  limo: { rear: 22, front: 246, bumperH: 68, trunkY: 56, trunkStart: 50, roofY: 40, roofStart: 74, roofEnd: 186, hoodStart: 208, hoodY: 62, belt: 62, wheels: [68, 206], split: 100, pillars: [100, 142, 180], chrome: true },
  // exotics (original designs in the spirit of the classic supercar makers)
  rossa: { rear: 34, front: 232, bumperH: 72, trunkY: 60, trunkStart: 72, roofY: 50, roofStart: 100, roofEnd: 134, hoodStart: 154, hoodY: 70, belt: 70, wheels: [80, 192], wheelR: 18, split: 122, quadLights: true, sideScoop: "round", engineGlass: true, lip: true },
  wedge: { rear: 30, front: 236, bumperH: 68, trunkY: 54, trunkStart: 62, roofY: 54, roofStart: 104, roofEnd: 134, hoodStart: 148, hoodY: 66, belt: 68, wheels: [80, 192], wheelR: 19, split: 124, spoiler: true, sideScoop: "angular", engineGlass: true, roofColor: "#1b1e27", hexLights: true },
  papaya: { rear: 30, front: 236, bumperH: 76, trunkY: 62, trunkStart: 70, roofY: 50, roofStart: 106, roofEnd: 140, hoodStart: 158, hoodY: 72, belt: 72, wheels: [78, 192], wheelR: 19, split: 124, sideScoop: "round", engineGlass: true, lightBar: true, dihedral: true },
  sterling: { rear: 34, front: 236, bumperH: 70, trunkY: 60, trunkStart: 54, roofY: 44, roofStart: 118, roofEnd: 162, hoodStart: 184, hoodY: 66, belt: 66, wheels: [78, 194], split: 134, chrome: true, bigGrille: true, lightBar: true },
  phantom: { rear: 28, front: 240, bumperH: 74, trunkY: 60, trunkStart: 62, roofY: 48, roofStart: 108, roofEnd: 146, hoodStart: 170, hoodY: 70, belt: 70, wheels: [78, 194], wheelR: 19, split: 126, chrome: true, stripes: "#ffc43d", lightBar: true, spoiler: true, bigGrille: true, sideScoop: "angular", roofColor: "#ffc43d" }
};
function wheel(x, y, r) {
  let sp = "";
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; sp += `<line x1="${x}" y1="${y}" x2="${f(x + Math.cos(a) * r * 0.5)}" y2="${f(y + Math.sin(a) * r * 0.5)}" stroke="#8b94a6" stroke-width="2.2" stroke-linecap="round"/>`; }
  return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#1b1e27"/><circle cx="${x}" cy="${y}" r="${r - 2.5}" fill="#2d313f"/><circle cx="${x}" cy="${y}" r="${f(r * 0.6)}" fill="url(#g-chrome)"/>${sp}<circle cx="${x}" cy="${y}" r="2.8" fill="#596274"/></g>`;
}
export function carGroup(body, color) {
  const s = CAR[body] || CAR.sedan;
  const r = s.wheelR || 18, G = 92 - (s.lift || 0), wy = 93;
  const dark = adjust(color, -0.4);
  const pts = s.openTop
    ? [[s.rear, G, 5], [s.rear, s.bumperH, 7], [s.rear + 8, s.trunkY, 7], [s.hoodStart - 8, s.trunkY, 5], [s.hoodStart, s.hoodY, 8], [s.front - 12, s.hoodY + 2, 10], [s.front, s.bumperH, 7], [s.front, G, 5]]
    : [[s.rear, G, 5], [s.rear, s.bumperH, 7], [s.rear + 8, s.trunkY, 7], [s.trunkStart, s.trunkY, 6], [s.roofStart, s.roofY, 12], [s.roofEnd, s.roofY, 12], [s.hoodStart, s.hoodY, 6], [s.front - 12, s.hoodY + 2, 10], [s.front, s.bumperH, 7], [s.front, G, 5]];
  const bodyPath = rp(pts);
  const cx = (s.rear + s.front) / 2;
  let g = `<ellipse cx="${cx}" cy="113" rx="${(s.front - s.rear) / 2 + 4}" ry="6" fill="#000" opacity=".28"/>`;
  s.wheels.forEach(x => g += `<circle cx="${x}" cy="${wy}" r="${r + 3}" fill="${adjust(color, -0.62)}"/>`);
  if (s.spoiler) g += `<rect x="${s.rear + 5}" y="${s.trunkY - 10}" width="3" height="20" fill="${dark}"/><rect x="${s.rear + 22}" y="${s.trunkY - 10}" width="3" height="20" fill="${dark}"/><rect x="${s.rear - 4}" y="${s.trunkY - 14}" width="36" height="5" rx="2.5" fill="${dark}"/>`;
  g += `<path d="${bodyPath}" fill="${color}"/><path d="${bodyPath}" fill="url(#g-shade)"/><path d="${bodyPath}" fill="url(#g-shine)"/>`;
  if (!s.openTop) {
    const glass = rp([[s.trunkStart + 6, s.belt, 2], [s.roofStart + 6, s.roofY + 5, 6], [s.roofEnd - 4, s.roofY + 5, 6], [s.hoodStart - 6, s.belt, 2]], 4);
    g += `<path d="${glass}" fill="url(#g-glass)"/><path d="${glass}" fill="url(#g-shine)" opacity=".6"/>`;
    (s.pillars || [s.split]).forEach(x => g += `<rect x="${x - 2}" y="${s.roofY + 5}" width="4" height="${s.belt - s.roofY - 5}" fill="${color}"/>`);
  } else {
    g += `<rect x="${s.trunkStart + 4}" y="${s.belt - 4}" width="${s.hoodStart - s.trunkStart - 14}" height="6" rx="3" fill="#1b1e27"/>`;
    g += `<rect x="${s.trunkStart + 14}" y="${s.belt - 14}" width="13" height="12" rx="4" fill="#3a3f52"/><rect x="${s.trunkStart + 40}" y="${s.belt - 14}" width="13" height="12" rx="4" fill="#3a3f52"/><rect x="${s.trunkStart + 16}" y="${s.belt - 12}" width="9" height="4" rx="2" fill="#5b6276"/><rect x="${s.trunkStart + 42}" y="${s.belt - 12}" width="9" height="4" rx="2" fill="#5b6276"/>`;
    g += `<path d="M${s.hoodStart - 18} ${s.belt} L${s.hoodStart - 9} ${s.belt - 20} L${s.hoodStart + 3} ${s.belt - 20} L${s.hoodStart - 2} ${s.belt} Z" fill="url(#g-glass)"/><path d="M${s.hoodStart - 18} ${s.belt} L${s.hoodStart - 9} ${s.belt - 20} L${s.hoodStart + 3} ${s.belt - 20} L${s.hoodStart - 2} ${s.belt} Z" fill="none" stroke="${dark}" stroke-width="2"/>`;
  }
  [...new Set([s.split, ...(s.pillars || [])])].filter(px => px > s.trunkStart + 6 && px < s.hoodStart - 4).forEach(px => g += `<path d="M${px} ${s.belt + 3} L${px} ${G - 6}" stroke="#000" opacity=".22" stroke-width="1.5"/>`);
  if (!s.openTop) g += `<rect x="${s.trunkStart + 4}" y="${s.belt - 1}" width="${s.hoodStart - s.trunkStart - 8}" height="1.6" rx=".8" fill="${s.chrome ? "#e8edf3" : dark}" opacity=".9"/>`;
  g += `<rect x="${s.rear - 1}" y="${G - 6}" width="5" height="3" rx="1" fill="#4d525c"/><rect x="${s.front - 9}" y="${s.bumperH + 4}" width="7" height="4" rx="1" fill="#f4f6fb" opacity=".9"/>`;
  g += `<rect x="${s.split + 8}" y="${s.belt + 8}" width="11" height="3.5" rx="1.75" fill="#000" opacity=".3"/>`;
  g += `<rect x="${s.hoodStart - 4}" y="${s.belt - 5}" width="8" height="6" rx="2" fill="${dark}"/>`;
  g += `<path d="M${s.front - 14} ${s.bumperH - 7} L${s.front - 1} ${s.bumperH - 4} L${s.front - 1} ${s.bumperH + 3} L${s.front - 14} ${s.bumperH + 2} Z" fill="#fff8d6"/><path d="M${s.front - 14} ${s.bumperH - 7} L${s.front - 1} ${s.bumperH - 4} L${s.front - 1} ${s.bumperH - 1} L${s.front - 14} ${s.bumperH - 3} Z" fill="#fff" opacity=".8"/>`;
  g += `<rect x="${s.rear + 1}" y="${s.bumperH - 6}" width="8" height="8" rx="2" fill="#ff3b3b"/><rect x="${s.rear + 2}" y="${s.bumperH - 5}" width="6" height="3" rx="1" fill="#ff8a8a"/>`;
  g += `<rect x="${s.rear + 8}" y="${G - 2}" width="${s.front - s.rear - 16}" height="5" rx="2" fill="#1a1d26"/>`;
  g += `<rect x="${s.front - 18}" y="${G - 11}" width="16" height="6" rx="2" fill="#1a1d26" opacity=".55"/><rect x="${s.rear + 2}" y="${G - 11}" width="14" height="6" rx="2" fill="#1a1d26" opacity=".45"/>`;
  if (s.stripes) g += `<path d="M${s.rear + 10} ${s.trunkY + 2} L${s.trunkStart - 3} ${s.trunkY + 2} M${s.roofStart + 9} ${s.roofY + 2} L${s.roofEnd - 9} ${s.roofY + 2} M${s.hoodStart + 6} ${s.hoodY + 2} L${s.front - 16} ${s.hoodY + 3}" stroke="${s.stripes}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".85"/>`;
  if (s.rack) g += `<rect x="${s.roofStart + 14}" y="${s.roofY - 5}" width="${s.roofEnd - s.roofStart - 28}" height="4" rx="2" fill="#2f3542"/><rect x="${s.roofStart + 18}" y="${s.roofY - 2}" width="3" height="3" fill="#2f3542"/><rect x="${s.roofEnd - 21}" y="${s.roofY - 2}" width="3" height="3" fill="#2f3542"/>`;
  if (s.bed) g += `<rect x="${s.rear + 6}" y="${s.trunkY + 3}" width="${s.trunkStart - s.rear - 10}" height="6" rx="2" fill="#000" opacity=".3"/>`;
  if (s.chrome) g += `<rect x="${s.rear + 12}" y="${G - 8}" width="${s.front - s.rear - 24}" height="2.5" rx="1" fill="url(#g-chrome)"/>`;
  s.wheels.forEach(x => g += wheel(x, wy, r));
  return g;
}
export const carSVG = (body, color, cls = "car") => svg(carGroup(body, color), "0 0 260 130", cls);

// ---------- CHARACTER (local coords: head center 0,0) ----------
function hairPath(style, color, accent) {
  switch (style) {
    case "cap": return `<path d="M-17 -4 C-17 -23 17 -23 17 -4 Z" fill="${accent}"/><rect x="-28" y="-9" width="14" height="5" rx="2.5" fill="${accent}"/><circle cx="0" cy="-20" r="2.5" fill="${adjust(accent, -0.3)}"/>`;
    case "slick": return `<path d="M-17 -2 C-20 -25 19 -23 17 -5 C 11 -15 -3 -13 -17 -2 Z" fill="${color}"/><path d="M-12 -10 C-6 -16 2 -17 8 -14" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    case "long": return `<path d="M-17 -3 C-18 -22 18 -22 17 -3 C 12 -9 6 -12 0 -11 C -6 -12 -12 -9 -17 -3Z" fill="${color}"/><rect x="-19" y="-6" width="8" height="26" rx="4" fill="${color}"/><rect x="11" y="-6" width="8" height="26" rx="4" fill="${color}"/>`;
    case "bun": return `<path d="M-17 -3 C-18 -22 18 -22 17 -3 C 12 -9 6 -12 0 -11 C -6 -12 -12 -9 -17 -3Z" fill="${color}"/><circle cx="2" cy="-19" r="6" fill="${color}"/>`;
    default: return `<path d="M-17 -3 C-18 -22 18 -22 17 -3 C 12 -9 6 -12 0 -11 C -6 -12 -12 -9 -17 -3Z" fill="${color}"/><path d="M-10 -12 C-4 -17 4 -17 9 -14" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
}
export function characterParts(o = {}) {
  const skin = o.skin || "#f1c27d", hair = o.hair || "#3b2a1a", top = o.top || "#6c7a89", accent = o.accent || "#4b5663", pants = o.pants || "#2f3b52", style = o.style || "hoodie";
  const topDark = adjust(top, -0.25);
  // head
  let head = `<ellipse cx="-16" cy="2" rx="3" ry="4" fill="${skin}"/><ellipse cx="16" cy="2" rx="3" ry="4" fill="${skin}"/><ellipse cx="-16" cy="2.5" rx="1.3" ry="2" fill="${adjust(skin, -0.18)}"/><ellipse cx="16" cy="2.5" rx="1.3" ry="2" fill="${adjust(skin, -0.18)}"/><ellipse cx="0" cy="0" rx="16" ry="17.5" fill="${skin}"/><ellipse cx="0" cy="-2" rx="16" ry="14" fill="url(#g-shine)" opacity=".5"/>`;
  head += hairPath(o.hairStyle || "short", hair, accent);
  head += `<circle cx="-6" cy="0" r="2.3" fill="#2b2b35"/><circle cx="6" cy="0" r="2.3" fill="#2b2b35"/><circle cx="-5.2" cy="-0.8" r=".8" fill="#fff"/><circle cx="6.8" cy="-0.8" r=".8" fill="#fff"/>`;
  head += `<path d="M-9 -6 Q-6 -8 -3 -6 M3 -6 Q6 -8 9 -6" stroke="${hair}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  head += `<path d="M-5 7 Q0 11.5 5 7" stroke="#b5602f" stroke-width="1.7" fill="none" stroke-linecap="round"/><circle cx="-10" cy="5" r="3" fill="#ff8a8a" opacity=".35"/><circle cx="10" cy="5" r="3" fill="#ff8a8a" opacity=".35"/>`;
  if (o.glasses) head += `<circle cx="-6" cy="0" r="5.5" stroke="#2f3542" stroke-width="1.4" fill="#fff" fill-opacity=".15"/><circle cx="6" cy="0" r="5.5" stroke="#2f3542" stroke-width="1.4" fill="#fff" fill-opacity=".15"/><path d="M-.5 0 L.5 0" stroke="#2f3542" stroke-width="1.4"/>`;
  if (o.shades) head += `<rect x="-12" y="-3.5" width="11" height="7" rx="3" fill="#1b1e27"/><rect x="1" y="-3.5" width="11" height="7" rx="3" fill="#1b1e27"/><path d="M-1 -1 L1 -1" stroke="#1b1e27" stroke-width="1.6"/><path d="M-10 -1.5 L-4 -1.5 M3 -1.5 L9 -1.5" stroke="#fff" stroke-opacity=".3" stroke-width="1.4"/>`;
  // torso
  let body = `<rect x="-5" y="12" width="10" height="12" fill="${adjust(skin, -0.1)}"/><path d="M-9 14 Q0 20 9 14 L9 11 L-9 11 Z" fill="#000" opacity=".12"/>`;
  if (style === "hoodie") body += `<ellipse cx="0" cy="18" rx="24" ry="9" fill="${accent}"/>`;
  body += `<path d="${rp([[-25, 20, 10], [25, 20, 10], [31, 70, 6], [-31, 70, 6]], 10)}" fill="${top}"/><path d="${rp([[-25, 20, 10], [25, 20, 10], [31, 70, 6], [-31, 70, 6]], 10)}" fill="url(#g-shade)" opacity=".5"/>`;
  if (style === "hoodie") body += `<path d="M-8 20 L-8 34 M8 20 L8 34" stroke="${adjust(top, 0.3)}" stroke-width="2" stroke-linecap="round"/><circle cx="-8" cy="35" r="1.6" fill="${adjust(top, 0.3)}"/><circle cx="8" cy="35" r="1.6" fill="${adjust(top, 0.3)}"/><path d="M0 24 L0 62" stroke="${topDark}" stroke-width="1.4" opacity=".7"/><path d="${rp([[-14, 46, 3], [14, 46, 3], [16, 60, 3], [-16, 60, 3]], 4)}" fill="${topDark}" opacity=".5"/><path d="M-13 47 L-8 47 M8 47 L13 47" stroke="${adjust(top, 0.25)}" stroke-width="1.4" stroke-linecap="round"/>`;
  if (style === "shirt") body += `<path d="M-9 20 L0 31 L9 20 L7 18 L0 25 L-7 18 Z" fill="${accent}"/><path d="M0 31 L0 66" stroke="${topDark}" stroke-width="1.2" opacity=".6"/><circle cx="0" cy="38" r="1.4" fill="${accent}"/><circle cx="0" cy="48" r="1.4" fill="${accent}"/><circle cx="0" cy="58" r="1.4" fill="${accent}"/><path d="M-22 34 L-13 34 L-13 44 L-22 44 Z" fill="${topDark}" opacity=".35"/>`;
  if (style === "suit") body += `<path d="M-11 20 L0 42 L11 20 Z" fill="#fff"/><path d="M-11 20 L-4 38 L-8 50 L-14 24 Z" fill="${topDark}"/><path d="M11 20 L4 38 L8 50 L14 24 Z" fill="${topDark}"/><path d="M-3 24 L3 24 L2.4 42 L0 46 L-2.4 42 Z" fill="${accent}"/><circle cx="1.5" cy="50" r="1.3" fill="${topDark}"/><circle cx="1.5" cy="57" r="1.3" fill="${topDark}"/><path d="M-22 32 L-15 32 L-16 35 L-21 35 Z" fill="${accent}"/>`;
  // cuffs + watch
  body += `<path d="M-30 64 L-23 64 M23 64 L30 64" stroke="${adjust(top, style === "suit" ? 0.9 : 0.2)}" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`;
  // arms (sitting: reaching to a keyboard in front)
  const arms = `<g class="arms"><path d="M-23 27 Q-27 44 -14 50" stroke="${top}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M23 27 Q27 44 14 50" stroke="${top}" stroke-width="11" stroke-linecap="round" fill="none"/><rect x="-21" y="42" width="8" height="4" rx="1.5" fill="#2b2f3a" transform="rotate(50 -17 44)"/><g class="hand hand-l"><circle cx="-13" cy="50" r="5.5" fill="${skin}"/></g><g class="hand hand-r"><circle cx="13" cy="50" r="5.5" fill="${skin}"/></g></g>`;
  // standing: legs + hanging arms
  const legs = `<ellipse cx="0" cy="105" rx="26" ry="4" fill="#000" opacity=".18"/><rect x="-17" y="62" width="14" height="40" rx="5" fill="${pants}"/><rect x="3" y="62" width="14" height="40" rx="5" fill="${pants}"/><path d="M-10 64 L-10 98 M10 64 L10 98" stroke="#000" stroke-width="1" opacity=".15"/><rect x="-18" y="61" width="36" height="4" rx="2" fill="${adjust(pants, -0.35)}"/><rect x="-3" y="60.5" width="6" height="5" rx="1.2" fill="#ffd27a"/><rect x="-19" y="98" width="18" height="8" rx="4" fill="#1b1e27"/><rect x="1" y="98" width="18" height="8" rx="4" fill="#1b1e27"/><path d="M-18 103 L-2 103 M2 103 L18 103" stroke="#3a3f4c" stroke-width="2"/><path d="M-13 99.5 L-7 99.5 M7 99.5 L13 99.5" stroke="${style === "hoodie" ? "#fff" : "#3a3f4c"}" stroke-width="1.2" opacity=".8"/>`;
  const armsDown = `<path d="M-25 28 Q-32 50 -28 66" stroke="${top}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M25 28 Q32 50 28 66" stroke="${top}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M-33 62 L-23 62 M23 62 L33 62" stroke="${adjust(top, style === "suit" ? 0.9 : 0.2)}" stroke-width="2.2" stroke-linecap="round" opacity=".9"/><circle cx="-28" cy="68" r="5.5" fill="${skin}"/><circle cx="28" cy="68" r="5.5" fill="${skin}"/><rect x="-32" y="60" width="8" height="4" rx="1.5" fill="#2b2f3a"/><circle cx="-28" cy="62" r="1.6" fill="#8fd3ff"/>`;
  return { head, body, arms, legs, armsDown };
}
export function characterSVG(o = {}, pose = "stand", cls = "chara") {
  const p = characterParts(o);
  if (pose === "head") return svg(`<g transform="translate(24 24) scale(1.05)">${p.head}</g>`, "0 0 48 48", cls);
  if (pose === "sit") return svg(`<g transform="translate(40 30)">${p.body}${p.head}${p.arms}</g>`, "0 0 80 90", cls);
  return svg(`<g transform="translate(44 26)">${p.legs}${p.body}${p.armsDown}${p.head}</g>`, "0 0 88 136", cls);
}

// ---------- scene helpers ----------
export function cloud(x, y, s = 1, cls = "drift") {
  return `<g class="${cls}" transform="translate(${x} ${y}) scale(${s})" opacity=".92"><ellipse cx="0" cy="0" rx="22" ry="11" fill="#fff"/><ellipse cx="-14" cy="4" rx="13" ry="8" fill="#fff"/><ellipse cx="14" cy="4" rx="15" ry="9" fill="#fff"/><ellipse cx="2" cy="-6" rx="12" ry="9" fill="#fff"/></g>`;
}
export function skyline(x0, x1, ground, o = {}) {
  const rnd = seeded(o.seed || 11), n = o.count || 10, night = !!o.night, maxH = o.maxH || 60;
  const w = (x1 - x0) / n; let s = "";
  for (let i = 0; i < n; i++) {
    const h = 18 + rnd() * maxH, bw = w * (0.55 + rnd() * 0.4), x = x0 + i * w + (w - bw) / 2;
    const col = night ? adjust("#2a2f6b", rnd() * 0.15) : adjust("#8fb3e0", rnd() * 0.2 - 0.1);
    s += `<rect x="${f(x)}" y="${f(ground - h)}" width="${f(bw)}" height="${f(h)}" fill="${col}"/>`;
    const rows = Math.floor(h / 7), cols = Math.max(1, Math.floor(bw / 6));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (rnd() > (night ? 0.45 : 0.6)) s += `<rect x="${f(x + 2 + c * 6)}" y="${f(ground - h + 3 + r * 7)}" width="3" height="3.5" fill="${night ? "#ffe27a" : "#ffffff"}" opacity="${night ? ".9" : ".55"}"/>`;
  }
  return s;
}
export function palm(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 C-3 -14 -2 -28 2 -40" stroke="#8d6e63" stroke-width="4" fill="none" stroke-linecap="round"/><g class="sway"><path d="M2 -40 C-14 -46 -24 -40 -28 -30 C-16 -36 -6 -36 2 -40Z" fill="#2ecc71"/><path d="M2 -40 C18 -46 28 -40 32 -30 C20 -36 10 -36 2 -40Z" fill="#27ae60"/><path d="M2 -40 C-10 -52 -20 -54 -26 -50 C-14 -48 -6 -44 2 -40Z" fill="#27ae60"/><path d="M2 -40 C14 -52 24 -54 30 -50 C18 -48 10 -44 2 -40Z" fill="#2ecc71"/><circle cx="1" cy="-38" r="3" fill="#8d6e63"/></g></g>`;
}
export function tree(x, y, s = 1) { return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-14" width="6" height="16" fill="#8d6e63"/><circle cx="0" cy="-22" r="13" fill="#2ecc71"/><circle cx="-8" cy="-16" r="9" fill="#27ae60"/><circle cx="8" cy="-16" r="9" fill="#27ae60"/></g>`; }
export function bush(x, y, s = 1) { return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="10" ry="6" fill="#27ae60"/><ellipse cx="-6" cy="-2" rx="6" ry="5" fill="#2ecc71"/><ellipse cx="6" cy="-2" rx="6" ry="5" fill="#2ecc71"/></g>`; }
// ---------- office props (2D sprites used inside the 3D office) ----------
export function monitor(x, y, w, h, skew, seed, accent = "#39f0a3") {
  const rnd = seeded(seed), cx = x + w / 2, by = y + h;
  let pts = "", v = h * 0.55;
  for (let i = 0; i <= 12; i++) { v = Math.max(h * 0.2, Math.min(h * 0.9, v + (rnd() - 0.5) * h * 0.4)); pts += `${f(x + 4 + i * (w - 8) / 12)},${f(y + h - v)} `; }
  let bars = "";
  for (let i = 0; i < 8; i++) { const bh = 4 + rnd() * (h * 0.35), up = rnd() > 0.4; bars += `<rect class="${i % 2 ? "bar" : ""}" style="animation-delay:${(i * 230) % 1700}ms;transform-origin:${f(x + 8 + i * (w - 14) / 8 + 2)}px ${f(by - 4)}px" x="${f(x + 8 + i * (w - 14) / 8)}" y="${f(by - 4 - bh)}" width="4" height="${f(bh)}" rx="1" fill="${up ? accent : "#ff5c7a"}" opacity=".75"/>`; }
  const tr = `transform="translate(${cx} ${by}) skewY(${skew}) translate(${-cx} ${-by})"`;
  return `<g ${tr}><rect x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" rx="6" fill="#1c1f33"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#g-screen)"/><path d="M${x} ${y + h / 3} H${x + w} M${x} ${y + 2 * h / 3} H${x + w}" stroke="#fff" stroke-opacity=".08"/><rect x="${x}" y="${y}" width="${w}" height="7" fill="#fff" opacity=".08"/><circle cx="${x + 5}" cy="${y + 3.5}" r="1.5" fill="#ff5c7a"/><circle cx="${x + 10}" cy="${y + 3.5}" r="1.5" fill="#ffd23f"/><circle cx="${x + 15}" cy="${y + 3.5}" r="1.5" fill="${accent}"/>${bars}<polyline class="chart" points="${pts}" fill="none" stroke="${accent}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#g-shine)" opacity=".25"/></g><rect x="${cx - 3}" y="${by + 5}" width="6" height="9" fill="#2a2e45"/><rect x="${cx - 18}" y="${by + 13}" width="36" height="4" rx="2" fill="#2a2e45"/>`;
}
export function plant(x, y, s = 1, cls = "sway") {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="${cls}"><ellipse cx="-12" cy="-30" rx="7" ry="16" fill="#27ae60" transform="rotate(-30 -12 -30)"/><ellipse cx="12" cy="-30" rx="7" ry="16" fill="#27ae60" transform="rotate(30 12 -30)"/><ellipse cx="0" cy="-36" rx="7" ry="20" fill="#2ecc71"/><ellipse cx="-6" cy="-24" rx="5" ry="12" fill="#2ecc71" transform="rotate(-12 -6 -24)"/><ellipse cx="7" cy="-24" rx="5" ry="12" fill="#2ecc71" transform="rotate(14 7 -24)"/></g><path d="M-13 -14 L13 -14 L10 0 L-10 0 Z" fill="#d35400"/><path d="M-13 -14 L13 -14 L10 0 L-10 0 Z" fill="url(#g-shade)" opacity=".5"/><rect x="-14" y="-17" width="28" height="5" rx="2" fill="#e67e22"/></g>`;
}
export function trophy(x, y, s = 1) { return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-7 -20 H7 V-10 Q7 -2 0 -2 Q-7 -2 -7 -10 Z" fill="url(#g-gold)"/><path d="M-7 -17 Q-13 -17 -12 -10 Q-11 -6 -6 -7 M7 -17 Q13 -17 12 -10 Q11 -6 6 -7" stroke="#ffb400" stroke-width="2" fill="none"/><rect x="-2" y="-3" width="4" height="4" fill="#e08a00"/><rect x="-6" y="1" width="12" height="3" rx="1" fill="#e08a00"/></g>`; }
// ---------- SHOWROOM BACKGROUND (390x250) — the turntable and cars are drawn in 3D on a canvas ----------
export function showroomSVG(v) {
  const L = v.level, featured = v.featured; // {body,color}
  const lux = L >= 3, show = L === 2;
  const wall = lux ? "#161a3a" : show ? "#f2f5fb" : L === 1 ? "#2d8cff" : "#9aa3b5";
  const floor = lux ? "#0f1230" : show ? "#dfe6f5" : L === 1 ? "#3d4663" : "#6b7385";
  let s = `<rect width="390" height="170" fill="${wall}"/><rect width="390" height="170" fill="url(#g-shade)" opacity=".25"/>`;
  if (L === 0) { for (let i = 0; i < 7; i++) s += `<rect x="110" y="${40 + i * 15}" width="170" height="13" rx="2" fill="#8a93a6"/>`; s += `<rect x="100" y="30" width="190" height="8" rx="2" fill="#5f6878"/><rect x="24" y="70" width="40" height="60" rx="3" fill="#7a8396"/><rect x="326" y="70" width="40" height="60" rx="3" fill="#7a8396"/>`; }
  if (L === 1) s += `<rect y="96" width="390" height="18" fill="#ffffff"/><rect y="100" width="390" height="10" fill="#ff3b5c"/><rect x="20" y="28" width="90" height="50" rx="4" fill="#1f2d5c"/><text x="65" y="58" text-anchor="middle" font-size="14" font-weight="700" fill="#ffd23f" font-family="Fredoka, sans-serif">GARAGE</text>`;
  if (show) { s += `<rect x="20" y="20" width="350" height="110" rx="6" fill="url(#g-sky)"/><g opacity=".9">${skyline(20, 370, 130, { count: 14, maxH: 70, seed: 9 })}</g>${cloud(90, 44, 0.7)}${cloud(300, 60, 0.5, "drift2")}<path d="M195 20 V130 M20 75 H370" stroke="#fff" stroke-width="5"/><rect x="20" y="20" width="350" height="110" rx="6" fill="none" stroke="#fff" stroke-width="6"/>`; }
  if (lux) { s += `<rect x="0" y="40" width="390" height="3" fill="#4fd3ff" class="neon"/><rect x="0" y="130" width="390" height="3" fill="#ffc43d" class="neon2"/><rect x="40" y="56" width="310" height="60" rx="4" fill="#0b0e24"/><text x="195" y="96" text-anchor="middle" font-size="26" font-weight="700" fill="#4fd3ff" font-family="Fredoka, sans-serif" letter-spacing="6" opacity=".9">COLLECTION</text>`; }
  // floor
  s += `<rect y="170" width="390" height="80" fill="${floor}"/><rect y="170" width="390" height="80" fill="url(#g-floorfade)"/>`;
  if (show) for (let i = 0; i < 8; i++) s += `<path d="M${i * 56} 250 L${90 + i * 30} 170" stroke="#fff" stroke-opacity=".25"/>`;
  if (lux) s += `<ellipse cx="195" cy="236" rx="190" ry="20" fill="#4fd3ff" opacity=".06"/>`;
  // spotlights
  s += `<polygon points="60,0 150,0 230,200 70,200" fill="url(#g-spot)" opacity=".7"/><polygon points="240,0 330,0 320,200 160,200" fill="url(#g-spot)" opacity=".7"/>`;
  // the player, admiring the car
  if (v.outfit) { const ch = characterParts(v.outfit); s += `<g class="chara-stand" transform="translate(46 170) scale(.62)">${ch.legs}${ch.body}${ch.armsDown}${ch.head}</g>`; }
  return svg(s, "0 0 390 250", "showroom-art", 'preserveAspectRatio="xMidYMax slice"');
}
// ---------- ICONS (24x24, stroke = currentColor) ----------
const ICON_PATHS = {
  office: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/><path d="M6 12l3-3 3 2 3-4 3 3"/>',
  garage: '<path d="M3 13l2.2-5.5A2 2 0 0 1 7.1 6h9.8a2 2 0 0 1 1.9 1.5L21 13v5a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1z"/><path d="M5 13h14"/>',
  homes: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  business: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.6 2.6 0 0 0 5.3 0 2.6 2.6 0 0 0 5.4 0 2.6 2.6 0 0 0 5.3 0"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  robot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="14" r="1.3"/><circle cx="15" cy="14" r="1.3"/><path d="M9 18h6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12l4.5 4.5L19 7"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-1 9z"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9l5 6M21 9l-5 6"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  share: '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7h14v-7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h3.5a1.8 1.8 0 0 1 0 3.6H11a1.8 1.8 0 0 0 0 3.6h3.5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  paint: '<path d="M12 3C7 3 3 6.6 3 11a4 4 0 0 0 4 4h1.5a1.5 1.5 0 0 1 1 2.6A1.5 1.5 0 0 0 10.6 20H12c5 0 9-3.6 9-8s-4-9-9-9z"/><circle cx="7.5" cy="10.5" r="1" fill="currentColor"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/><circle cx="16.5" cy="10.5" r="1" fill="currentColor"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L10 21l-3-3L16.5 8.5a4 4 0 0 1-2-2z"/><path d="M14.5 6.5l3-3"/>',
  expand: '<path d="M4 9V4h5M20 15v5h-5M20 4l-6 6M4 20l6-6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  shirt: '<path d="M8 3l4 2 4-2 5 4-3 3-1-1v12H7V9L6 10 3 7z"/>',
  medal: '<circle cx="12" cy="14" r="6"/><path d="M8.5 9L6 2h4l2 5 2-5h4l-2.5 7"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  key: '<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M16 6l2 2M13 9l2 2"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>'
};
export function icon(name, cls = "") {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.info}</svg>`;
}
export function mentorPortrait(m, cls = "mentor-art") {
  const p = characterParts({ ...m.look, style: m.look.tie ? "suit" : "shirt" });
  return svg(`<circle cx="40" cy="40" r="38" fill="url(#g-platform)"/><g transform="translate(40 34) scale(.95)">${p.body}${p.head}</g><circle cx="40" cy="40" r="38" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`, "0 0 80 80", cls);
}
export function outfitPreview(o, cls = "outfit-art") {
  const p = characterParts({ top: o.top, accent: o.accent, pants: o.pants, style: o.style });
  return svg(`<g transform="translate(44 26)">${p.legs}${p.body}${p.armsDown}${p.head}</g>`, "0 0 88 136", cls);
}

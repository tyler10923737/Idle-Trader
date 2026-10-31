// office3d.js — the office as an isometric 3D room (SVG). Furniture appears with upgrades, the room
// changes with your net-worth tier, and the character / mentor are 2D sprites standing in 3D space.
import { camera, project, box, face, disc, shadow, decal, sprite, rotateY, toSVG, bounds, shade } from "./iso.js";
import { characterParts, cloud, skyline, plant, trophy, adjust, svg } from "./art.js";
import { DEALS } from "./data.js";
let TICKER = "";

const f = v => Math.round(v * 100) / 100;
const seeded = seed => { let s = seed % 2147483647 || 7; return () => (s = (s * 48271) % 2147483647) / 2147483647; };
TICKER = (() => { const rnd = seeded(97); const items = DEALS.map(d => { const up = rnd() > 0.4, v = (0.3 + rnd() * 5.5).toFixed(1); return `${up ? "▲" : "▼"} ${d.sym} ${up ? "+" : "-"}${v}%`; }).join("   "); return `TRADE DESK LIVE   ${items}      TRADE DESK LIVE   ${items}`; })();

// 2D screen content for a monitor decal (local coords 0..w, 0..h)
function screen(w, h, seed, accent = "#39f0a3") {
  const rnd = seeded(seed); let pts = "", v = h * 0.55;
  for (let i = 0; i <= 12; i++) { v = Math.max(h * 0.2, Math.min(h * 0.9, v + (rnd() - 0.5) * h * 0.4)); pts += `${f(3 + i * (w - 6) / 12)},${f(h - v)} `; }
  let bars = "";
  for (let i = 0; i < 8; i++) { const bh = 3 + rnd() * (h * 0.35), up = rnd() > 0.4; bars += `<rect class="${i % 2 ? "bar" : ""}" style="animation-delay:${(i * 230) % 1700}ms;transform-origin:${f(6 + i * (w - 12) / 8 + 1.5)}px ${f(h - 3)}px" x="${f(6 + i * (w - 12) / 8)}" y="${f(h - 3 - bh)}" width="3" height="${f(bh)}" rx=".8" fill="${up ? accent : "#ff5c7a"}" opacity=".75"/>`; }
  return `<rect width="${w}" height="${h}" fill="url(#g-screen)"/><path d="M0 ${h / 3} H${w} M0 ${2 * h / 3} H${w}" stroke="#fff" stroke-opacity=".08"/><rect width="${w}" height="6" fill="#fff" opacity=".08"/><circle cx="4" cy="3" r="1.3" fill="#ff5c7a"/><circle cx="8.5" cy="3" r="1.3" fill="#ffd23f"/><circle cx="13" cy="3" r="1.3" fill="${accent}"/>${bars}<polyline class="chart" points="${pts}" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect width="${w}" height="${h}" fill="url(#g-shine)" opacity=".22"/>`;
}
function monitor3d(x, y, z, w, h, yaw, seed, accent, stand = true) {
  const items = [...box(x, y, z, w, h, 5, "#1c1f33")];
  if (stand) items.push(...box(x + w / 2 - 4, y - 9, z - 1, 8, 9, 8, "#2a2e45"), ...box(x + w / 2 - 15, y - 10.5, z - 3, 30, 1.5, 14, "#2a2e45"));
  items.push(decal([x + 4, y + h - 4, z + 5.2], [w - 8, 0, 0], [0, -(h - 8), 0], (ww, hh) => screen(ww, hh, seed, accent), { bias: 0.6 }));
  const c = [x + w / 2, y, z + 2.5];
  rotateY(items, yaw, c);
  return items;
}
function charSprite(outfit, pose) {
  const p = characterParts(outfit);
  if (pose === "body") return cam => `<g transform="translate(0 ${f(-122 * cam.cp)})"><g class="chara-sit">${p.body}${p.head}</g></g>`;
  if (pose === "arms") return cam => `<g transform="translate(0 ${f(-122 * cam.cp)})"><g class="chara-arms">${p.arms}</g></g>`;
  return cam => `<g transform="translate(0 ${f(-106 * cam.cp)}) scale(.82)">${p.legs}${p.body}${p.armsDown}${p.head}</g>`;
}

export const OFFICE_CAM = { theta: -0.5, phi: 0.42, scale: 0.88, cx: 178, cy: 252 };

export function officeSVG3D(v) {
  const t = v.tier, u = v.upgrades, night = t >= 4, dusk = t === 3, dark = night || dusk;
  const cam = camera(OFFICE_CAM);
  const wall = ["#e9eef7", "#dff0ff", "#ece6ff", "#3a3d7a", "#23245c"][t];
  const floor = ["#c98f55", "#c98f55", "#5b6fd6", "#2c2f5a", "#1e2048"][t];
  const trim = dark ? "#ffc43d" : adjust(wall, -0.18);
  const sky = night ? "url(#g-night)" : dusk ? "url(#g-dusk)" : "url(#g-sky)";
  const frame = dark ? "#11143a" : "#ffffff";
  const F = [];
  // ---- room shell
  const X0 = -230, X1 = 230, Z0 = -170, Z1 = 150, H = 240;
  F.push(face([[X0, 0, Z0], [X1, 0, Z0], [X1, 0, Z1], [X0, 0, Z1]], floor, { layer: 0, twoSided: true }));
  F.push(face([[X0, 0, Z0], [X1, 0, Z0], [X1, H, Z0], [X0, H, Z0]], wall, { layer: 0, twoSided: true }));
  F.push(face([[X0, 0, Z0], [X0, H, Z0], [X0, H, Z1], [X0, 0, Z1]], shade(wall, 0.9), { layer: 0, twoSided: true }));
  // floor pattern
  F.push(decal([X0, 0.2, Z0], [X1 - X0, 0, 0], [0, 0, Z1 - Z0], (w, h) => {
    if (t <= 1) { let s = ""; for (let i = 1; i < 13; i++) s += `<path d="M0 ${f(i * h / 13)} H${w}" stroke="#000" stroke-opacity=".13" stroke-width="1.5"/>`; for (let i = 0; i < 8; i++) s += `<path d="M${f(i * w / 7 + (i % 2) * 30)} ${f((i % 3) * h / 13)} v${f(h / 13)}" stroke="#000" stroke-opacity=".12" stroke-width="1.5"/>`; return s; }
    if (t === 2) return `<rect width="${w}" height="${h}" fill="#fff" opacity=".05"/>`;
    let s = ""; for (let i = 1; i < 6; i++) s += `<path d="M${f(i * w / 6)} 0 V${h} M0 ${f(i * h / 6)} H${w}" stroke="#fff" stroke-opacity=".07" stroke-width="2"/>`; return s + `<ellipse cx="${w / 2}" cy="${h * 0.6}" rx="${w * 0.35}" ry="${h * 0.2}" fill="#ffc43d" opacity=".07"/>`;
  }, { layer: 0, bias: 0.2 }));
  if (t >= 1) F.push(decal([-170, 0.4, -40], [340, 0, 0], [0, 0, 150], (w, h) => `<rect width="${w}" height="${h}" rx="18" fill="${t >= 3 ? "#5b3f9e" : "#ff8a73"}" opacity=".55"/><rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="12" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>`, { layer: 0, bias: 0.3 }));
  // baseboards + wall trim
  F.push(...box(X0, 0, Z0, X1 - X0, 7, 5, trim), ...box(X0, 0, Z0, 5, 7, Z1 - Z0, trim));
  if (t >= 3) F.push(decal([X0, 152, Z0 + 0.3], [X1 - X0, 0, 0], [0, -3, 0], (w, h) => `<rect width="${w}" height="${h}" fill="#ffc43d" opacity=".55"/>`, { layer: 0, bias: 0.1 }), decal([X0 + 0.3, 152, Z0], [0, 0, Z1 - Z0], [0, -3, 0], (w, h) => `<rect width="${w}" height="${h}" fill="#ffc43d" opacity=".45"/>`, { layer: 0, bias: 0.1 }));
  // ---- window (tap -> properties)
  const win = t === 0 ? { x0: -80, x1: 60, y0: 90, y1: 190 } : t === 1 ? { x0: -130, x1: 80, y0: 82, y1: 205 } : { x0: -175, x1: 96, y0: 72, y1: 218 };
  F.push(decal([win.x0 - 7, win.y1 + 7, Z0 + 0.5], [win.x1 - win.x0 + 14, 0, 0], [0, -(win.y1 - win.y0 + 14), 0], (w, h) => {
    const iw = w - 14, ih = h - 14;
    let s = `<rect width="${w}" height="${h}" rx="8" fill="${frame}"/><rect x="7" y="7" width="${iw}" height="${ih}" rx="3" fill="${sky}"/><clipPath id="c-win"><rect x="7" y="7" width="${iw}" height="${ih}" rx="3"/></clipPath><g clip-path="url(#c-win)">`;
    s += night ? `<circle cx="${w - 44}" cy="36" r="13" fill="#fff6d5"/><circle cx="${w - 50}" cy="32" r="11" fill="#1b1f5e" opacity=".9"/>` : `<circle cx="${w - 46}" cy="38" r="17" fill="#ffe27a"/><circle cx="${w - 46}" cy="38" r="27" fill="url(#g-glow)" opacity=".6"/>`;
    s += cloud(40, 34, 0.75) + cloud(w - 92, 64, 0.5, "drift2") + skyline(0, w + 10, h - 7, { night: dark, count: 8 + t * 2, maxH: 44 + t * 14, seed: 17 });
    s += `</g><rect x="${w / 2 - 2.5}" y="7" width="5" height="${ih}" fill="${frame}"/><rect x="7" y="${h / 2 - 2.5}" width="${iw}" height="5" fill="${frame}"/><polygon points="17,7 57,7 27,${h - 7} 7,${h - 7}" fill="#fff" opacity=".1"/>`;
    return s;
  }, { bias: 0.3, cls: "hot", attrs: ' data-go="properties"' }));
  // ticker (Parallel Deals)
  if (u.slots >= 1) F.push(decal([X0, H, Z0 + 0.5], [X1 - X0, 0, 0], [0, -16, 0], (w, h) => `<rect width="${w}" height="${h}" fill="#0b0e24"/><text class="tick" x="0" y="11.5" font-size="8.5" font-weight="700" fill="#39f0a3" font-family="Fredoka, sans-serif">${TICKER}</text>`, { bias: 0.3 }));
  // door to the garage (tap -> garage)
  F.push(decal([112, 172, Z0 + 0.5], [62, 0, 0], [0, -172, 0], (w, h) => `<rect width="${w}" height="${h}" rx="4" fill="${dark ? "#4a4f8a" : "#d7dde9"}"/><rect x="6" y="6" width="${w - 12}" height="${h - 6}" rx="3" fill="${t >= 2 ? "#5b6fd6" : "#a0693f"}"/><rect x="6" y="6" width="${w - 12}" height="${h - 6}" rx="3" fill="url(#g-shade)" opacity=".4"/><rect x="13" y="16" width="${w - 26}" height="48" rx="2" fill="url(#g-glass)" opacity=".9"/><rect x="13" y="74" width="${w - 26}" height="60" rx="2" fill="#000" opacity=".12"/><circle cx="${w - 12}" cy="${h * 0.55}" r="2.8" fill="url(#g-gold)"/>`, { bias: 0.3, cls: "hot", attrs: ' data-go="garage"' }));
  F.push(decal([106, 194, Z0 + 0.6], [74, 0, 0], [0, -18, 0], (w, h) => `<rect width="${w}" height="${h}" rx="4" fill="#1f2d5c"/><text x="${w / 2}" y="12.5" text-anchor="middle" font-size="9" font-weight="700" fill="#ffd23f" font-family="Fredoka, sans-serif" letter-spacing=".5">GARAGE</text>`, { bias: 0.35 }));
  // wall clock on the left wall
  F.push(decal([X0 + 0.5, 196, 20], [0, 0, 34], [0, -34, 0], (w, h) => `<circle cx="17" cy="17" r="16" fill="#fff" stroke="#1f2d5c" stroke-width="3"/><path d="M17 17 V7 M17 17 L24 21" stroke="#1f2d5c" stroke-width="2.4" stroke-linecap="round"/><circle cx="17" cy="17" r="1.8" fill="#ff5c7a"/>`, { bias: 0.3 }));
  // TV on the left wall (automation 2+)
  if (u.automation >= 2) F.push(decal([X0 + 0.5, 205, -140], [0, 0, 84], [0, -52, 0], (w, h) => `<rect width="${w}" height="${h}" rx="4" fill="#1c1f33"/><g transform="translate(4 4)">${screen(w - 8, h - 8, 303, "#ffd23f")}</g>`, { bias: 0.3 }));
  // server rack (automation)
  if (u.automation >= 1) {
    F.push(...box(X0 + 2, 0, -80, 46, 110, 40, "#2f3542"), shadow(X0 + 25, -60, 34, 30, 0.22));
    F.push(decal([X0 + 48.5, 106, -80], [0, 0, 40], [0, -100, 0], (w, h) => { let s = ""; for (let i = 0; i < Math.min(6, 2 + u.automation); i++) s += `<rect x="4" y="${4 + i * 15}" width="${w - 8}" height="11" rx="2" fill="#1b1e27"/><circle class="led" style="animation-delay:${i * 310}ms" cx="9" cy="${9.5 + i * 15}" r="1.8" fill="#39f0a3"/><circle class="led" style="animation-delay:${i * 470 + 200}ms" cx="15" cy="${9.5 + i * 15}" r="1.8" fill="#2d8cff"/><path d="M21 ${9.5 + i * 15} H${w - 7}" stroke="#3d4663" stroke-width="2"/>`; return s; }, { bias: 0.6 }));
  }
  // bookshelf (research)
  if (u.research >= 1) {
    const bx = -205;
    F.push(...box(bx, 0, Z0 + 2, 60, 150, 30, "#8d5a3b"), shadow(bx + 30, Z0 + 20, 40, 26, 0.22));
    F.push(decal([bx, 150, Z0 + 32.5], [60, 0, 0], [0, -150, 0], (w, h) => {
      const rnd = seeded(31), cols = ["#ff5c7a", "#2d8cff", "#ffd23f", "#2ecc71", "#9b5cff", "#ff8a3c", "#4fd3ff"], books = Math.min(18, 5 + u.research * 3);
      let s = `<rect width="${w}" height="${h}" fill="#8d5a3b"/>`;
      for (let sh = 0; sh < 4; sh++) {
        s += `<rect x="4" y="${8 + sh * 36}" width="${w - 8}" height="30" fill="#5d3a22"/><rect x="2" y="${38 + sh * 36}" width="${w - 4}" height="4" fill="#a0693f"/>`;
        let x = 6; for (let b = 0; b < 6 && sh * 6 + b < books; b++) { const bw = 5 + rnd() * 4, bh = 18 + rnd() * 9; s += `<rect x="${f(x)}" y="${f(38 + sh * 36 - bh)}" width="${f(bw)}" height="${f(bh)}" rx="1" fill="${cols[(sh * 6 + b) % cols.length]}"/>`; x += bw + 1.5; }
      }
      return s;
    }, { bias: 0.6 }));
    if (u.research >= 3) F.push(sprite([bx + 30, 150, Z0 + 17], () => `<circle cy="-11" r="10" fill="#2d8cff"/><path d="M-8 -15 Q0 -19 8 -13 M-7 -7 Q0 -3 7 -8" stroke="#2ecc71" stroke-width="3" fill="none"/><rect x="-3" y="-2" width="6" height="3" fill="#8d5a3b"/>`, { bias: 1 }));
    if (v.prestiges >= 1) for (let i = 0; i < Math.min(3, v.prestiges); i++) F.push(sprite([bx + 10 + i * 20, 150, Z0 + 10], () => trophy(0, 0, 0.6), { bias: 1 }));
  }
  // plants (multiplier)
  if (u.multiplier >= 1) F.push(sprite([200, 0, -120], cam => plant(0, 0, 1.05), { bias: 0.4, depthPoint: [200, 20, -120] }), shadow(200, -120, 18, 10, 0.2));
  if (u.multiplier >= 3) F.push(sprite([-195, 0, 95], cam => plant(0, 0, 0.85, "sway2"), { bias: 0.4, depthPoint: [-195, 20, 95] }), shadow(-195, 95, 15, 9, 0.2));
  // ---- desk area
  const dw = 220 + Math.min(80, u.capacity * 8);
  const deskTop = t >= 3 ? "#2b2f55" : t === 2 ? "#f6f7fb" : "#b97a46", deskFront = adjust(deskTop, -0.18);
  const chairCols = [["#7b8794", "#5f6b7a"], ["#2f3542", "#1e232d"], ["#8b4513", "#6b3410"], ["#f4f6fb", "#d9dde8"]], cc = chairCols[Math.min(3, Math.floor(u.setup / 2))];
  F.push(shadow(0, 24, dw / 2 + 14, 58, 0.25), shadow(0, -28, 44, 34, 0.18));
  // chair
  F.push(...box(-7, 0, -34, 14, 36, 14, "#2a2e3a"), disc(0, 0.6, -27, 28, 20, "#2a2e3a", { layer: 0.6 }));
  F.push(...box(-32, 36, -56, 64, 10, 54, cc[1]), ...box(-32, 44, -58, 64, 94, 10, cc[0]), ...box(-22, 138, -57, 44, 18, 9, cc[1]));
  if (u.setup >= 6) F.push(decal([-30, 136, -47.5], [60, 0, 0], [0, -90, 0], (w, h) => `<path d="M8 14 Q${w / 2} 8 ${w - 8} 14 M8 36 Q${w / 2} 30 ${w - 8} 36 M8 58 Q${w / 2} 52 ${w - 8} 58" stroke="#ffc43d" stroke-width="1.5" fill="none" opacity=".8"/>`, { bias: 0.6 }));
  // character (body behind the desk, arms over it)
  F.push(sprite([0, 0, -22], charSprite(v.outfit, "body"), { depthPoint: [0, 60, -22], bias: 0.5 }));
  F.push(sprite([0, 0, -22], charSprite(v.outfit, "arms"), { depthPoint: [0, 86, 40], bias: 0.8 }));
  // desk
  F.push(...box(-dw / 2 + 6, 0, 54, dw - 12, 70, 10, deskFront), ...box(-dw / 2 + 4, 0, -4, 9, 70, 66, deskFront), ...box(dw / 2 - 13, 0, -4, 9, 70, 66, deskFront));
  F.push(...box(-dw / 2, 70, -12, dw, 12, 82, deskTop, { colors: { top: adjust(deskTop, 0.12) } }));
  if (t >= 3) F.push(...box(-dw / 2, 80, 69.5, dw, 2.4, 1.2, "#ffc43d"), ...box(-dw / 2 + 8, 1, 63.5, dw - 16, 2, 1.2, "#ffc43d"), disc(0, 0.5, 80, dw / 2, 22, "#ffc43d", { layer: 0.55, opacity: 0.1 }));
  // monitors
  F.push(...monitor3d(48, 92, 2, 70, 50, -0.3, 101, "#39f0a3"));
  if (u.duration >= 3) F.push(...monitor3d(-118, 92, 2, 70, 50, 0.3, 202, "#ffd23f"));
  if (u.duration >= 6) F.push(...box(80, 82, -6, 5, 64, 5, "#2a2e45"), ...monitor3d(52, 146, -4, 58, 36, -0.3, 303, "#4fd3ff", false));
  // keyboard, mouse, mug, phone, lamp, desk plant
  F.push(...box(-26, 82, 30, 52, 2.5, 18, "#2a2e45"), decal([-24, 84.7, 31], [48, 0, 0], [0, 0, 16], (w, h) => `<path d="M2 4 H${w - 2} M2 8 H${w - 2} M2 12 H${w - 2}" stroke="#5b6fd6" stroke-width="1.2" opacity=".8"/>`, { bias: 0.5 }));
  F.push(...box(36, 82, 36, 8, 3, 12, "#2a2e45"));
  F.push(...box(-64, 82, 34, 11, 14, 11, "#ff5c7a"), sprite([-58, 96, 34], () => `<path class="steam" d="M-3 0 q2 -4 0 -8 M3 0 q2 -4 0 -8" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".7"/>`, { bias: 1 }));
  if (u.setup >= 1) F.push(...box(dw / 2 - 42, 82, 40, 9, 1.5, 16, "#1b1e27"), face([[dw / 2 - 40.5, 83.7, 42], [dw / 2 - 34.5, 83.7, 42], [dw / 2 - 34.5, 83.7, 54], [dw / 2 - 40.5, 83.7, 54]], "#4fd3ff", { noShade: true, bias: 0.6 }));
  if (u.setup >= 3) F.push(...box(dw / 2 - 28, 82, 6, 4, 44, 4, "#1f2d5c"), ...box(dw / 2 - 40, 126, 0, 28, 10, 18, "#ffd23f"), disc(dw / 2 - 26, 82.6, 20, 20, 12, "#ffd23f", { layer: 1, opacity: 0.18, bias: 0.55 }));
  if (u.multiplier >= 2) F.push(sprite([-dw / 2 + 16, 82, 18], () => plant(0, 0, 0.45, "sway2"), { bias: 1, depthPoint: [-dw / 2 + 16, 90, 18] }));
  // mentor standing front-left
  if (v.mentor) {
    const look = { ...v.mentor.look, style: v.mentor.look.tie ? "suit" : "shirt" };
    F.push(shadow(-172, 72, 22, 11, 0.22), sprite([-172, 0, 72], charSprite(look, "stand"), { depthPoint: [-172, 50, 72], bias: 0.6 }));
    F.push(sprite([-172, 0, 72], cam => `<g transform="translate(0 ${f(-150 * cam.cp)})"><rect x="-4" y="-22" width="100" height="24" rx="9" fill="#fff"/><path d="M4 2 L0 12 L16 2Z" fill="#fff"/><text x="46" y="-6" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1f2d5c" font-family="Fredoka, sans-serif">${v.mentor.bonus}</text></g>`, { depthPoint: [-172, 150, 72], bias: 2 }));
  }
  // ---- compose
  let s = `<rect width="390" height="300" fill="${shade(wall, 0.75)}"/>`;
  s += toSVG(cam, F);
  if (dark) s += `<rect width="390" height="300" fill="#ffc43d" opacity=".04" pointer-events="none"/>`;
  s += `<rect class="flash" width="390" height="300" fill="#39f0a3" opacity="0" pointer-events="none"/>`;
  const b = bounds(cam, [[-dw / 2, 70, -12], [dw / 2, 70, -12], [dw / 2, 82, 70], [-dw / 2, 82, 70], [-118, 150, 2], [118, 190, 2]]);
  s += `<rect class="hot hot-desk" data-go="upgrades" x="${f(b.x0 - 4)}" y="${f(b.y0 - 4)}" width="${f(b.w + 8)}" height="${f(b.h + 8)}" fill="transparent"/>`;
  return svg(s, "0 0 390 300", "office-art", 'preserveAspectRatio="xMidYMax slice"');
}

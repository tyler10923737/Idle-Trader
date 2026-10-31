// scenes3d.js — composes the 3D models into the pictures the game shows: asset cards, the
// neighborhood / business-district strips, parking tiles and the canvas showroom turntable.
import { camera, project, face, disc, shadow, sprite, toSVG, toCanvas, bounds, translateItems, rotateItems, basis } from "./iso.js";
import { carModel, platformModel, buildingModel } from "./models.js";
import { cloud, skyline, svg, characterParts } from "./art.js";

const f = v => Math.round(v * 100) / 100;
const GROUND = { property: "#5ad26b", business: "#b0bec5" };

// ---------- asset card (200 x 140) ----------
export function assetScene3D(asset, cls = "scene-art") {
  const model = buildingModel(asset.id);
  const pts = model.flatMap(it => it.pts);
  const cam0 = camera({ theta: -0.6, phi: 0.45, scale: 1 });
  const b = bounds(cam0, pts);
  const scale = Math.min(0.95, 168 / b.w, 104 / b.h);
  const cam = camera({ theta: -0.6, phi: 0.45, scale, cx: 100 - (b.x0 + b.x1) / 2 * scale, cy: 128 - b.y1 * scale });
  const night = asset.id === "penthouse" || asset.id === "tower" || asset.id === "bank";
  const sky = night ? "url(#g-night)" : "url(#g-sky)";
  const ground = face([[-900, 0, -900], [900, 0, -900], [900, 0, 900], [-900, 0, 900]], GROUND[asset.kind] || GROUND.property, { layer: 0, twoSided: true });
  let s = `<rect width="200" height="140" fill="${sky}"/>`;
  s += night ? `<circle cx="160" cy="26" r="10" fill="#fff6d5"/>` : `<circle cx="162" cy="26" r="14" fill="#ffe27a"/>` + cloud(48, 22, 0.55) + cloud(140, 44, 0.4, "drift2");
  s += `<g opacity=".45">${skyline(0, 200, 72, { night, count: 9, maxH: 36, seed: asset.id.length * 7 })}</g>`;
  s += toSVG(cam, [ground, ...model]);
  return svg(s, "0 0 200 140", cls);
}

// ---------- owned strip (neighborhood / district) ----------
// Front-on camera so the street stays straight; each building is turned 3/4 individually.
export function collectionStrip3D(items, kind) {
  const n = Math.max(items.length, 1), K = 0.68, w = Math.max(390, 70 + n * 134), H = 180;
  const urban = kind === "business";
  const cam = camera({ theta: 0, phi: 0.5, scale: K, cx: 0, cy: 150 });
  let s = `<rect width="${w}" height="${H}" fill="url(#g-sky)"/><circle cx="${w - 60}" cy="34" r="18" fill="#ffe27a"/>${cloud(70, 34, 0.8)}${cloud(260, 58, 0.6, "drift2")}${cloud(w - 160, 30, 0.7)}`;
  s += `<g opacity=".5">${skyline(0, w, 112, { night: false, count: Math.floor(w / 34), maxH: 56, seed: urban ? 5 : 3 })}</g>`;
  const F = [], X1 = w / K + 200;
  F.push(face([[-200, 0, -120], [X1, 0, -120], [X1, 0, 160], [-200, 0, 160]], urban ? "#8d99ae" : "#5ad26b", { layer: 0, twoSided: true }));
  if (!urban) F.push(face([[-200, 0.2, -120], [X1, 0.2, -120], [X1, 0.2, -80], [-200, 0.2, -80]], "#4cbf5e", { layer: 0, twoSided: true, bias: 0.1 }));
  F.push(face([[-200, 0.2, 88], [X1, 0.2, 88], [X1, 0.2, 150], [-200, 0.2, 150]], "#3d4663", { layer: 0, twoSided: true, bias: 0.1 }));
  if (urban) F.push(face([[-200, 0.3, 80], [X1, 0.3, 80], [X1, 0.3, 88], [-200, 0.3, 88]], "#b0bec5", { layer: 0, twoSided: true, bias: 0.15 }));
  for (let x = -150; x < X1; x += 50) F.push(face([[x, 0.4, 117], [x + 26, 0.4, 117], [x + 26, 0.4, 121], [x, 0.4, 121]], urban ? "#ffd23f" : "#ffffff", { layer: 0, twoSided: true, noShade: true, bias: 0.2, opacity: 0.85 }));
  if (!items.length) F.push(sprite([w / K / 2, 0, 20], () => `<g transform="translate(-60 -110)"><rect x="30" y="40" width="60" height="70" rx="4" fill="#ffffff" opacity=".25" stroke="#fff" stroke-dasharray="6 5"/><rect x="36" y="60" width="48" height="26" rx="3" fill="#ffd23f"/><text x="60" y="77" text-anchor="middle" font-size="11" font-weight="700" fill="#1f2d5c" font-family="Fredoka, sans-serif">FOR SALE</text><rect x="58" y="86" width="4" height="24" fill="#8d6e63"/></g>`, { bias: 1 }));
  items.forEach((it, i) => {
    const x = 100 + i * 196;
    F.push(...translateItems(rotateItems(buildingModel(it.asset.id), -0.6), [x, 0, 0]));
    if (it.count > 1) F.push(sprite([x + 52, 118, 0], () => `<g class="pop"><circle r="12" fill="#ffd23f" stroke="#fff" stroke-width="2"/><text y="4" text-anchor="middle" font-size="11" font-weight="700" fill="#1f2d5c" font-family="Fredoka, sans-serif">×${it.count}</text></g>`, { bias: 90 }));
  });
  s += toSVG(cam, F);
  return svg(s, `0 0 ${w} ${H}`, "strip-art", `data-w="${w}" preserveAspectRatio="xMidYMid slice"`);
}

// ---------- parking tile (160 x 100) ----------
export function parkingSVG3D(car, color) {
  const cam = camera({ theta: -0.62, phi: 0.46, scale: 0.36, cx: 80, cy: 56 });
  const F = [face([[-200, 0, -200], [200, 0, -200], [200, 0, 200], [-200, 0, 200]], "#2c2f5a", { layer: 0, twoSided: true })];
  const L = 120, Wd = 70;
  F.push(face([[-L, 0.3, -Wd], [L, 0.3, -Wd], [L, 0.3, -Wd + 5], [-L, 0.3, -Wd + 5]], "#ffd23f", { layer: 0, twoSided: true, noShade: true, bias: 0.2, opacity: 0.9 }));
  F.push(face([[-L, 0.3, Wd - 5], [L, 0.3, Wd - 5], [L, 0.3, Wd], [-L, 0.3, Wd]], "#ffd23f", { layer: 0, twoSided: true, noShade: true, bias: 0.2, opacity: 0.9 }));
  F.push(face([[-L, 0.3, -Wd], [-L + 5, 0.3, -Wd], [-L + 5, 0.3, Wd], [-L, 0.3, Wd]], "#ffd23f", { layer: 0, twoSided: true, noShade: true, bias: 0.2, opacity: 0.9 }));
  let s = `<rect width="160" height="100" rx="10" fill="#2c2f5a"/><rect width="160" height="100" rx="10" fill="url(#g-floorfade)"/>`;
  if (car) F.push(...carModel(car.body, color));
  else F.push(sprite([0, 0, 0], () => `<text y="12" text-anchor="middle" font-size="40" font-weight="700" fill="#fff" opacity=".18" font-family="Fredoka, sans-serif">P</text>`, { bias: 1 }));
  s += toSVG(cam, F.slice(0, 1));
  s += toSVG(cam, F.slice(1));
  return svg(s, "0 0 160 100", "park-art");
}

// ---------- showroom turntable (canvas) ----------
// Draws the platform, the featured car (rotated by theta), two background cars and a reflection.
let offscreen = null;
export function drawShowroom(ctx, w, h, o) {
  const k = w / 390;
  ctx.clearRect(0, 0, w, h);
  // background cars, dimmed
  if (o.prev) { ctx.globalAlpha = 0.55; toCanvas(ctx, camera({ theta: -1.1, phi: 0.4, scale: 0.36 * k, cx: w * 0.16, cy: h * 0.5 }), carModel(o.prev.body, o.prev.color, { noShadow: true })); ctx.globalAlpha = 1; }
  if (o.next) { ctx.globalAlpha = 0.55; toCanvas(ctx, camera({ theta: 1.1, phi: 0.4, scale: 0.36 * k, cx: w * 0.84, cy: h * 0.5 }), carModel(o.next.body, o.next.color, { noShadow: true })); ctx.globalAlpha = 1; }
  const cam = camera({ theta: o.theta, phi: 0.4, scale: 0.92 * k, cx: w / 2, cy: h * 0.62 });
  toCanvas(ctx, cam, platformModel(150, 14, { ringOffset: o.time / 40 }));
  const car = carModel(o.body, o.color);
  // reflection: the car flipped in screen space around its ground line, clipped to the platform top
  const g = project(cam, [0, 0, 0]);
  if (!offscreen || offscreen.width !== ctx.canvas.width || offscreen.height !== ctx.canvas.height) { offscreen = document.createElement("canvas"); offscreen.width = ctx.canvas.width; offscreen.height = ctx.canvas.height; }
  const oc = offscreen.getContext("2d"); oc.setTransform(ctx.getTransform()); oc.clearRect(0, 0, w, h);
  toCanvas(oc, cam, car.filter(it => !(it.pts.length > 4 && it.opacity)));
  const b = basis(cam);
  ctx.save();
  ctx.beginPath(); ctx.save(); ctx.transform(b.x[0] * 150, b.x[1] * 150, b.z[0] * 150, b.z[1] * 150, g[0], g[1]); ctx.arc(0, 0, 0.98, 0, Math.PI * 2); ctx.restore(); ctx.clip();
  ctx.globalAlpha = 0.2; ctx.translate(0, g[1] * 2 + 3); ctx.scale(1, -1);
  ctx.drawImage(offscreen, 0, 0, offscreen.width, offscreen.height, 0, 0, w, h);
  ctx.restore();
  toCanvas(ctx, cam, car);
}
export function characterSVGStanding(outfit) {
  const p = characterParts(outfit);
  return `<g transform="translate(46 170) scale(.62)">${p.legs}${p.body}${p.armsDown}${p.head}</g>`;
}

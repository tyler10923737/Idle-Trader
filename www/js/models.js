// models.js — 3D models built from small parametric descriptions: cars (extruded from the side
// profiles in art.js), the showroom turntable, buildings and businesses, and the office room.
import { face, box, prism, disc, shadow, decal, sprite, orient, rotateY, translate, project, basis, faceNormal, add, sub, mul, norm, dot, wheelEllipse, shade } from "./iso.js";
import { CAR, adjust, bush as bushSprite, tree as treeSprite, palm as palmSprite } from "./art.js";

const f = v => Math.round(v * 100) / 100;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------- helpers ----------
// A small quad lying on the face spanned by edge a->b (in x-y) extruded in z, pushed outward slightly.
function patch(a, b, z0, z1, u0, u1, color, center, o = {}) {
  const P = (u, z) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, z];
  const q = face([P(u0, z0), P(u1, z0), P(u1, z1), P(u0, z1)], color, { bias: 0.4 + (o.lift ?? 0.6) * 0.05, ...o });
  orient([q], center);
  const n = faceNormal(q.pts); q.pts = q.pts.map(p => add(p, mul(n, o.lift ?? 0.6)));
  return q;
}
// A flat quad on a side plane z = zc (x-y rectangle), pushed outward.
function sidePatch(x0, y0, x1, y1, zc, dir, color, o = {}) {
  const z = zc + dir * (o.lift ?? 0.6);
  const pts = dir > 0 ? [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]] : [[x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z]];
  return face(pts, color, { bias: 0.4 + (o.lift ?? 0.6) * 0.05, ...o });
}
function wheel(cx, cy, cz, r, width, dir) {
  const spokes = 5;
  const ends = c => [c, [c[0], c[1], c[2] - dir * width]];
  return {
    pts: [[cx, cy, cz]], custom: true, color: "#000", bias: 0, r, width, dir,
    draw(ctx, it, cam) {
      const [outer, inner] = ends(this.pts[0]);
      const dO = project(cam, outer)[2], dI = project(cam, inner)[2];
      const first = dO > dI ? inner : outer, second = dO > dI ? outer : inner;
      for (let k = 0; k < 4; k++) wheelEllipse(ctx, cam, lerp(first, second, k / 4), r, k ? "#171a23" : "#111319");
      wheelEllipse(ctx, cam, second, r, "#1b1e27");
      wheelEllipse(ctx, cam, second, r * 0.63, "#d5dbe6");
      wheelEllipse(ctx, cam, second, r * 0.5, "#b4bccb");
      const b = basis(cam), q = project(cam, second);
      ctx.save(); ctx.transform(b.x[0] * r, b.x[1] * r, b.y[0] * r, b.y[1] * r, q[0], q[1]);
      ctx.beginPath(); for (let i = 0; i < spokes; i++) { const a = i / spokes * Math.PI * 2 - Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 0.5, Math.sin(a) * 0.5); }
      ctx.restore(); ctx.strokeStyle = "#7d8798"; ctx.lineWidth = Math.max(1, r * cam.scale * 0.13); ctx.lineCap = "round"; ctx.stroke();
      wheelEllipse(ctx, cam, second, r * 0.16, "#59627a");
    },
    svg(it, cam) {
      const [outer, inner] = ends(this.pts[0]);
      const dO = project(cam, outer)[2], dI = project(cam, inner)[2];
      const first = dO > dI ? inner : outer, second = dO > dI ? outer : inner;
      const b = basis(cam);
      const circ = (c, rr, fill) => { const q = project(cam, c); return `<circle r="1" transform="matrix(${f(b.x[0] * rr)} ${f(b.x[1] * rr)} ${f(b.y[0] * rr)} ${f(b.y[1] * rr)} ${f(q[0])} ${f(q[1])})" fill="${fill}"/>`; };
      let s = "";
      for (let k = 0; k < 4; k++) s += circ(lerp(first, second, k / 4), r, k ? "#171a23" : "#111319");
      s += circ(second, r, "#1b1e27") + circ(second, r * 0.63, "#d5dbe6") + circ(second, r * 0.5, "#b4bccb");
      const q = project(cam, second); let sp = "";
      for (let i = 0; i < spokes; i++) { const a = i / spokes * Math.PI * 2 - Math.PI / 2; sp += `M0 0 L${f(Math.cos(a) * 0.5)} ${f(Math.sin(a) * 0.5)}`; }
      s += `<path d="${sp}" transform="matrix(${f(b.x[0] * r)} ${f(b.x[1] * r)} ${f(b.y[0] * r)} ${f(b.y[1] * r)} ${f(q[0])} ${f(q[1])})" stroke="#7d8798" stroke-width="${f(Math.max(1, r * cam.scale * 0.13))}" vector-effect="non-scaling-stroke" stroke-linecap="round" fill="none"/>`;
      s += circ(second, r * 0.16, "#59627a");
      return s;
    }
  };
}

// ---------- CAR ----------
export const CAR_W = 92;
export function carModel(body, color, o = {}) {
  const s = CAR[body] || CAR.sedan;
  const mid = (s.rear + s.front) / 2, X = x => x - mid, Y = y => 111 - y;
  const G = 92 - (s.lift || 0), W = o.width || CAR_W, hw = W / 2, cab = hw - 9;
  const dark = adjust(color, -0.45), glass = o.glass || "#a9e0ff", faces = [];
  const deckIsCabin = !s.openTop && (s.belt - s.trunkY) > 14;
  const cabBaseR = Math.max(s.trunkY, s.belt), cabBaseF = Math.max(s.hoodY, s.belt);
  const M = pts => pts.map(([x, y]) => [X(x), Y(y)]);
  // lower body profile (spec coords, y down) — counter-clockwise once mapped (y up)
  let lower;
  if (s.openTop) lower = [[s.rear, G], [s.rear, s.bumperH], [s.rear + 8, s.trunkY], [s.hoodStart - 8, s.trunkY], [s.hoodStart, s.hoodY], [s.front - 12, s.hoodY + 2], [s.front, s.bumperH], [s.front, G]];
  else if (deckIsCabin) lower = [[s.rear, G], [s.rear, s.bumperH], [s.rear + 6, s.belt], [s.hoodStart, cabBaseF], [s.hoodStart, s.hoodY], [s.front - 12, s.hoodY + 2], [s.front, s.bumperH], [s.front, G]];
  else lower = [[s.rear, G], [s.rear, s.bumperH], [s.rear + 8, s.trunkY], [s.trunkStart, s.trunkY], [s.trunkStart, cabBaseR], [s.hoodStart, cabBaseF], [s.hoodStart, s.hoodY], [s.front - 12, s.hoodY + 2], [s.front, s.bumperH], [s.front, G]];
  const lowerM = M(lower);
  const center = [0, Y(G) + 20, 0];
  faces.push(...prism(lowerM, -hw, hw, color));
  // cabin (greenhouse), narrower than the body
  if (!s.openTop) {
    let cabin;
    if (deckIsCabin) cabin = [[s.rear + 6, s.belt], [s.rear + 8, s.trunkY], [s.trunkStart, s.trunkY], [s.roofStart, s.roofY], [s.roofEnd, s.roofY], [s.hoodStart, cabBaseF]];
    else { cabin = [[s.trunkStart, cabBaseR]]; if (s.trunkY < cabBaseR - 1) cabin.push([s.trunkStart, s.trunkY]); cabin.push([s.roofStart, s.roofY], [s.roofEnd, s.roofY], [s.hoodStart, cabBaseF]); }
    const cabinM = M(cabin), roofY = Y(s.roofY);
    const roofCol = s.roofColor || color;
    faces.push(...prism(cabinM, -cab, cab, color, {
      sideColor: glass,
      edge: (i, a, b) => (Math.abs(a[1] - roofY) < 0.01 && Math.abs(b[1] - roofY) < 0.01) ? roofCol : (a[1] <= Y(cabBaseR) + 0.01 && b[1] <= Y(cabBaseR) + 0.01 ? color : glass)
    }));
    // pillars (thin boxes through the cabin) + roof rails
    (s.pillars || [s.split]).forEach(px => faces.push(...box(X(px) - 2.2, Y(cabBaseR) - 1, -cab - 0.5, 4.4, Y(s.roofY) - Y(cabBaseR) - 2, cab * 2 + 1, color)));
    if (s.rack) { faces.push(...box(X(s.roofStart) + 12, roofY, -cab + 10, s.roofEnd - s.roofStart - 24, 3, 4, "#2f3542")); faces.push(...box(X(s.roofStart) + 12, roofY, cab - 14, s.roofEnd - s.roofStart - 24, 3, 4, "#2f3542")); }
    // door seams + handles on both sides (4-door bodies get a seam at every pillar), belt-line trim, shark-fin antenna
    [1, -1].forEach(d => {
      const seams = [...new Set([s.split, ...(s.pillars || [])])].filter(px => px > s.trunkStart + 6 && px < s.hoodStart - 4);
      seams.forEach(px => faces.push(sidePatch(X(px) - 0.7, Y(G) + 5, X(px) + 0.7, Y(s.belt) - 2, hw * d, d, dark, { noShade: true, opacity: 0.6 })));
      seams.forEach(px => faces.push(sidePatch(X(px) + 8, Y(s.belt) - 10, X(px) + 19, Y(s.belt) - 6.5, hw * d, d, dark, { noShade: true, opacity: 0.8 })));
      faces.push(sidePatch(X(s.rear) + 10, Y(G) + 3, X(s.front) - 10, Y(G) + 5.2, hw * d, d, "#1a1d26", { noShade: true, opacity: 0.55 }));
      faces.push(sidePatch(X(s.trunkStart) + 3, Y(s.belt) - 1.3, X(s.hoodStart) - 3, Y(s.belt) + 0.1, cab * d, d, s.chrome ? "#e8edf3" : dark, { noShade: true, opacity: 0.9, lift: 0.8 }));
      // side mirrors
      faces.push(...box(X(s.hoodStart) - 6, Y(s.belt) + 1, d > 0 ? cab + 2 : -cab - 9, 7, 5, 7, dark));
    });
    if (!s.spoiler && !s.bed) faces.push(...box(X(s.roofStart) + 6, Y(s.roofY), -2, 7, 2.6, 4, dark));
  } else {
    // roadster: windshield + seats + tonneau
    faces.push(face([[X(s.hoodStart - 18), Y(s.belt), -cab + 4], [X(s.hoodStart - 18), Y(s.belt), cab - 4], [X(s.hoodStart - 9), Y(s.belt - 20), cab - 4], [X(s.hoodStart - 9), Y(s.belt - 20), -cab + 4]], glass, { twoSided: true, opacity: 0.85 }));
    faces.push(...box(X(s.trunkStart) + 14, Y(s.belt), -cab + 6, 13, 12, 20, "#3a3f52"));
    faces.push(...box(X(s.trunkStart) + 14, Y(s.belt), cab - 26, 13, 12, 20, "#3a3f52"));
    faces.push(...box(X(s.trunkStart) + 4, Y(s.belt) - 1, -cab + 3, s.hoodStart - s.trunkStart - 14, 1.5, cab * 2 - 6, "#1b1e27"));
  }
  // lights, grille, bumpers (patches on the body faces)
  const L = lowerM, n = L.length;
  const edgeIdx = (p, q) => { for (let i = 0; i < n; i++) { const a = L[i], b = L[(i + 1) % n]; if (Math.abs(a[0] - X(p[0])) < 0.01 && Math.abs(a[1] - Y(p[1])) < 0.01 && Math.abs(b[0] - X(q[0])) < 0.01 && Math.abs(b[1] - Y(q[1])) < 0.01) return i; } return -1; };
  const E = (p, q) => { const i = edgeIdx(p, q); return i < 0 ? null : [L[i], L[(i + 1) % n]]; };
  const nose = E([s.front - 12, s.hoodY + 2], [s.front, s.bumperH]), frontV = E([s.front, s.bumperH], [s.front, G]), rearV = E([s.rear, G], [s.rear, s.bumperH]);
  if (nose) [1, -1].forEach(d => { faces.push(patch(nose[0], nose[1], d * (hw - 24), d * (hw - 6), 0.2, 0.85, "#fff6c8", center, { noShade: true })); faces.push(patch(nose[0], nose[1], d * (hw - 23), d * (hw - 7), 0.25, 0.45, "#ffffff", center, { noShade: true, lift: 0.9 })); });
  if (frontV) {
    faces.push(patch(frontV[0], frontV[1], -hw + 22, hw - 22, 0.12, 0.55, "#1b1f2b", center, { noShade: true })); faces.push(patch(frontV[0], frontV[1], -hw + 4, hw - 4, 0.62, 0.95, "#1a1d26", center, { noShade: true, opacity: 0.7 }));
    if (s.bigGrille) { faces.push(patch(frontV[0], frontV[1], -hw + 12, hw - 12, 0.1, 0.6, "#0f1218", center, { noShade: true, lift: 0.7 })); for (let k = -3; k <= 3; k++) faces.push(patch(frontV[0], frontV[1], k * 9 - 0.8, k * 9 + 0.8, 0.12, 0.58, "#b8c0cc", center, { noShade: true, lift: 0.9 })); }
    else for (let k = 0; k < 3; k++) faces.push(patch(frontV[0], frontV[1], -hw + 24, hw - 24, 0.2 + k * 0.11, 0.24 + k * 0.11, "#3a4150", center, { noShade: true, lift: 0.8 })); // grille slats
    faces.push(patch(frontV[0], frontV[1], -3, 3, 0.26, 0.42, "#e8edf3", center, { noShade: true, lift: 1 })); // badge
    faces.push(patch(frontV[0], frontV[1], -8, 8, 0.68, 0.88, "#f4f6fb", center, { noShade: true, lift: 1 })); // plate
    [1, -1].forEach(d => faces.push(patch(frontV[0], frontV[1], d * (hw - 16), d * (hw - 8), 0.7, 0.82, "#ffe9a8", center, { noShade: true, lift: 1 }))); // fog lights
  }
  if (rearV) {
    if (s.quadLights) [1, -1].forEach(d => [hw - 22, hw - 11].forEach(z => { faces.push(patch(rearV[0], rearV[1], d * z, d * (z + 8), 0.52, 0.8, "#2a1416", center, { noShade: true })); faces.push(patch(rearV[0], rearV[1], d * (z + 1), d * (z + 7), 0.56, 0.76, "#ff2d2d", center, { noShade: true, lift: 0.9 })); faces.push(patch(rearV[0], rearV[1], d * (z + 2.5), d * (z + 5.5), 0.61, 0.71, "#ffb3b3", center, { noShade: true, lift: 1.1 })); }));
    else if (s.lightBar) { faces.push(patch(rearV[0], rearV[1], -hw + 6, hw - 6, 0.6, 0.72, "#ff2d2d", center, { noShade: true })); faces.push(patch(rearV[0], rearV[1], -hw + 8, hw - 8, 0.63, 0.69, "#ffb3b3", center, { noShade: true, lift: 0.9 })); }
    else if (s.hexLights) [1, -1].forEach(d => { faces.push(patch(rearV[0], rearV[1], d * (hw - 22), d * (hw - 4), 0.5, 0.82, "#1b1e27", center, { noShade: true })); faces.push(patch(rearV[0], rearV[1], d * (hw - 20), d * (hw - 6), 0.56, 0.62, "#ff2d2d", center, { noShade: true, lift: 0.9 })); faces.push(patch(rearV[0], rearV[1], d * (hw - 20), d * (hw - 6), 0.7, 0.76, "#ff2d2d", center, { noShade: true, lift: 0.9 })); faces.push(patch(rearV[0], rearV[1], d * (hw - 14), d * (hw - 12), 0.56, 0.76, "#ff2d2d", center, { noShade: true, lift: 0.9 })); });
    else [1, -1].forEach(d => faces.push(patch(rearV[0], rearV[1], d * (hw - 20), d * (hw - 4), 0.5, 0.82, "#ff3b3b", center, { noShade: true }))); faces.push(patch(rearV[0], rearV[1], -hw + 4, hw - 4, 0.05, 0.35, "#1a1d26", center, { noShade: true, opacity: 0.7 }));
    if (!s.quadLights && !s.lightBar && !s.hexLights) [1, -1].forEach(d => faces.push(patch(rearV[0], rearV[1], d * (hw - 19), d * (hw - 5), 0.56, 0.64, "#ffd6d6", center, { noShade: true, lift: 0.9 }))); // light bars
    faces.push(patch(rearV[0], rearV[1], -8, 8, 0.52, 0.74, "#f4f6fb", center, { noShade: true, lift: 1 })); // plate
    faces.push(...box(X(s.rear) - 3, 3, -hw + 12, 4, 3.2, 6, "#4d525c"), ...box(X(s.rear) - 3, 3, hw - 18, 4, 3.2, 6, "#4d525c")); // exhaust tips
  }
  // panel seams on the hood and trunk
  const hoodE = E([s.hoodStart, s.hoodY], [s.front - 12, s.hoodY + 2]); if (hoodE) faces.push(patch(hoodE[0], hoodE[1], -hw + 10, hw - 10, 0.02, 0.05, dark, center, { noShade: true, opacity: 0.7 }));
  const deckE = E([s.rear + 8, s.trunkY], [s.trunkStart, s.trunkY]); if (deckE && !s.bed) faces.push(patch(deckE[0], deckE[1], -hw + 10, hw - 10, 0.1, 0.13, dark, center, { noShade: true, opacity: 0.7 }));
  // mid-engine extras: glass engine cover with louvres, side intakes, rear lip, dihedral door crease
  if (deckE && s.engineGlass) { faces.push(patch(deckE[0], deckE[1], -hw + 16, hw - 16, 0.3, 0.92, "#16202c", center, { noShade: true, lift: 0.7 })); for (let k = 0; k < 4; k++) faces.push(patch(deckE[0], deckE[1], -hw + 18, hw - 18, 0.36 + k * 0.13, 0.39 + k * 0.13, "#3b4b5e", center, { noShade: true, lift: 0.9 })); }
  if (s.sideScoop) [1, -1].forEach(d => {
    const x0 = X(s.wheels[0]) + (s.wheelR || 18) + 4, x1 = X(s.split) - 3, yT = Y(s.belt) - 2, yB = Y(G) + 7, zc = d * hw + d * 0.8;
    const pts = s.sideScoop === "angular" ? [[x0, yB], [x1, yT], [x1 - 12, yB]] : [[x0 + 9, yT], [x1, yT], [x1, yB], [x0, yB]];
    const q = face(pts.map(([x, y]) => [x, y, zc]), "#111419", { noShade: true, bias: 0.5 }); orient([q], center); faces.push(q);
    if (s.sideScoop === "angular") { const q2 = face([[x0 + 14, yB], [x1 + 12, yT], [x1 + 4, yB]].map(([x, y]) => [x, y, zc + d * 0.1]), "#111419", { noShade: true, bias: 0.5 }); orient([q2], center); faces.push(q2); }
  });
  if (s.dihedral) [1, -1].forEach(d => faces.push(sidePatch(X(s.trunkStart) + 6, Y(G) + 14, X(s.hoodStart) + 6, Y(G) + 16, hw * d, d, adjust(color, 0.35), { noShade: true, opacity: 0.8, lift: 0.9 })));
  if (s.lip) faces.push(...box(X(s.rear) - 2, Y(s.trunkY) - 1, -cab - 2, 10, 2.5, cab * 2 + 4, "#1b1e27"));
  // wheel arches (darker flares on the side panels)
  const rr = s.wheelR || 18;
  s.wheels.forEach(wx => [1, -1].forEach(d => {
    const pts = []; const R = rr + 5, cx = X(wx), floor = Y(G) + 0.4;
    for (let k = 0; k <= 8; k++) { const a = Math.PI * k / 8; pts.push([cx + Math.cos(a) * R, Math.max(floor, rr + Math.sin(a) * R), d * hw + d * 0.7]); }
    const q = face(d > 0 ? pts : pts.slice().reverse(), adjust(color, -0.32), { noShade: true, bias: 0.45 });
    orient([q], center); faces.push(q);
  }));
  // stripes
  if (s.stripes && !s.openTop) {
    const hood = E([s.hoodStart, s.hoodY], [s.front - 12, s.hoodY + 2]); if (hood) faces.push(patch(hood[0], hood[1], -5, 5, 0.1, 0.92, s.stripes, center, { noShade: true, opacity: 0.85 }));
    const deck = E([s.rear + 8, s.trunkY], [s.trunkStart, s.trunkY]); if (deck) faces.push(patch(deck[0], deck[1], -5, 5, 0.15, 0.95, s.stripes, center, { noShade: true, opacity: 0.85 }));
    faces.push(face([[X(s.roofStart) + 8, Y(s.roofY) + 0.6, -5], [X(s.roofEnd) - 8, Y(s.roofY) + 0.6, -5], [X(s.roofEnd) - 8, Y(s.roofY) + 0.6, 5], [X(s.roofStart) + 8, Y(s.roofY) + 0.6, 5]], s.stripes, { noShade: true, opacity: 0.85, bias: 0.5 }));
  }
  if (s.bed) faces.push(face([[X(s.rear) + 8, Y(s.trunkY) + 0.6, -hw + 6], [X(s.trunkStart) - 3, Y(s.trunkY) + 0.6, -hw + 6], [X(s.trunkStart) - 3, Y(s.trunkY) + 0.6, hw - 6], [X(s.rear) + 8, Y(s.trunkY) + 0.6, hw - 6]], "#2a2e3a", { noShade: true, bias: 0.5 }));
  if (s.spoiler) { faces.push(...box(X(s.rear) + 5, Y(s.trunkY), -cab + 6, 3, 10, 3, dark)); faces.push(...box(X(s.rear) + 5, Y(s.trunkY), cab - 9, 3, 10, 3, dark)); faces.push(...box(X(s.rear) - 4, Y(s.trunkY) + 9, -cab, 36, 4, cab * 2, dark)); }
  if (s.chrome) [1, -1].forEach(d => faces.push(sidePatch(X(s.rear) + 12, Y(G) + 7, X(s.front) - 12, Y(G) + 9.5, hw * d, d, "#e8edf3", { noShade: true })));
  // underbody + wheels + ground shadow
  faces.push(...box(X(s.rear) + 8, 8, -hw + 10, s.front - s.rear - 16, Y(G) - 8 + 0.5, W - 20, "#1a1d26"));
  const r = s.wheelR || 18;
  s.wheels.forEach(wx => { faces.push(wheel(X(wx), r, hw - 4, r, 13, 1)); faces.push(wheel(X(wx), r, -hw + 4, r, 13, -1)); });
  if (!o.noShadow) faces.push(shadow(0, 0, (s.front - s.rear) / 2 + 4, hw + 10, 0.32));
  return faces;
}
export function carBounds(body) { const s = CAR[body] || CAR.sedan; return { length: s.front - s.rear, width: CAR_W, height: 111 - s.roofY }; }

// ---------- TURNTABLE ----------
export function platformModel(r = 150, h = 14, o = {}) {
  const faces = [], n = 40, col = o.color || "#2a3fa8";
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
    faces.push(face([[Math.cos(a0) * r, 0, Math.sin(a0) * r], [Math.cos(a1) * r, 0, Math.sin(a1) * r], [Math.cos(a1) * r, -h, Math.sin(a1) * r], [Math.cos(a0) * r, -h, Math.sin(a0) * r]], col, { layer: 0, noStroke: false }));
  }
  orient(faces, [0, -h / 2, 0]);
  faces.push({ pts: [[0, 0, 0]], custom: true, layer: 0, bias: 1,
    draw(ctx, it, cam) {
      const b = basis(cam), q = project(cam, [0, 0, 0]);
      ctx.save(); ctx.transform(b.x[0] * r, b.x[1] * r, b.z[0] * r, b.z[1] * r, q[0], q[1]);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, "#9ff5ff"); g.addColorStop(0.55, "#3f8fff"); g.addColorStop(1, "#1c2d86");
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 0.93, 0, Math.PI * 2); ctx.restore();
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = -(o.ringOffset || 0); ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    },
    svg(it, cam) { const b = basis(cam), q = project(cam, [0, 0, 0]); return `<g transform="matrix(${f(b.x[0] * r)} ${f(b.x[1] * r)} ${f(b.z[0] * r)} ${f(b.z[1] * r)} ${f(q[0])} ${f(q[1])})"><circle r="1" fill="url(#g-platform)"/><circle class="ring" r=".93" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="16 12" opacity=".7" vector-effect="non-scaling-stroke"/></g>`; }
  });
  return faces;
}

// ---------- BUILDINGS (local: footprint centered on x/z, ground y=0) ----------
const GLASS = "#9fdcff", LIT = "#ffe27a", FRAME = "#2b3346";
function windowsOn(side, x, y, z, cols, rows, w, h, gx, gy, lit = 0.3, seed = 3) {
  // window patches on a +z (front) or +x (right) face, each with a frame and a sill
  let s = seed, rnd = () => (s = (s * 48271) % 2147483647) / 2147483647;
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const col = rnd() < lit ? LIT : GLASS, x0 = x + c * gx, y0 = y + r * gy;
    if (side === "front") { out.push(face([[x0, y0, z], [x0 + w, y0, z], [x0 + w, y0 + h, z], [x0, y0 + h, z]], col, { bias: 0.4, noShade: true, twoSided: true })); out.push(...box(x0 - 1, y0 - 1.4, z - 1.4, w + 2, 1.4, 1.8, "#d7dce6")); }
    else { out.push(face([[x, y0, z + c * gx + w], [x, y0, z + c * gx], [x, y0 + h, z + c * gx], [x, y0 + h, z + c * gx + w]], col, { bias: 0.4, noShade: true, twoSided: true })); out.push(...box(x - 0.4, y0 - 1.4, z + c * gx - 1, 1.8, 1.4, w + 2, "#d7dce6")); }
  }
  return out;
}
// Every glass pane gets a frame behind it and a glint on it (applied to all models, see buildingModel).
function dressWindows(F) {
  const extra = [];
  F.forEach(q => {
    if (!q.pts || q.pts.length !== 4 || !(q.color === GLASS || q.color === LIT) || !q.noShade || q.custom) return;
    const c = [0, 1, 2].map(i => q.pts.reduce((t, p) => t + p[i], 0) / 4);
    const span = [0, 1, 2].map(i => Math.max(...q.pts.map(p => p[i])) - Math.min(...q.pts.map(p => p[i])));
    if (span[1] < 2 || span.filter(v => v > 0.01).length !== 2) return; // only upright rectangles on a wall
    const grow = p => p.map((v, i) => span[i] > 0.01 ? v + Math.sign(v - c[i]) * 0.9 : v);
    extra.push(face(q.pts.map(grow), FRAME, { bias: 0.3, noShade: true, twoSided: true }));
    // glint: a slim strip down the left quarter of the pane
    const w = Math.max(span[0], span[2]), horiz = span[0] > span[2] ? 0 : 2;
    const lo = Math.min(...q.pts.map(p => p[horiz])), yl = Math.min(...q.pts.map(p => p[1])), yh = Math.max(...q.pts.map(p => p[1]));
    const g = q.pts.map(p => { const r = p.slice(); r[horiz] = p[horiz] < c[horiz] ? lo + w * 0.08 : lo + w * 0.26; r[1] = p[1] < c[1] ? yl + (yh - yl) * 0.08 : yh - (yh - yl) * 0.08; return r; });
    extra.push(face(g, "#ffffff", { bias: 0.5, noShade: true, twoSided: true, opacity: 0.32 }));
  });
  F.push(...extra);
  return F;
}
const fpatch = (x0, y0, x1, y1, z, color, o = {}) => face([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], color, { bias: 0.4, noShade: true, twoSided: true, ...o });
const rpatch = (z0, y0, z1, y1, x, color, o = {}) => face([[x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1]], color, { bias: 0.4, noShade: true, twoSided: true, ...o });
// gable roof along x: ridge at height y+h over a w x d footprint
function gable(x, y, z, w, d, h, color, overhang = 6) {
  const x0 = x - overhang, x1 = x + w + overhang, z0 = z - overhang, z1 = z + d + overhang, zm = z + d / 2, c = [x + w / 2, y + h / 3, zm];
  const fs = [face([[x0, y, z0], [x1, y, z0], [x1, y + h, zm], [x0, y + h, zm]], color), face([[x0, y, z1], [x1, y, z1], [x1, y + h, zm], [x0, y + h, zm]], color),
    face([[x0, y, z0], [x0, y, z1], [x0, y + h, zm]], shade(color, 0.9)), face([[x1, y, z0], [x1, y, z1], [x1, y + h, zm]], shade(color, 0.9))];
  // shingle courses on both slopes + a ridge cap
  [[z0, zm], [z1, zm]].forEach(([za, zb]) => [0.3, 0.62].forEach(t => {
    const P = (tt, xx) => [xx, y + h * tt, za + (zb - za) * tt];
    const q = face([P(t, x0 + 1.5), P(t, x1 - 1.5), P(t + 0.035, x1 - 1.5), P(t + 0.035, x0 + 1.5)], shade(color, 0.82), { noShade: true, bias: 0.4 });
    orient([q], c); const n = faceNormal(q.pts); q.pts = q.pts.map(p => add(p, mul(n, 0.35))); fs.push(q);
  }));
  fs.push(...box(x0 + 1, y + h - 0.6, zm - 1.3, x1 - x0 - 2, 1.5, 2.6, shade(color, 0.78)));
  return orient(fs, c);
}
// pyramid/hip roof
function hip(x, y, z, w, d, h, color, overhang = 5) {
  const x0 = x - overhang, x1 = x + w + overhang, z0 = z - overhang, z1 = z + d + overhang, t = [x + w / 2, y + h, z + d / 2];
  const fs = [face([[x0, y, z0], [x1, y, z0], t], color), face([[x1, y, z0], [x1, y, z1], t], color), face([[x1, y, z1], [x0, y, z1], t], color), face([[x0, y, z1], [x0, y, z0], t], color)];
  fs.push(...box(t[0] - 1.2, t[1] - 1.5, t[2] - 1.2, 2.4, 3, 2.4, shade(color, 0.75)));
  return orient(fs, [x + w / 2, y + h / 3, z + d / 2]);
}
const label = (p, text, size, color) => sprite(p, () => `<text y="3" text-anchor="middle" font-size="${size}" font-weight="700" fill="${color}" font-family="Fredoka, sans-serif">${text}</text>`, { bias: 0.9 });
const bush = (x, z, k = 1) => sprite([x, 0, z], () => bushSprite(0, 0, 1), { scale: k, bias: 0.2 });
const tree = (x, z, k = 1) => sprite([x, 0, z], () => treeSprite(0, 0, 1), { scale: k, bias: 0.2 });
const palm = (x, z, k = 1) => sprite([x, 0, z], () => palmSprite(0, 0, 1), { scale: k, bias: 0.2 });

// vertical (elliptical) cylinder with a top cap
function cyl(cx, y, cz, rx, rz, h, color, o = {}, n = 14) {
  const ring = yy => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * rx, yy, cz + Math.sin(a) * rz]; });
  const b = ring(y), t = ring(y + h), fs = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; fs.push(face([b[i], b[j], t[j], t[i]], color, o)); }
  fs.push(face(t, o.top || color, o));
  return orient(fs, [cx, y + h / 2, cz]);
}
// cone, apex up
function cone(cx, y, cz, rx, rz, h, color, o = {}, n = 14) {
  const apex = [cx, y + h, cz], fs = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; fs.push(face([[cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz], [cx + Math.cos(b) * rx, y, cz + Math.sin(b) * rz], apex], color, o)); }
  return orient(fs, [cx, y + h / 3, cz]);
}
// horizontal tube along x (optionally tapered to r1 at x1)
function tube(x0, x1, cy, cz, r, color, o = {}, n = 12, r1 = r) {
  const ring = (x, rr) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [x, cy + Math.cos(a) * rr, cz + Math.sin(a) * rr]; });
  const a = ring(x0, r), b = ring(x1, r1), fs = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; fs.push(face([a[i], a[j], b[j], b[i]], color, o)); }
  fs.push(face(a, color, o), face(b, color, o));
  return orient(fs, [(x0 + x1) / 2, cy, cz]);
}
const circ = (cx, cy, r, n = 10) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
// a flat disc in the plane spanned by U, V around c
function tiltDisc(c, U, V, r, color, o = {}, n = 20) { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push(add(c, add(mul(U, Math.cos(a) * r), mul(V, Math.sin(a) * r)))); } return face(pts, color, { twoSided: true, ...o }); }
// a scaled-down car (plain faces + prism wheels, safe to rotate)
function miniCar(body, color, k, at) {
  const s = CAR[body] || CAR.sedan, mid = (s.rear + s.front) / 2, r = (s.wheelR || 18) * k, hw = CAR_W / 2 * k;
  const F = carModel(body, color, { noShadow: true }).filter(x => !x.custom).map(x => ({ ...x, pts: x.pts.map(p => [p[0] * k + at[0], p[1] * k + at[1], p[2] * k + at[2]]) }));
  s.wheels.forEach(wx => [1, -1].forEach(d => {
    const z0 = d > 0 ? hw - 14 * k : -hw + 1 * k, z1 = d > 0 ? hw - 1 * k : -hw + 14 * k;
    F.push(...prism(circ((wx - mid) * k, r, r), z0, z1, "#1b1e27"), ...prism(circ((wx - mid) * k, r, r * 0.55), d > 0 ? z1 - 0.5 : z0 - 0.6, d > 0 ? z1 + 0.6 : z0 + 0.5, "#cfd5e0", { noShade: true }));
  }));
  F.push(shadow(at[0], at[2], (s.front - s.rear) / 2 * k + 3, hw + 6, 0.3));
  return F;
}
const SNOW = "#f4f8ff", STONE = "#b0bec5", WOOD = "#8d6e63";

export function buildingModel(id) {
  const F = [];
  switch (id) {
    case "studio": {
      F.push(...box(-32, 0, -25, 64, 84, 50, "#ff8a73"), ...box(-35, 83, -28, 70, 5, 56, "#d6604d"), ...box(10, 88, -10, 12, 8, 10, "#cfd8dc"));
      F.push(...windowsOn("front", -24, 50, 25, 3, 2, 13, 14, 19, 22, 0.3, 5), ...windowsOn("right", 32, 50, -16, 2, 2, 12, 14, 18, 22, 0.3, 6));
      F.push(fpatch(-7, 0, 8, 22, 25, "#5a3e36"), fpatch(-24, 12, -11, 24, 25, GLASS), fpatch(14, 12, 27, 24, 25, GLASS));
      F.push(...box(-14, 23, 25, 28, 3, 7, "#ffd23f"), bush(-44, 30, 0.9), bush(44, 30, 0.8), shadow(0, 0, 48, 40, 0.25));
      break;
    }
    case "condo": {
      F.push(...box(-30, 0, -25, 60, 108, 50, "#4fc3f7"), ...box(-34, 106, -29, 68, 5, 58, "#0288d1"), ...box(14, 110, 4, 4, 10, 4, "#0288d1"));
      F.push(...windowsOn("front", -24, 12, 25, 2, 6, 12, 10, 16, 15, 0.3, 9), ...windowsOn("right", 30, 12, -18, 2, 6, 12, 10, 18, 15, 0.3, 10));
      for (let i = 0; i < 6; i++) F.push(...box(10, 8 + i * 15, 25, 20, 3, 10, "#ffffff"));
      F.push(fpatch(-8, 0, 8, 16, 25, "#1f2d5c"), fpatch(-5, 3, 5, 12, 25, GLASS), tree(-46, 28, 0.8), bush(46, 30, 0.9), shadow(0, 0, 46, 40, 0.25));
      break;
    }
    case "house": {
      F.push(...box(-40, 0, -30, 80, 48, 60, "#ffe0a3"), ...gable(-40, 48, -30, 80, 60, 30, "#e74c3c"), ...box(18, 40, -12, 9, 36, 9, "#8d6e63"));
      F.push(fpatch(-34, 20, -16, 36, 30, GLASS), fpatch(-37, 20, -34, 36, 30, "#2d8cff"), fpatch(-16, 20, -13, 36, 30, "#2d8cff"), fpatch(-8, 0, 6, 28, 30, "#8d4b2b"), fpatch(12, 0, 36, 28, 30, "#cfd8dc"), fpatch(12, 9, 36, 10.5, 30, "#90a4ae"), fpatch(12, 18, 36, 19.5, 30, "#90a4ae"));
      F.push(...windowsOn("right", 40, 20, -20, 2, 1, 14, 14, 24, 0, 0, 1));
      F.push(bush(-50, 34, 0.9), tree(54, 28, 0.7), shadow(0, 0, 56, 44, 0.25));
      break;
    }
    case "villa": {
      F.push(...box(-47, 0, -30, 94, 40, 60, "#f8f9fa"), ...box(-18, 40, -26, 66, 32, 52, "#ffffff"), ...box(-20, 71, -28, 70, 3, 56, "#c47f3e"), ...box(-49, 39, -32, 98, 3, 64, "#c47f3e"));
      F.push(fpatch(-12, 46, 44, 66, 26, GLASS), fpatch(6, 46, 7.5, 66, 26, "#fff"), fpatch(24, 46, 25.5, 66, 26, "#fff"), fpatch(-42, 8, -2, 34, 30, GLASS), fpatch(-22, 8, -20.5, 34, 30, "#fff"), fpatch(8, 6, 38, 34, 30, "#c47f3e"));
      F.push(...windowsOn("right", 47, 10, -20, 2, 1, 16, 22, 24, 0, 0, 2));
      F.push(disc(-30, 0.4, 44, 22, 9, "#4fd3ff", { layer: 0.6 }), disc(-30, 0.6, 44, 18, 6.5, "#8ae6ff", { layer: 0.7, opacity: 0.6 }), palm(58, 34, 0.6), shadow(0, 0, 60, 44, 0.22));
      break;
    }
    case "penthouse": {
      F.push(...box(-24, 0, -24, 48, 118, 48, "#6c5ce7"), ...box(-28, 116, -28, 56, 5, 56, "#4834d4"), ...box(-1.5, 120, -1.5, 3, 16, 3, "#4834d4"));
      F.push(...windowsOn("front", -19, 10, 24, 3, 6, 10, 9, 14, 13, 0.4, 13), ...windowsOn("right", 24, 10, -19, 3, 6, 10, 9, 14, 13, 0.4, 14));
      F.push(fpatch(-20, 94, 20, 112, 24, LIT), rpatch(-20, 94, 20, 112, 24, LIT), fpatch(-8, 0, 8, 14, 24, "#2b2470"), fpatch(-4, 3, 4, 11, 24, GLASS));
      F.push(bush(-34, 30, 0.8), bush(34, 30, 0.8), shadow(0, 0, 38, 38, 0.25));
      break;
    }
    case "beach": {
      [-24, 0, 24].forEach(x => { F.push(...box(x - 2.5, 0, -16, 5, 30, 5, "#8d6e63"), ...box(x - 2.5, 0, 12, 5, 30, 5, "#8d6e63")); });
      F.push(...box(-37, 28, -22, 74, 5, 50, "#a1887f"), ...box(-33, 33, -18, 66, 32, 42, "#ffd6a5"), ...gable(-33, 65, -18, 66, 42, 22, "#2d8cff"));
      F.push(fpatch(-25, 41, -9, 55, 24, GLASS), fpatch(9, 41, 25, 55, 24, GLASS), fpatch(-6, 33, 6, 55, 24, "#5a3e36"));
      F.push(disc(0, 0.2, 40, 90, 22, "#4fd3ff", { layer: 0.4 }), disc(0, 0.3, 48, 80, 12, "#8ae6ff", { layer: 0.45, opacity: 0.5 }), palm(-52, 26, 0.7), palm(52, 26, 0.6), shadow(0, 0, 44, 32, 0.2));
      break;
    }
    case "mansion": {
      F.push(...box(-22, 0, -25, 44, 70, 50, "#fff8e8"), ...gable(-22, 70, -25, 44, 50, 22, "#8d6e63"), ...box(-54, 0, -22, 34, 46, 44, "#fff1d6"), ...box(20, 0, -22, 34, 46, 44, "#fff1d6"), ...gable(-54, 46, -22, 34, 44, 18, "#8d6e63"), ...gable(20, 46, -22, 34, 44, 18, "#8d6e63"));
      [-16, -6, 6, 16].forEach(x => F.push(...box(x - 2, 0, 26, 4, 56, 4, "#ffffff")));
      F.push(...box(-20, 54, 24, 40, 4, 8, "#ffffff"), fpatch(-4, 0, 4, 24, 25, "#5a3e36"), fpatch(-14, 30, -6, 40, 25, GLASS), fpatch(6, 30, 14, 40, 25, GLASS));
      F.push(fpatch(-48, 14, -38, 26, 22, GLASS), fpatch(-34, 14, -24, 26, 22, GLASS), fpatch(24, 14, 34, 26, 22, GLASS), fpatch(38, 14, 48, 26, 22, GLASS));
      F.push(disc(0, 0.4, 48, 14, 8, "#4fd3ff", { layer: 0.6 }), ...box(-2, 0, 46, 4, 10, 4, "#cfd8dc"), bush(-58, 32, 0.7), bush(58, 32, 0.7), shadow(0, 0, 66, 40, 0.22));
      break;
    }
    case "island": {
      F.push(disc(0, 0.1, 0, 110, 60, "#4fd3ff", { layer: 0.3 }), disc(0, 0.3, 0, 72, 36, "#f9e4b7", { layer: 0.4 }), disc(0, 0.5, 0, 50, 24, "#2ecc71", { layer: 0.5 }));
      F.push(...box(-16, 0, -12, 32, 20, 26, "#ffffff"), ...box(-18, 19, -14, 36, 3, 30, "#c47f3e"), fpatch(-12, 4, 12, 15, 14, GLASS));
      F.push(disc(58, 0.6, 14, 18, 5, "#a1887f", { layer: 0.6 }), palm(-30, 10, 0.6), palm(26, 18, 0.55), shadow(0, 0, 26, 20, 0.2, 0.7));
      break;
    }
    // ----- businesses -----
    case "foodcart": {
      F.push(...box(-30, 10, -18, 60, 30, 36, "#ff6b6b"), ...box(-32, 38, -20, 64, 3, 40, "#ffffff"));
      for (let i = 0; i < 6; i++) F.push(fpatch(-30 + i * 10, 30, -20 + i * 10, 40, 18, i % 2 ? "#ff6b6b" : "#ffffff"));
      F.push(fpatch(-24, 16, 24, 28, 18, "#ffffff"), ...box(-1.5, 40, 0, 3, 36, 3, "#8d6e63"), ...hip(-34, 74, -26, 68, 52, 10, "#ffd23f", 0));
      F.push(wheel(-20, 7, 19, 7, 5, 1), wheel(20, 7, 19, 7, 5, 1), wheel(-20, 7, -19, 7, 5, -1), wheel(20, 7, -19, 7, 5, -1));
      F.push(label([0, 22, 18.8], "FOOD", 9, "#ff6b6b"));
      F.push(shadow(0, 0, 40, 28, 0.22));
      break;
    }
    case "carwash": {
      F.push(...box(-42, 0, -30, 84, 66, 60, "#42a5f5"), ...box(-48, 64, -34, 96, 16, 10, "#ffd23f"));
      F.push(fpatch(-30, 0, 30, 44, 30, "#102a4c"), fpatch(-32, 44, 32, 52, 30, "#1e5fa3"));
      F.push(...translate(carModel("hatch", "#ff6b6b").filter(x => !x.custom).map(x => ({ ...x, pts: x.pts.map(p => [p[0] * 0.33, p[1] * 0.33 + 4, p[2] * 0.33]) })), [0, 0, 20]));
      [[-26, 56, 3], [-10, 60, 2.5], [14, 58, 4], [30, 54, 2.5]].forEach(b => F.push(sprite([b[0], b[1], 31], () => `<circle r="${b[2]}" fill="#fff" opacity=".7" class="bub"/>`, { bias: 0.8 })));
      F.push(label([0, 72, -23.5], "CAR WASH", 9, "#1f2d5c"));
      F.push(shadow(0, 0, 56, 44, 0.25));
      break;
    }
    case "cafe": {
      F.push(...box(-38, 0, -25, 76, 72, 50, "#8d6e63"), ...box(-42, 70, -29, 84, 5, 58, "#5d4037"));
      for (let i = 0; i < 7; i++) F.push(fpatch(-38 + i * 10.86, 44, -27.14 + i * 10.86, 52, 25, i % 2 ? "#ffffff" : "#2ecc71"));
      F.push(...box(-40, 52, 25, 80, 3, 9, "#2ecc71"), fpatch(-30, 10, 0, 34, 25, GLASS), fpatch(8, 0, 28, 34, 25, "#5d4037"), fpatch(11, 16, 25, 30, 25, GLASS), fpatch(-30, 56, 30, 66, 25, "#2ecc71"));
      F.push(...windowsOn("right", 38, 14, -16, 2, 1, 14, 18, 20, 0, 0, 4));
      F.push(label([0, 61, 25.6], "ROASTERY", 8, "#fff"));
      F.push(bush(-46, 30, 0.6), bush(46, 30, 0.6), shadow(0, 0, 50, 40, 0.25));
      break;
    }
    case "warehouse": {
      F.push(...box(-54, 0, -35, 108, 60, 70, "#90a4ae"), ...gable(-54, 60, -35, 108, 70, 18, "#607d8b", 3));
      [-40, -6, 28].forEach(x => { F.push(fpatch(x, 0, x + 24, 36, 35, "#1e88e5")); for (let k = 1; k < 4; k++) F.push(fpatch(x, k * 9 - 0.6, x + 24, k * 9 + 0.6, 35, "#1565c0", { lift: 0.9 })); });
      F.push(...windowsOn("front", -46, 46, 35, 6, 1, 12, 8, 16, 0, 0, 1), ...windowsOn("right", 54, 46, -30, 3, 1, 14, 8, 20, 0, 0, 2));
      F.push(shadow(0, 0, 68, 48, 0.25));
      break;
    }
    case "startup": {
      F.push(...box(-42, 0, -30, 84, 82, 60, "#26c6da"), ...box(-46, 80, -34, 92, 5, 68, "#00838f"));
      F.push(fpatch(-36, 10, 36, 72, 30, GLASS), ...[-12, 12].map(x => fpatch(x - 0.8, 10, x + 0.8, 72, 30, "#ffffff")), ...[30, 50].map(y => fpatch(-36, y - 0.8, 36, y + 0.8, 30, "#ffffff")), fpatch(-10, 0, 10, 16, 30, "#1f2d5c"));
      F.push(rpatch(-24, 10, 24, 72, 42, GLASS), rpatch(-0.8, 10, 0.8, 72, 42, "#ffffff"), rpatch(-24, 40, 24, 41.6, 42, "#ffffff"));
      F.push(sprite([0, 96, 0], () => `<circle r="11" fill="#fff"/><path d="M-6 0 L-2 4 L6 -4" stroke="#26c6da" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, { bias: 80 }));
      F.push(tree(-52, 32, 0.7), tree(52, 32, 0.7), shadow(0, 0, 58, 44, 0.25));
      break;
    }
    case "tower": {
      F.push(...box(-30, 0, -30, 60, 52, 60, "#3f51b5"), ...box(-20, 52, -20, 40, 100, 40, "#5c6bc0"), ...box(-2, 152, -2, 4, 18, 4, "#3f51b5"));
      F.push(...windowsOn("front", -16, 58, 20, 3, 8, 8, 6, 12, 11, 0.5, 21), ...windowsOn("right", 20, 58, -16, 3, 8, 8, 6, 12, 11, 0.5, 22), ...windowsOn("front", -26, 8, 30, 5, 3, 8, 6, 12, 12, 0.4, 23), ...windowsOn("right", 30, 8, -26, 5, 3, 8, 6, 12, 12, 0.4, 24));
      F.push(fpatch(-6, 0, 6, 14, 30, "#1a237e"), sprite([0, 171, 0], () => `<circle r="2.5" fill="#ff5c7a" class="blink"/>`, { bias: 1 }), shadow(0, 0, 46, 46, 0.25));
      break;
    }
    case "bank": {
      F.push(...box(-48, 0, -34, 96, 6, 70, "#cfd8dc"), ...box(-44, 6, -30, 88, 5, 62, "#e0e0e0"), ...box(-40, 11, -26, 80, 46, 52, "#f5f5f5"));
      [-30, -12, 12, 30].forEach(x => F.push(...box(x - 4, 11, 26, 8, 44, 8, "#e0e0e0")));
      F.push(...box(-44, 55, -30, 88, 6, 66, "#eceff1"), ...gable(-44, 61, -30, 88, 66, 16, "#eceff1", 0));
      F.push(sprite([0, 77, 0], () => `<path d="M-22 0 Q0 -30 22 0 Z" fill="#ffc107"/><path d="M-22 0 Q0 -30 22 0 Z" fill="url(#g-shine)" opacity=".5"/>`, { bias: 80 }));
      F.push(fpatch(-6, 11, 6, 40, 26, "#ffc107"), shadow(0, 0, 62, 48, 0.22));
      break;
    }

    // ----- v2 properties -----
    case "room": { // garage with an apartment on top and an outside stair
      F.push(...box(-30, 0, -24, 60, 34, 48, "#cfd8dc"), fpatch(-22, 0, 16, 26, 24, "#90a4ae"));
      for (let k = 1; k < 4; k++) F.push(fpatch(-22, k * 6.5 - 0.5, 16, k * 6.5 + 0.5, 24, "#78909c", { lift: 0.9 }));
      F.push(...box(-28, 34, -22, 56, 30, 44, "#ffe0a3"), ...gable(-28, 64, -22, 56, 44, 20, WOOD));
      F.push(fpatch(-18, 42, -2, 56, 22, GLASS), fpatch(6, 36, 18, 60, 22, "#8d4b2b"), fpatch(8, 44, 16, 52, 22, GLASS), ...windowsOn("right", 28, 44, -14, 1, 1, 14, 12, 0, 0, 0, 1));
      for (let i = 0; i < 6; i++) F.push(...box(31 + i * 3.1, i * 5.6, -6, 3.4, 2.6, 14, WOOD));
      F.push(...box(31, 0, -7, 19, 1.5, 1.5, WOOD), ...box(31, 14, 9, 19, 1.5, 1.5, WOOD), ...box(48, 0, 8, 1.5, 36, 1.5, WOOD));
      F.push(bush(-40, 30, 0.8), shadow(0, 0, 46, 40, 0.25));
      break;
    }
    case "duplex": { // two mirrored homes under one roof
      F.push(...box(-50, 0, -26, 100, 48, 52, "#b2dfdb"), ...box(-1, 0, -27, 2, 50, 54, "#80cbc4"), ...gable(-50, 48, -26, 100, 52, 24, "#455a64"));
      [-1, 1].forEach(d => {
        F.push(fpatch(d * 12 - 6, 0, d * 12 + 6, 24, 26, d > 0 ? "#5a3e36" : "#1f2d5c"), fpatch(d * 34 - 9, 10, d * 34 + 9, 26, 26, GLASS), fpatch(d * 34 - 0.8, 10, d * 34 + 0.8, 26, 26, "#fff"));
        F.push(fpatch(d * 34 - 9, 32, d * 34 + 9, 44, 26, GLASS), fpatch(d * 12 - 6, 32, d * 12 + 6, 44, 26, GLASS), ...box(d * 12 - 8, 24, 26, 16, 2, 6, "#ffffff"));
      });
      F.push(...windowsOn("right", 50, 12, -16, 2, 2, 12, 12, 18, 18, 0.2, 7), ...box(-14, 72, -8, 8, 10, 8, STONE));
      F.push(bush(-60, 32, 0.8), bush(60, 32, 0.8), tree(-70, 16, 0.6), shadow(0, 0, 64, 42, 0.25));
      break;
    }
    case "cabin": { // log cabin by the lake
      F.push(disc(0, 0.2, 54, 90, 20, "#4fd3ff", { layer: 0.4 }), disc(10, 0.3, 56, 50, 8, "#8ae6ff", { layer: 0.45, opacity: 0.5 }));
      F.push(...box(-32, 0, -24, 64, 36, 48, "#a0704b"));
      for (let k = 1; k < 6; k++) F.push(fpatch(-32, k * 6 - 0.6, 32, k * 6 + 0.6, 24, "#7a5236", { lift: 0.8 }), rpatch(-24, k * 6 - 0.6, 24, k * 6 + 0.6, 32, "#7a5236", { lift: 0.8 }));
      F.push(...gable(-32, 36, -24, 64, 48, 28, "#5d4037", 8), ...box(14, 30, -10, 9, 36, 9, STONE), fpatch(-7, 0, 7, 24, 24, "#4e342e"), fpatch(-26, 12, -12, 26, 24, LIT), fpatch(12, 12, 26, 26, 24, LIT));
      F.push(...box(-36, 0, 24, 72, 2, 12, "#8d6e63"), ...box(-2, 0, 36, 4, 2, 30, "#8d6e63"), tree(-50, 10, 0.8), tree(50, 6, 0.9), tree(-62, 30, 0.6), shadow(0, 0, 44, 36, 0.25));
      break;
    }
    case "townhouse": { // a row of three narrow homes
      [["#ef9a9a", "#b71c1c"], ["#90caf9", "#0d47a1"], ["#a5d6a7", "#1b5e20"]].forEach(([c, d], i) => {
        const x = -46 + i * 31;
        F.push(...box(x, 0, -24, 30, 70 + (i === 1 ? 8 : 0), 48, c), ...box(x - 1, 70 + (i === 1 ? 8 : 0), -25, 32, 3, 50, d));
        F.push(fpatch(x + 10, 0, x + 20, 18, 24, d), fpatch(x + 4, 24, x + 26, 36, 24, GLASS), fpatch(x + 4, 46, x + 26, 58, 24, GLASS), fpatch(x + 14.2, 24, x + 15.8, 58, 24, c), ...box(x + 6, 36, 24, 18, 2, 5, "#ffffff"));
        F.push(...box(x + 8, 0, 24, 14, 3, 6, STONE));
      });
      F.push(...windowsOn("right", 47, 24, -16, 2, 2, 10, 12, 16, 22, 0.3, 8), bush(-56, 32, 0.7), tree(60, 30, 0.7), shadow(0, 0, 62, 40, 0.25));
      break;
    }
    case "chalet": { // alpine chalet with a wide snowy roof
      F.push(disc(0, 0.2, 10, 90, 60, SNOW, { layer: 0.3, opacity: 0.9 }));
      F.push(...box(-40, 0, -28, 80, 24, 56, STONE), ...box(-44, 24, -30, 88, 28, 60, "#d7a86e"), ...gable(-44, 52, -30, 88, 60, 30, "#6d4c41", 12));
      F.push(...gable(-44, 55, -30, 88, 60, 30, SNOW, 12).filter(x => x.pts.length === 4));
      F.push(...box(-40, 24, 30, 80, 2, 10, WOOD), ...box(-40, 26, 38, 80, 8, 1.5, WOOD), ...box(-30, 14, 29, 60, 2, 8, WOOD));
      F.push(fpatch(-32, 30, -12, 46, 30, LIT), fpatch(12, 30, 32, 46, 30, LIT), fpatch(-6, 0, 6, 22, 28, "#4e342e"), fpatch(-28, 6, -14, 18, 28, LIT), fpatch(14, 6, 28, 18, 28, LIT));
      F.push(tree(-62, 20, 0.9), tree(60, 10, 0.8), tree(-58, -12, 0.7), shadow(0, 0, 56, 44, 0.2));
      break;
    }
    case "vineyard": { // estate house with rows of vines
      F.push(...box(-20, 0, -20, 40, 40, 40, "#fff3e0"), ...hip(-20, 40, -20, 40, 40, 16, "#c47f3e"), ...box(26, 0, -20, 22, 30, 22, "#fff3e0"), ...hip(26, 30, -20, 22, 22, 12, "#c47f3e"));
      F.push(fpatch(-5, 0, 5, 18, 20, "#5a3e36"), fpatch(-16, 22, -6, 32, 20, GLASS), fpatch(6, 22, 16, 32, 20, GLASS), fpatch(31, 10, 43, 22, 2, GLASS));
      for (let r = 0; r < 4; r++) { const z = 18 + r * 10; F.push(...box(-64, 0, z, 60, 7, 3, "#2e7d32")); for (let x = -62; x < -2; x += 12) F.push(...box(x, 0, z + 1, 1.2, 10, 1.2, "#6d4c41")); }
      F.push(disc(-34, 0.3, 36, 32, 20, "#a5d6a7", { layer: 0.35, opacity: 0.6 }), tree(-44, -10, 0.7), tree(58, 20, 0.6), shadow(0, 0, 44, 36, 0.22));
      break;
    }
    case "golf": { // clubhouse on a fairway with a flag, bunker and pond
      F.push(disc(0, 0.2, 10, 100, 60, "#66bb6a", { layer: 0.3 }), disc(40, 0.4, 34, 14, 9, "#ffe0a3", { layer: 0.4 }), disc(-52, 0.4, 30, 18, 10, "#4fd3ff", { layer: 0.4 }), disc(-4, 0.5, 38, 12, 7, "#a5d6a7", { layer: 0.45 }));
      F.push(...box(-30, 0, -22, 60, 34, 44, "#ffffff"), ...hip(-30, 34, -22, 60, 44, 16, "#2e7d32"), ...box(-34, 14, 22, 68, 2, 12, "#eceff1"));
      [-28, -10, 10, 28].forEach(x => F.push(...box(x - 1.5, 0, 31, 3, 14, 3, "#eceff1")));
      F.push(fpatch(-22, 10, -8, 26, 22, GLASS), fpatch(8, 10, 22, 26, 22, GLASS), fpatch(-5, 0, 5, 20, 22, "#5a3e36"));
      F.push(...box(-4.5, 0, 38, 1, 26, 1, "#eceff1"), face([[-4, 26, 38], [-4, 18, 38], [6, 22, 38]], "#ff3b5c", { twoSided: true, noShade: true, bias: 0.5 }));
      F.push(tree(-70, 0, 0.8), tree(68, -8, 0.7), bush(52, 20, 0.6), shadow(0, 0, 44, 34, 0.22));
      break;
    }
    case "skytower": { // slim glass residential tower on a podium
      F.push(...box(-32, 0, -28, 64, 18, 56, STONE), ...box(-18, 18, -18, 36, 132, 36, "#eceff1"), ...box(-13, 150, -13, 26, 10, 26, "#90caf9"), ...box(-1.5, 160, -1.5, 3, 20, 3, "#78909c"));
      F.push(...windowsOn("front", -15, 24, 18, 3, 9, 8, 9, 10.5, 13.5, 0.35, 31), ...windowsOn("right", 18, 24, -15, 3, 9, 8, 9, 10.5, 13.5, 0.35, 32));
      F.push(fpatch(-26, 2, 26, 16, 28, GLASS), fpatch(-6, 0, 6, 14, 28, "#37474f"), sprite([0, 181, 0], () => `<circle r="2.5" fill="#ff5c7a" class="blink"/>`, { bias: 1 }));
      F.push(tree(-44, 32, 0.7), bush(42, 32, 0.8), shadow(0, 0, 42, 40, 0.25));
      break;
    }
    case "castle": { // keep, four round towers, battlements and a gate
      F.push(...box(-36, 0, -30, 72, 44, 60, STONE), ...box(-20, 44, -20, 40, 36, 40, "#cfd8dc"), ...hip(-20, 80, -20, 40, 40, 20, "#3f51b5", 2));
      [[-36, -30], [36, -30], [-36, 30], [36, 30]].forEach(([x, z]) => { F.push(...cyl(x, 0, z, 11, 11, 56, "#cfd8dc"), ...cone(x, 56, z, 13, 13, 22, "#3f51b5")); });
      for (let x = -28; x <= 28; x += 8) F.push(...box(x - 2.5, 44, 28, 5, 5, 4, STONE), ...box(x - 2.5, 44, -32, 5, 5, 4, STONE));
      F.push(fpatch(-9, 0, 9, 26, 30, "#37474f"), fpatch(-6, 0, 6, 22, 30, "#5d4037"), fpatch(-6, 12, -4, 22, 30, "#263238"), fpatch(4, 12, 6, 22, 30, "#263238"));
      F.push(...box(-12, 0, 30, 24, 3, 18, WOOD), fpatch(-12, 54, -6, 66, 20, LIT), fpatch(6, 54, 12, 66, 20, LIT), ...box(-0.8, 100, -0.8, 1.6, 20, 1.6, "#78909c"), face([[0, 120, 0], [0, 112, 0], [12, 116, 0]], "#ff3b5c", { twoSided: true, noShade: true, bias: 0.5 }));
      F.push(shadow(0, 0, 58, 50, 0.25));
      break;
    }
    case "resort": { // alpine lodge in front of a snow-capped peak
      F.push(...hip(-80, 0, -70, 160, 70, 110, "#90a4ae", 0), ...hip(-24, 77, -43.5, 48, 21, 33, SNOW, 0), disc(0, 0.2, 20, 110, 50, SNOW, { layer: 0.3, opacity: 0.9 }));
      F.push(...box(-48, 0, -14, 96, 36, 48, "#8d6e63"), ...gable(-48, 36, -14, 96, 48, 26, SNOW, 10), ...box(-44, 12, 34, 88, 2, 8, "#6d4c41"));
      for (let x = -40; x < 44; x += 14) F.push(fpatch(x, 6, x + 9, 30, 34, LIT));
      F.push(fpatch(-5, 0, 5, 20, 34, "#4e342e"), ...box(-1, 0, 48, 2, 44, 2, "#78909c"), ...box(56, 0, 10, 2, 60, 2, "#78909c"), face([[0, 44, 49], [56, 60, 11], [56, 59, 11], [0, 43, 49]], "#37474f", { twoSided: true, noShade: true }));
      F.push(sprite([28, 46, 30], () => `<rect x="-6" y="-8" width="12" height="12" rx="3" fill="#ff3b5c"/><rect x="-4" y="-6" width="8" height="5" fill="#9fdcff"/>`, { bias: 1 }), tree(-66, 24, 0.8), tree(66, 30, 0.7), tree(-58, 40, 0.6), shadow(0, 0, 62, 36, 0.2));
      break;
    }
    case "skyline": { // the landmark tower: three tiers and a spire
      F.push(...box(-30, 0, -30, 60, 70, 60, "#1f2d5c"), ...box(-22, 70, -22, 44, 70, 44, "#283593"), ...box(-13, 140, -13, 26, 36, 26, "#3949ab"), ...box(-1.5, 176, -1.5, 3, 34, 3, "#90caf9"));
      F.push(...windowsOn("front", -26, 8, 30, 5, 4, 8, 9, 11, 14, 0.5, 41), ...windowsOn("right", 30, 8, -26, 5, 4, 8, 9, 11, 14, 0.5, 42));
      F.push(...windowsOn("front", -18, 76, 22, 4, 4, 7, 9, 10, 14, 0.5, 43), ...windowsOn("right", 22, 76, -18, 4, 4, 7, 9, 10, 14, 0.5, 44));
      F.push(fpatch(-10, 144, 10, 170, 13, LIT), rpatch(-10, 144, 10, 170, 13, LIT), fpatch(-7, 0, 7, 16, 30, "#0d1b4b"));
      F.push(...box(34, 0, -10, 30, 16, 30, "#283593"), disc(49, 16.4, 5, 10, 10, "#37474f", { layer: 0.6 }), disc(49, 16.6, 5, 6, 6, "#ffd23f", { layer: 0.7 }));
      F.push(sprite([0, 212, 0], () => `<circle r="3" fill="#ff5c7a" class="blink"/>`, { bias: 1 }), shadow(0, 0, 54, 46, 0.25));
      break;
    }
    // ----- v2 businesses -----
    case "vending": { // three vending machines on a slab
      F.push(...box(-36, 0, -10, 72, 3, 24, STONE), ...box(-38, 46, -12, 76, 3, 28, "#90a4ae"), ...box(-38, 46, -12, 4, 2, 28, "#78909c"));
      [["#e53935", "SODA"], ["#1e88e5", "SNACK"], ["#43a047", "JUICE"]].forEach(([c, t], i) => {
        const x = -34 + i * 24;
        F.push(...box(x, 3, -6, 20, 42, 16, c), fpatch(x + 2, 8, x + 12, 40, 10, "#102a4c"), fpatch(x + 14, 22, x + 18, 40, 10, "#ffffff"), fpatch(x + 15, 12, x + 17, 18, 10, "#263238"));
        for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) F.push(fpatch(x + 3 + k * 3.2, 11 + r * 7.5, x + 5.4 + k * 3.2, 15 + r * 7.5, 10, ["#ffd23f", "#ff8a3c", "#4fd3ff", "#ff6fb5"][(r + k) % 4], { lift: 0.9 }));
        F.push(label([x + 10, 43, 10.8], t, 5, "#ffffff"));
      });
      F.push(shadow(0, 0, 44, 22, 0.25));
      break;
    }
    case "lawncare": { // work truck, trailer and mower on a fresh lawn
      F.push(disc(0, 0.2, 4, 90, 40, "#66bb6a", { layer: 0.3 }));
      for (let i = 0; i < 6; i++) F.push(disc(0, 0.25, 4, 90 - i * 15, 40 - i * 6.6, i % 2 ? "#66bb6a" : "#5cb860", { layer: 0.31 + i * 0.01 }));
      F.push(...miniCar("pickup", "#2e7d32", 0.5, [-22, 0, 0]));
      F.push(...box(32, 6, -14, 34, 3, 28, "#546e7a"), ...box(32, 9, -14, 2, 10, 28, "#546e7a"), ...box(64, 9, -14, 2, 10, 28, "#546e7a"), ...prism(circ(40, 5, 5), -17, -13, "#1b1e27"), ...prism(circ(40, 5, 5), 13, 17, "#1b1e27"), ...prism(circ(58, 5, 5), -17, -13, "#1b1e27"), ...prism(circ(58, 5, 5), 13, 17, "#1b1e27"));
      F.push(...box(38, 9, -8, 22, 10, 16, "#e53935"), ...box(42, 19, -4, 14, 6, 8, "#263238"), ...box(38, 19, 6, 2, 12, 2, "#263238"));
      F.push(...box(-54, 0, 30, 100, 6, 5, "#2e7d32"), bush(60, 30, 0.6), tree(-70, -20, 0.7));
      break;
    }
    case "autoshop": { // two-bay garage with a car on the forecourt
      F.push(...box(-46, 0, -28, 92, 50, 56, "#546e7a"), ...box(-50, 48, -32, 100, 4, 64, "#37474f"), ...box(-30, 52, -20, 60, 12, 6, "#ffd23f"));
      [-38, 4].forEach(x => { F.push(fpatch(x, 0, x + 32, 34, 28, "#cfd8dc")); for (let k = 1; k < 5; k++) F.push(fpatch(x, k * 7 - 0.6, x + 32, k * 7 + 0.6, 28, "#90a4ae", { lift: 0.9 })); });
      F.push(fpatch(-34, 38, 34, 46, 28, "#ff8a3c"), label([0, 58, -17], "AUTO SHOP", 8, "#1f2d5c"), ...windowsOn("right", 46, 20, -20, 2, 1, 14, 14, 22, 0, 0, 3));
      F.push(...miniCar("sedan", "#ff3b5c", 0.4, [-14, 0, 44]));
      [0, 1, 2].forEach(i => F.push(...prism(circ(0, 0, 6), 0, 3, "#1b1e27").map(x => ({ ...x, pts: x.pts.map(p => [p[2] + 40, p[1] + i * 3.5 + 6, p[0] + 42]) }))));
      F.push(shadow(0, 0, 60, 46, 0.22));
      break;
    }
    case "machineshop": { // sawtooth-roof factory with a stack
      F.push(...box(-50, 0, -30, 100, 44, 60, "#78909c"));
      [-50, -17, 16].forEach(x => { F.push(...prism([[x, 44], [x + 33, 44], [x + 33, 64]], -30, 30, "#b0bec5")); F.push(rpatch(-26, 48, 26, 62, x + 33, GLASS, { lift: 0.8 })); });
      F.push(...cyl(38, 44, -18, 5, 5, 40, "#90a4ae"), ...cyl(38, 84, -18, 6, 6, 3, "#546e7a"), sprite([38, 94, -18], () => `<circle r="6" fill="#fff" opacity=".35"/><circle cx="4" cy="-7" r="5" fill="#fff" opacity=".25"/>`, { bias: 1 }));
      F.push(fpatch(-36, 0, -8, 30, 30, "#1e88e5"), fpatch(8, 12, 44, 30, 30, GLASS), fpatch(26, 12, 27.5, 30, 30, "#ffffff"), label([-22, 36, 30.6], "CNC", 8, "#ffd23f"));
      for (let k = 1; k < 4; k++) F.push(fpatch(-36, k * 7.5 - 0.6, -8, k * 7.5 + 0.6, 30, "#1565c0", { lift: 0.9 }));
      F.push(...box(-58, 0, 26, 18, 10, 12, "#ff8a3c"), ...box(-58, 10, 26, 18, 8, 12, "#ffd23f"), shadow(0, 0, 64, 46, 0.25));
      break;
    }
    case "solar": { // rows of tilted panels and a small inverter shed
      F.push(disc(0, 0.2, 0, 96, 50, "#c5e1a5", { layer: 0.3 }));
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const x = -62 + c * 32, z = -26 + r * 24;
        F.push(...box(x + 12, 0, z + 6, 2, 8, 2, "#78909c"), face([[x, 6, z + 14], [x + 26, 6, z + 14], [x + 26, 16, z], [x, 16, z]], "#283593", { twoSided: true }));
        F.push(face([[x + 1, 6.4, z + 13.2], [x + 25, 6.4, z + 13.2], [x + 25, 15.6, z + 0.8], [x + 1, 15.6, z + 0.8]], "#3949ab", { twoSided: true, noShade: true, opacity: 0.8, bias: 0.3 }));
        [8.5, 17].forEach(k => F.push(face([[x + k, 6.3, z + 13.4], [x + k + 0.8, 6.3, z + 13.4], [x + k + 0.8, 15.7, z + 0.6], [x + k, 15.7, z + 0.6]], "#9fa8da", { twoSided: true, noShade: true, bias: 0.5 })));
      }
      F.push(...box(60, 0, 20, 22, 18, 18, "#eceff1"), ...box(58, 18, 18, 26, 3, 22, "#90a4ae"), fpatch(66, 4, 76, 14, 38, "#37474f"), sprite([71, 24, 29], () => `<path d="M-5 -3 L1 -3 L-2 3 L4 3" stroke="#ffd23f" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, { bias: 1 }));
      F.push(shadow(0, 0, 70, 40, 0.08));
      break;
    }
    case "shipping": { // container ship on open water
      F.push(disc(0, 0.1, 0, 130, 70, "#4fd3ff", { layer: 0.3 }), disc(-30, 0.2, 30, 60, 10, "#8ae6ff", { layer: 0.35, opacity: 0.5 }), disc(40, 0.2, -30, 50, 8, "#8ae6ff", { layer: 0.35, opacity: 0.4 }));
      F.push(...prism([[-78, 3], [78, 3], [64, 22], [-72, 22]], -17, 17, "#c62828"), ...prism([[-72, 22], [64, 22], [64, 26], [-72, 26]], -18, 18, "#263238"));
      const cc = ["#ff8a3c", "#1e88e5", "#43a047", "#ffd23f", "#e53935", "#8e24aa"];
      for (let c = 0; c < 7; c++) for (let r = 0; r < 3; r++) for (let z = 0; z < 2; z++) { if (r === 2 && (c + z) % 3) continue; F.push(...box(-66 + c * 15, 26 + r * 8, -14 + z * 15, 14, 8, 13, cc[(c + r + z) % cc.length])); }
      F.push(...box(44, 26, -12, 18, 30, 24, "#eceff1"), ...box(42, 56, -14, 22, 4, 28, "#cfd8dc"), fpatch(46, 44, 60, 50, 12, "#102a4c"), rpatch(-8, 44, 8, 50, 62, "#102a4c"), ...cyl(52, 60, 0, 4, 4, 14, "#ffd23f"), ...box(66, 26, -3, 2, 24, 6, "#eceff1"));
      F.push(sprite([52, 80, 0], () => `<circle r="5" fill="#fff" opacity=".3"/><circle cx="-4" cy="-6" r="4" fill="#fff" opacity=".2"/>`, { bias: 1 }), shadow(0, 0, 80, 20, 0.15));
      break;
    }
    case "moviestudio": { // soundstage with a billboard sign and searchlights
      F.push(...box(-50, 0, -30, 100, 56, 60, "#eceff1"), ...box(-52, 54, -32, 104, 4, 64, "#90a4ae"), ...box(-24, 58, -26, 48, 22, 3, "#263238"), fpatch(-22, 60, 22, 78, -22.9, "#ffd23f"));
      F.push(label([0, 69, -22.2], "STUDIO 7", 8, "#1f2d5c"), fpatch(-40, 0, 0, 40, 30, "#546e7a"), fpatch(-20.6, 0, -19.4, 40, 30, "#37474f"), fpatch(8, 0, 20, 24, 30, "#37474f"), fpatch(26, 10, 44, 30, 30, GLASS));
      [[-46, -36], [46, -36]].forEach(([x, z]) => F.push(...box(x - 1.5, 0, z, 3, 50, 3, "#78909c"), sprite([x, 52, z + 1.5], () => `<path d="M-4 0 L-16 -60 L16 -60 L4 0 Z" fill="#fff" opacity=".22"/><circle r="5" fill="#ffffff" opacity=".9"/>`, { bias: 1 })));
      F.push(...box(-38, 0, 32, 10, 6, 10, "#263238"), ...box(-37, 6, 33, 8, 1.5, 8, "#eceff1"), palm(-62, 24, 0.7), palm(62, 28, 0.6), shadow(0, 0, 66, 46, 0.22));
      break;
    }
    case "hotel": { // grand hotel with a porte-cochère, pool and palms
      F.push(...box(-44, 0, -30, 88, 104, 60, "#fff8e1"), ...box(-48, 102, -34, 96, 5, 68, "#c62828"), ...box(-30, 107, -22, 60, 10, 44, "#fff8e1"), ...box(-32, 117, -24, 64, 3, 48, "#c62828"));
      F.push(...windowsOn("front", -38, 28, 30, 5, 5, 10, 9, 16, 14, 0.5, 51), ...windowsOn("right", 44, 28, -26, 4, 5, 10, 9, 14, 14, 0.5, 52), ...windowsOn("front", -22, 109, 22, 3, 1, 10, 6, 16, 0, 0.7, 53));
      F.push(...box(-24, 20, 30, 48, 4, 26, "#c62828"), ...[-20, 20].map(x => box(x - 2, 0, 50, 4, 20, 4, "#ffd23f")).flat(), fpatch(-10, 0, 10, 18, 30, "#5d4037"), fpatch(-8, 2, 8, 16, 30, GLASS), fpatch(-36, 6, -16, 18, 30, GLASS), fpatch(16, 6, 36, 18, 30, GLASS));
      F.push(label([0, 112, 22.6], "HOTEL", 8, "#c62828"), disc(64, 0.4, 20, 18, 12, "#4fd3ff", { layer: 0.6 }), disc(64, 0.6, 20, 14, 9, "#8ae6ff", { layer: 0.7, opacity: 0.6 }), palm(-56, 34, 0.7), palm(84, 36, 0.6), palm(52, 40, 0.5), shadow(0, 0, 60, 44, 0.22));
      break;
    }
    case "stadium": { // oval bowl with a green pitch and floodlights
      F.push(...cyl(0, 0, 0, 80, 52, 34, "#b0bec5", { top: "#90a4ae" }, 28), ...cyl(0, 34, 0, 72, 46, 2, "#78909c", {}, 28), disc(0, 36.3, 0, 60, 38, "#43a047", { bias: 0.6 }, 28), disc(0, 36.5, 0, 56, 35, "#4caf50", { bias: 0.7 }, 28), disc(0, 36.7, 0, 9, 6, "#43a047", { bias: 0.8 }, 20));
      F.push(face([[-0.6, 36.8, -35], [0.6, 36.8, -35], [0.6, 36.8, 35], [-0.6, 36.8, 35]], "#ffffff", { bias: 0.9, twoSided: true, noShade: true }));
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = a + 0.13; F.push(face([[Math.cos(a) * 80.4, 6, Math.sin(a) * 52.4], [Math.cos(b) * 80.4, 6, Math.sin(b) * 52.4], [Math.cos(b) * 80.4, 30, Math.sin(b) * 52.4], [Math.cos(a) * 80.4, 30, Math.sin(a) * 52.4]], i % 3 ? "#78909c" : "#ffd23f", { twoSided: true, noShade: true, bias: 0.5, opacity: 0.9 })); }
      [[-62, -40], [62, -40], [-62, 40], [62, 40]].forEach(([x, z]) => F.push(...box(x - 1.5, 0, z, 3, 64, 3, "#546e7a"), ...box(x - 7, 60, z - 2, 14, 7, 7, "#eceff1"), sprite([x, 66, z + 2], () => `<circle r="6" fill="#fff" opacity=".9"/><circle r="12" fill="#fff" opacity=".2"/>`, { bias: 1 })));
      F.push(fpatch(-14, 0, 14, 20, 52, "#37474f"), shadow(0, 0, 84, 56, 0.2));
      break;
    }
    case "airline": { // airliner on the apron
      F.push(disc(0, 0.1, 0, 130, 60, "#90a4ae", { layer: 0.3 }), ...[-100, -50, 0, 50].map(x => face([[x, 0.4, 44], [x + 32, 0.4, 44], [x + 32, 0.4, 48], [x, 0.4, 48]], "#ffd23f", { layer: 0.35, twoSided: true, noShade: true })));
      F.push(...tube(-70, 56, 20, 0, 11, "#f4f6fb", {}, 14), ...tube(56, 78, 20, 0, 11, "#f4f6fb", {}, 14, 2), ...tube(-84, -70, 24, 0, 5, "#f4f6fb", {}, 10, 11));
      F.push(face([[-10, 15, 0], [-44, 15, 62], [-56, 15, 62], [-30, 15, 0]], "#eceff1", { twoSided: true }), face([[-10, 15, 0], [-30, 15, 0], [-56, 15, -62], [-44, 15, -62]], "#eceff1", { twoSided: true }));
      F.push(face([[-82, 22, 0], [-70, 22, 36], [-76, 22, 36], [-86, 22, 0]], "#eceff1", { twoSided: true }), face([[-82, 22, 0], [-86, 22, 0], [-76, 22, -36], [-70, 22, -36]], "#eceff1", { twoSided: true }));
      F.push(face([[-70, 26, 0], [-62, 26, 0], [-78, 58, 0], [-88, 58, 0]], "#ff3b5c", { twoSided: true }), face([[-72, 40, 0.4], [-80, 52, 0.4], [-84, 52, 0.4], [-76, 40, 0.4]], "#ffffff", { twoSided: true, noShade: true, bias: 0.5 }));
      [30, -30].forEach(z => F.push(...tube(-30, -8, 9, z, 6, "#546e7a", {}, 10), ...tube(-8, -6, 9, z, 6.5, "#263238", {}, 10)));
      for (let x = -60; x < 50; x += 7) F.push(face([[x, 24, 10.6], [x + 4, 24, 10.6], [x + 4, 27, 9.6], [x, 27, 9.6]], "#102a4c", { twoSided: true, noShade: true, bias: 0.5 }));
      F.push(face([[-70, 9, 10.6], [52, 9, 10.6], [52, 12, 10.6], [-70, 12, 10.6]], "#1e88e5", { twoSided: true, noShade: true, bias: 0.5 }), face([[60, 26, 9.5], [70, 26, 6], [70, 20, 6], [60, 20, 9.5]], "#102a4c", { twoSided: true, noShade: true, bias: 0.5 }));
      [[-24, 8], [-24, -8], [50, 0]].forEach(([x, z]) => F.push(...box(x - 1, 2, z - 1, 2, 9, 2, "#546e7a"), ...prism(circ(x, 3.5, 3.5), z - 2.5, z + 2.5, "#1b1e27")));
      F.push(shadow(-10, 0, 80, 26, 0.18));
      break;
    }
    case "space": { // launch pad: rocket, boosters and gantry
      F.push(...box(-40, 0, -30, 80, 6, 60, STONE), ...box(-30, 6, -22, 60, 4, 44, "#78909c"), disc(0, 0.2, 60, 60, 16, "#4fd3ff", { layer: 0.3 }));
      F.push(...cyl(0, 10, 0, 9, 9, 86, "#f4f6fb"), ...cone(0, 96, 0, 9, 9, 22, "#ff3b5c"), ...cyl(0, 10, 0, 9.4, 9.4, 4, "#ff3b5c"), ...cyl(0, 48, 0, 9.3, 9.3, 3, "#1f2d5c"));
      [[-15, 0], [15, 0]].forEach(([x, z]) => F.push(...cyl(x, 10, z, 5.5, 5.5, 52, "#eceff1"), ...cone(x, 62, z, 5.5, 5.5, 12, "#ff8a3c")));
      [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + Math.PI / 4; F.push(face([[Math.cos(a) * 9, 10, Math.sin(a) * 9], [Math.cos(a) * 18, 10, Math.sin(a) * 18], [Math.cos(a) * 9, 28, Math.sin(a) * 9]], "#ff3b5c", { twoSided: true })); });
      F.push(...box(30, 6, -8, 12, 110, 12, "#546e7a"), ...box(9, 70, -1.5, 22, 3, 3, "#78909c"), ...box(9, 40, -1.5, 22, 3, 3, "#78909c"));
      for (let y = 14; y < 112; y += 12) F.push(fpatch(30, y, 42, y + 1.2, 4, "#90a4ae", { lift: 0.8 }), rpatch(-8, y, 4, y + 1.2, 42, "#90a4ae", { lift: 0.8 }));
      F.push(label([0, 70, 9.8], "ORBIT", 5, "#1f2d5c"), sprite([0, 9, 0], () => `<ellipse rx="16" ry="6" fill="#fff" opacity=".35"/><ellipse cx="-14" cy="-2" rx="10" ry="5" fill="#fff" opacity=".25"/><ellipse cx="14" cy="-2" rx="10" ry="5" fill="#fff" opacity=".25"/>`, { bias: 1 }));
      F.push(shadow(0, 0, 46, 36, 0.25));
      break;
    }
    case "satellite": { // ground station: dome, dishes and a satellite overhead
      F.push(disc(0, 0.2, 0, 96, 52, "#b0bec5", { layer: 0.3 }), ...box(-28, 0, -22, 56, 28, 44, "#eceff1"), ...box(-30, 28, -24, 60, 3, 48, "#90a4ae"), ...cyl(0, 31, 0, 20, 20, 10, "#cfd8dc", {}, 18), ...cone(0, 41, 0, 20, 20, 16, "#eceff1", {}, 18));
      F.push(fpatch(-20, 8, -6, 20, 22, GLASS), fpatch(6, 8, 20, 20, 22, GLASS), fpatch(-4, 0, 4, 14, 22, "#37474f"));
      const dish = (cx, cz, r, t) => { const U = [1, 0, 0], V = [0, Math.cos(t), -Math.sin(t)]; const c = [cx, 22 + r * 0.9, cz]; F.push(...box(cx - 3, 0, cz - 3, 6, 22, 6, "#546e7a"), tiltDisc(c, U, V, r, "#f4f6fb", { noShade: false }), tiltDisc(add(c, mul(norm([0, Math.sin(t), Math.cos(t)]), 0.8)), U, V, r * 0.82, "#e0e5ec", { noShade: true, bias: 0.4 }), ...box(cx - 1, c[1] + 2, cz + 2, 2, 2, r * 0.9, "#78909c")); };
      dish(-52, 18, 20, 0.9); dish(52, 14, 16, 0.8);
      F.push(sprite([0, 118, 0], () => `<g class="drift"><rect x="-6" y="-5" width="12" height="10" rx="2" fill="#cfd8dc"/><rect x="-26" y="-3" width="18" height="6" fill="#1e88e5"/><rect x="8" y="-3" width="18" height="6" fill="#1e88e5"/><path d="M-26 0 H-8 M8 0 H26" stroke="#90caf9" stroke-width="1"/><path d="M0 5 L0 12" stroke="#cfd8dc" stroke-width="1.5"/><path d="M-10 18 Q0 10 10 18" stroke="#ffd23f" stroke-width="1.5" fill="none" opacity=".8"/><path d="M-16 26 Q0 12 16 26" stroke="#ffd23f" stroke-width="1.2" fill="none" opacity=".5"/></g>`, { bias: 1 }));
      F.push(bush(-70, 36, 0.6), bush(72, 36, 0.6), shadow(0, 0, 40, 32, 0.2));
      break;
    }

    // ----- premium (real-money) items -----
    case "skyvilla": { // glass villa cantilevered off a cliff, infinity pool, gold trim
      F.push(...box(-60, 0, -40, 70, 26, 80, "#8d99a6"), ...box(-64, 26, -44, 78, 4, 88, "#6f7b8a"), ...prism([[-60, 0], [10, 0], [10, 26], [-70, 26]], -40, 40, "#8d99a6").filter(f => f.side === "near" || f.side === "far"));
      F.push(...box(-40, 30, -30, 92, 34, 60, "#f8f9fa"), ...box(-44, 64, -34, 100, 4, 68, "#ffc43d"), ...box(-6, 68, -24, 50, 24, 48, "#ffffff"), ...box(-9, 92, -27, 56, 3, 54, "#ffc43d"));
      F.push(fpatch(-36, 36, 48, 60, 30, GLASS), fpatch(-10, 36, -8.5, 60, 30, "#fff"), fpatch(20, 36, 21.5, 60, 30, "#fff"), fpatch(-2, 72, 40, 90, 24, GLASS), rpatch(-26, 36, 26, 60, 52, GLASS), rpatch(-20, 72, 20, 90, 44, GLASS));
      F.push(...box(-40, 30, 30, 92, 1.5, 22, "#e8edf3"), disc(18, 31.9, 42, 26, 9, "#4fd3ff", { bias: 0.6 }), disc(18, 32.1, 42, 22, 6.5, "#8ae6ff", { bias: 0.7, opacity: 0.6 }));
      F.push(...box(52, 30, -30, 2, 10, 82, "#ffc43d"), ...box(-40, 30, 50, 94, 10, 2, "#ffc43d"), palm(-50, 58, 0.55), bush(60, 56, 0.6), sprite([-30, 100, 0], () => `<text y="4" text-anchor="middle" font-size="9" font-weight="700" fill="#ffc43d" font-family="Fredoka, sans-serif">★ PREMIUM</text>`, { bias: 1 }));
      F.push(shadow(0, 0, 66, 50, 0.25));
      break;
    }
    case "mint": { // gold-domed vault that prints money, coin stacks outside
      F.push(...box(-46, 0, -32, 92, 6, 64, "#cfd8dc"), ...box(-40, 6, -26, 80, 44, 52, "#f5f5f5"), ...box(-42, 50, -28, 84, 5, 56, "#ffc43d"));
      [-30, -14, 14, 30].forEach(x => F.push(...box(x - 3.5, 6, 24, 7, 44, 6, "#ffe27a")));
      F.push(...cyl(0, 55, 0, 30, 24, 8, "#ffd23f", {}, 18), ...cone(0, 63, 0, 28, 22, 26, "#ffc43d", {}, 18), ...box(-1.5, 88, -1.5, 3, 10, 3, "#ffe27a"));
      F.push(disc(0, 28, 26.6, 13, 13, "#37474f", { bias: 0.5 }, 20), disc(0, 28, 26.9, 10, 10, "#546e7a", { bias: 0.6 }, 20), disc(0, 28, 27.2, 3, 3, "#ffc43d", { bias: 0.7 }, 12));
      F.push(fpatch(-34, 20, -22, 40, 26, GLASS), fpatch(22, 20, 34, 40, 26, GLASS), label([0, 46, 26.6], "THE MINT", 7, "#5a3a00"));
      [[-56, 20, 4], [-62, 32, 3], [58, 24, 5], [64, 36, 2]].forEach(([x, z, n]) => { for (let k = 0; k < n; k++) F.push(...cyl(x, k * 2.6, z, 5, 5, 2.4, k % 2 ? "#ffd23f" : "#ffc43d", {}, 10)); });
      F.push(sprite([0, 104, 0], () => `<g class="pop"><circle r="9" fill="#ffd23f" stroke="#fff" stroke-width="1.5"/><text y="3.5" text-anchor="middle" font-size="10" font-weight="700" fill="#3a2300" font-family="Fredoka, sans-serif">$</text></g>`, { bias: 1 }));
      F.push(shadow(0, 0, 60, 46, 0.25));
      break;
    }
    default: F.push(...box(-30, 0, -25, 60, 60, 50, "#90a4ae"), shadow(0, 0, 40, 36, 0.25));
  }
  return dressWindows(F);
}

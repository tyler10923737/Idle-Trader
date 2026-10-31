// iso.js — a tiny 3D engine for stylized "2.5D" scenes.
// Orthographic camera with yaw (theta) and pitch (phi), flat-shaded polygons with a camera-space
// light, back-face culling, painter's depth sorting with layers, decals mapped onto faces with an
// affine matrix, and renderers for SVG strings and <canvas>. World axes: x right, y up, z toward viewer.

const f = v => Math.round(v * 100) / 100;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function camera(o = {}) {
  const theta = o.theta ?? -0.52, phi = o.phi ?? 0.42, scale = o.scale ?? 1, cx = o.cx ?? 0, cy = o.cy ?? 0;
  return { theta, phi, scale, cx, cy, ct: Math.cos(theta), st: Math.sin(theta), cp: Math.cos(phi), sp: Math.sin(phi),
    light: norm(o.light || [-0.35, 0.85, 0.5]), ambient: o.ambient ?? 0.45, diffuse: o.diffuse ?? 0.6 };
}
// world point -> [screenX, screenY, depth]  (depth grows toward the viewer)
export function project(cam, p) {
  const xr = p[0] * cam.ct + p[2] * cam.st, zr = -p[0] * cam.st + p[2] * cam.ct;
  return [cam.cx + xr * cam.scale, cam.cy + (-p[1] * cam.cp + zr * cam.sp) * cam.scale, p[1] * cam.sp + zr * cam.cp];
}
export const depthOf = (cam, p) => project(cam, p)[2];
export function toCam(cam, n) { return [n[0] * cam.ct + n[2] * cam.st, n[1], -n[0] * cam.st + n[2] * cam.ct]; }
// screen vectors of the world axes (per world unit)
export function basis(cam) {
  return { x: [cam.ct * cam.scale, -cam.st * cam.sp * cam.scale], y: [0, -cam.cp * cam.scale], z: [cam.st * cam.scale, cam.ct * cam.sp * cam.scale] };
}
export function faceNormal(pts) {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
  return norm([nx, ny, nz]);
}
export const centroid = pts => mul(pts.reduce((t, p) => add(t, p), [0, 0, 0]), 1 / pts.length);
// Make every face of a convex solid wind outward (so culling and lighting are consistent).
export function orient(faces, c) {
  c = c || centroid(faces.flatMap(fc => fc.pts));
  faces.forEach(fc => { if (fc.pts.length >= 3 && dot(faceNormal(fc.pts), sub(centroid(fc.pts), c)) < 0) fc.pts.reverse(); });
  return faces;
}

// ---------- colors ----------
export function shade(hex, k) {
  let c = hex.replace("#", ""); if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const n = parseInt(c, 16); const r = Math.min(255, Math.round(((n >> 16) & 255) * k)), g = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ---------- primitives ----------
export const face = (pts, color, o = {}) => ({ pts, color, ...o });
// Axis-aligned box; x,y,z = minimum corner. o.colors = {top,bottom,front,back,left,right} overrides.
export function box(x, y, z, w, h, d, color, o = {}) {
  const { colors: c = {}, ...rest } = o; o = rest;
  const p = [[x, y, z], [x + w, y, z], [x + w, y, z + d], [x, y, z + d], [x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d]];
  const fs = [
    face([p[4], p[5], p[6], p[7]], c.top || color, { ...o, side: "top" }),
    face([p[0], p[1], p[2], p[3]], c.bottom || color, { ...o, side: "bottom" }),
    face([p[3], p[2], p[6], p[7]], c.front || color, { ...o, side: "front" }),
    face([p[0], p[1], p[5], p[4]], c.back || color, { ...o, side: "back" }),
    face([p[0], p[3], p[7], p[4]], c.left || color, { ...o, side: "left" }),
    face([p[1], p[2], p[6], p[5]], c.right || color, { ...o, side: "right" })
  ];
  return orient(fs, [x + w / 2, y + h / 2, z + d / 2]);
}
// Extrude a 2D polygon in the x-y plane (y up) from z0 to z1. o.edge(i, a, b) may return a color per edge face.
export function prism(poly, z0, z1, color, o = {}) {
  const { edge, sideColor, ...rest } = o;
  const near = poly.map(([x, y]) => [x, y, z1]), far = poly.map(([x, y]) => [x, y, z0]);
  const fs = [face(near, sideColor || color, { ...rest, side: "near" }), face([...far].reverse(), sideColor || color, { ...rest, side: "far" })];
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    const col = edge ? (edge(i, poly[i], poly[j]) || color) : color;
    fs.push(face([near[i], near[j], far[j], far[i]], col, { ...rest, side: "edge", edge: i }));
  }
  return orient(fs, centroid(near.concat(far)));
}
// Rotate faces around the y axis (angle in radians) about point c.
export function rotateY(faces, a, c = [0, 0, 0]) {
  const ca = Math.cos(a), sa = Math.sin(a);
  faces.forEach(fc => { fc.pts = fc.pts.map(p => { const x = p[0] - c[0], z = p[2] - c[2]; return [c[0] + x * ca + z * sa, p[1], c[2] - x * sa + z * ca]; }); });
  return faces;
}
export function translate(faces, v) { faces.forEach(fc => { fc.pts = fc.pts.map(p => add(p, v)); }); return faces; }
// Flat ellipse on the ground (y = h) — used for shadows and discs.
export function disc(cx, h, cz, rx, rz, color, o = {}, n = 24) {
  const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, h, cz + Math.sin(a) * rz]); }
  return face(pts, color, { twoSided: true, noShade: true, ...o });
}
export const shadow = (cx, cz, rx, rz, alpha = 0.22, layer = 0.5) => disc(cx, 0.3, cz, rx, rz, "#000", { opacity: alpha, layer });

// A rectangular decal: O = top-left corner (world), U = along the top edge, V = down the face.
// draw(w, h) returns SVG content in local coordinates (0..w, 0..h). Rendered inside a transformed <g>.
let uid = 0;
export function decal(O, U, V, draw, o = {}) {
  // corner order O, O+V, O+U+V, O+U gives the decal an outward normal (toward the viewer of the face)
  const pts = [O, add(O, V), add(add(O, U), V), add(O, U)];
  return { pts, color: "#000", custom: true, bias: o.bias ?? 0.5, layer: o.layer, twoSided: o.twoSided, cls: o.cls, attrs: o.attrs,
    svg(it, cam) {
      // read the corners back from pts so the decal follows rotateY / translate
      const p0 = this.pts[0], Uu = sub(this.pts[3], p0), Vv = sub(this.pts[1], p0), w = len(Uu), h = len(Vv);
      const m = faceMatrix(cam, p0, Uu, Vv); const id = "d" + (uid++);
      const clip = o.clip === false ? "" : `<clipPath id="${id}"><rect x="-0.5" y="-0.5" width="${f(w + 1)}" height="${f(h + 1)}"/></clipPath>`;
      return `<g transform="${m}"${o.cls ? ` class="${o.cls}"` : ""}${o.attrs || ""}>${clip}<g${o.clip === false ? "" : ` clip-path="url(#${id})"`}>${draw(w, h, cam)}</g></g>`;
    } };
}
export function faceMatrix(cam, O, U, V) {
  const o = project(cam, O), u = project(cam, add(O, U)), v = project(cam, add(O, V));
  const lu = len(U) || 1, lv = len(V) || 1;
  return `matrix(${f((u[0] - o[0]) / lu)} ${f((u[1] - o[1]) / lu)} ${f((v[0] - o[0]) / lv)} ${f((v[1] - o[1]) / lv)} ${f(o[0])} ${f(o[1])})`;
}
// A 2D sprite drawn at world point p (its local origin lands on p). draw(cam) returns SVG.
// o.depthPoint: optional world point used for depth sorting instead of p.
export function sprite(p, draw, o = {}) {
  return { pts: [o.depthPoint || p], at: p, color: "#000", custom: true, bias: o.bias ?? 0, layer: o.layer,
    svg(it, cam) { const q = project(cam, this.at); const k = (o.scale ?? 1) * cam.scale; return `<g transform="translate(${f(q[0])} ${f(q[1])}) scale(${f(k)})"${o.cls ? ` class="${o.cls}"` : ""}${o.attrs || ""}>${draw(cam)}</g>`; } };
}
export function rotateItems(items, a, c = [0, 0, 0]) {
  const ca = Math.cos(a), sa = Math.sin(a), R = p => { const x = p[0] - c[0], z = p[2] - c[2]; return [c[0] + x * ca + z * sa, p[1], c[2] - x * sa + z * ca]; };
  items.forEach(it => { it.pts = it.pts.map(R); if (it.at) it.at = R(it.at); });
  return items;
}
export function translateItems(items, v) { items.forEach(it => { it.pts = it.pts.map(p => add(p, v)); if (it.at) it.at = add(it.at, v); }); return items; }

// ---------- rendering ----------
export function litColor(cam, fc, nCam) {
  if (fc.noShade) return fc.color;
  const d = Math.max(0, dot(nCam, cam.light));
  return shade(fc.color, Math.min(1.18, cam.ambient + cam.diffuse * d));
}
// Decals (small biased faces lying on a bigger face: windows, lights, seams…) are depth-sorted with the face they sit on,
// otherwise a decal on the far half of a wall sorts behind the wall and disappears. Hosts are found once per face array.
export function attachDecals(faces) {
  const hosts = [];
  for (const f of faces) {
    if (!f || !f.pts || f.pts.length < 3 || f.bias > 0 || f.custom || f.layer !== undefined) continue;
    const n = faceNormal(f.pts), c = centroid(f.pts);
    const min = [0, 1, 2].map(i => Math.min(...f.pts.map(p => p[i]))), max = [0, 1, 2].map(i => Math.max(...f.pts.map(p => p[i])));
    hosts.push({ f, n, d: dot(n, c), min, max, size: (max[0] - min[0] + 1) * (max[1] - min[1] + 1) * (max[2] - min[2] + 1) });
  }
  for (const f of faces) {
    if (!f || !f.pts) continue;
    if (!(f.bias > 0) || f.custom || f.pts.length < 3 || f.layer !== undefined) { f.host = null; continue; }
    const c = centroid(f.pts), n = faceNormal(f.pts);
    let best = null;
    for (const h of hosts) {
      if (Math.abs(dot(h.n, c) - h.d) > 2.2 || dot(h.n, n) < 0.5) continue;
      if (c[0] < h.min[0] - 1 || c[0] > h.max[0] + 1 || c[1] < h.min[1] - 1 || c[1] > h.max[1] + 1 || c[2] < h.min[2] - 1 || c[2] > h.max[2] + 1) continue;
      if (!best || h.size < best.size) best = h;
    }
    f.host = best ? best.f : null;
  }
  faces.decalsAttached = true;
  return faces;
}
export function render(cam, faces) {
  const items = [];
  if (!faces.decalsAttached) attachDecals(faces);
  const hostDepth = new Map();
  const depthOfFace = f => { let d = hostDepth.get(f); if (d === undefined) { d = f.pts.reduce((t, pt) => t + project(cam, pt)[2], 0) / f.pts.length; hostDepth.set(f, d); } return d; };
  for (const fc of faces) {
    if (!fc) continue;
    const p = fc.pts.map(pt => project(cam, pt));
    const depth = (fc.host ? depthOfFace(fc.host) : p.reduce((t, q) => t + q[2], 0) / p.length) + (fc.bias || 0);
    if (fc.pts.length < 3) { items.push({ f: fc, p, depth, layer: fc.layer ?? 1 }); continue; }
    let n = toCam(cam, faceNormal(fc.pts));
    const facing = n[1] * cam.sp + n[2] * cam.cp;
    if (facing <= 0.0001) { if (!fc.twoSided) continue; n = mul(n, -1); }
    if (fc.custom) { items.push({ f: fc, p, depth, layer: fc.layer ?? 1 }); continue; }
    items.push({ f: fc, p, depth, layer: fc.layer ?? 1, fill: litColor(cam, fc, n) });
  }
  items.sort((a, b) => a.layer - b.layer || a.depth - b.depth);
  return items;
}
export function toSVG(cam, faces, o = {}) {
  return render(cam, faces).map(it => {
    if (it.f.custom) return it.f.svg(it, cam);
    const pts = it.p.map(q => `${f(q[0])},${f(q[1])}`).join(" ");
    const op = it.f.opacity !== undefined ? ` opacity="${it.f.opacity}"` : "";
    const stroke = it.f.noStroke || o.noStroke ? "" : ` stroke="${it.fill}" stroke-width="${o.seam ?? 0.7}" stroke-linejoin="round"`;
    return `<polygon points="${pts}" fill="${it.fill}"${op}${stroke}${it.f.cls ? ` class="${it.f.cls}"` : ""}${it.f.attrs || ""}/>`;
  }).join("");
}
export function toCanvas(ctx, cam, faces, o = {}) {
  for (const it of render(cam, faces)) {
    if (it.f.custom) { if (it.f.draw) it.f.draw(ctx, it, cam); continue; }
    ctx.beginPath();
    it.p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.closePath();
    ctx.globalAlpha = it.f.opacity ?? 1;
    ctx.fillStyle = it.fill; ctx.fill();
    if (!it.f.noStroke && !o.noStroke) { ctx.strokeStyle = it.fill; ctx.lineWidth = o.seam ?? 0.8; ctx.lineJoin = "round"; ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}
// Canvas helper: an ellipse that is the projection of a circle of radius r in the x-y plane at world point c.
export function wheelEllipse(ctx, cam, c, r, fill, o = {}) {
  const b = basis(cam), q = project(cam, c);
  ctx.save(); ctx.transform(b.x[0] * r, b.x[1] * r, b.y[0] * r, b.y[1] * r, q[0], q[1]);
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore();
  ctx.fillStyle = fill; ctx.fill();
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lineWidth || 1; ctx.stroke(); }
}
// Fit helper: screen bounding box of a set of world points.
export function bounds(cam, pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(p => { const q = project(cam, p); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

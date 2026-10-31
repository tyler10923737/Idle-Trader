// Showroom / Garage: a 3D turntable you can spin with your finger, buy / tune / paint cars,
// and a parking garage that fills up with everything you own.
import * as E from "../economy.js";
import { ASSETS, PAINTS, MOD_MAX, MOD_INCOME_PER_LEVEL, GARAGE, OUTFITS } from "../data.js";
import { fmt } from "../format.js";
import { showroomSVG, icon } from "../art.js";
import { parkingSVG3D, drawShowroom } from "../scenes3d.js";
import { $, el, esc, toast, sfx, coinBurst, pop, openSheet, modal, prefs, savePrefs } from "../ui.js";
import * as monetize from "../monetize.js";

const CARS = ASSETS.filter(a => a.kind === "car");
const GARAGE_NAMES = ["Backyard Garage", "Painted Garage", "Glass Showroom", "Private Collection", "Collector's Hall", "Grand Hall", "Legend's Vault"];
const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
let refs = {}, featured = 0, bgSig = "", gridSig = "", modsSig = "", active = false;
// turntable
const tt = { theta: -0.6, vel: 0, dragging: false, lastX: 0, lastT: 0, idleAt: 0, raf: null, ctx: null, w: 0, h: 0, body: "sedan", color: "#fff", prev: null, next: null, bounce: 0 };

function featuredCar() { return CARS[featured]; }
function setFeatured(i, dir = 0) {
  featured = (i + CARS.length) % CARS.length;
  prefs.featuredCar = featured; savePrefs();
  tt.vel = dir * 0.12; tt.idleAt = performance.now();
  bgSig = ""; garageScene.update(E.getState());
  sfx.whoosh();
}
function sizeCanvas() {
  const c = refs.canvas, w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  tt.ctx = c.getContext("2d"); tt.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); tt.w = w; tt.h = h;
}
function frame(ts) {
  tt.raf = null;
  if (!active) return;
  if (!tt.dragging) {
    if (Math.abs(tt.vel) > 0.0006) { tt.theta += tt.vel; tt.vel *= 0.94; }
    else if (!reduceMotion && ts - tt.idleAt > 2600) tt.theta -= 0.0042;
  }
  if (tt.bounce > 0) tt.bounce = Math.max(0, tt.bounce - 0.06);
  draw(ts);
  tt.raf = requestAnimationFrame(frame);
}
function draw(ts = 0) {
  if (!tt.ctx) sizeCanvas();
  if (!tt.ctx) return;
  const lift = tt.bounce ? Math.sin(tt.bounce * Math.PI) * 10 : 0;
  tt.ctx.save(); if (lift) tt.ctx.translate(0, -lift);
  drawShowroom(tt.ctx, tt.w, tt.h, { theta: tt.theta, body: tt.body, color: tt.color, prev: tt.prev, next: tt.next, time: ts });
  tt.ctx.restore();
}
function startLoop() { if (!tt.raf && active) tt.raf = requestAnimationFrame(frame); }
function stopLoop() { if (tt.raf) cancelAnimationFrame(tt.raf); tt.raf = null; }

export const garageScene = {
  id: "garage", label: "Garage", iconName: "garage",
  build(section) {
    featured = Math.min(CARS.length - 1, Math.max(0, prefs.featuredCar | 0));
    section.innerHTML = `
      <div class="art-box showroom-box">
        <div class="art" id="showroomArt"></div>
        <canvas class="turntable" id="showroomCanvas" aria-label="Car turntable — drag to spin"></canvas>
        <button class="arrow arrow-l" id="carPrev" aria-label="Previous car">${icon("left")}</button>
        <button class="arrow arrow-r" id="carNext" aria-label="Next car">${icon("right")}</button>
        <div class="feature-badge" id="carBadge"></div>
        <div class="art-chip" id="garageChip">${icon("garage")}<span>Backyard Garage</span></div>
        <div class="spin-hint" id="spinHint">${icon("expand")} drag to spin</div>
        <div class="dots" id="carDots"></div>
      </div>
      <div class="scene-body">
        <div class="panel car-panel">
          <div class="panel-head"><div><span class="eyebrow" id="carCat">VEHICLE 1 OF ${CARS.length}</span><h3 id="carName"></h3></div><div class="price-tag" id="carPrice"></div></div>
          <p class="desc" id="carDesc"></p>
          <div class="stat-row"><div class="stat"><small>VALUE</small><b id="carValue"></b></div><div class="stat"><small>INCOME</small><b id="carIncome" class="good"></b></div><div class="stat"><small>TRADE BONUS</small><b id="carBonus"></b></div></div>
          <button class="btn btn-gold btn-big" id="buyCarBtn">BUY</button>
          <div class="mod-row" id="carMods"></div>
        </div>
        <div class="panel garage-panel">
          <div class="panel-head"><div><span class="eyebrow">MY GARAGE</span><h3 id="garageTitle">0 / 4 spaces</h3></div><button class="btn btn-sm btn-cyan" id="expandBtn">Expand</button></div>
          <p class="desc" id="garageDesc">Every car you buy is parked here and keeps earning. Expand to park more and unlock a nicer garage.</p>
          <div class="park-grid" id="parkGrid"></div>
        </div>
      </div>`;
    refs = { art: $("#showroomArt"), canvas: $("#showroomCanvas"), badge: $("#carBadge"), chip: $("#garageChip span"), hint: $("#spinHint"), dots: $("#carDots"), cat: $("#carCat"), name: $("#carName"), price: $("#carPrice"), desc: $("#carDesc"), value: $("#carValue"), income: $("#carIncome"), bonus: $("#carBonus"), buy: $("#buyCarBtn"), mods: $("#carMods"), title: $("#garageTitle"), expand: $("#expandBtn"), grid: $("#parkGrid") };
    $("#carPrev").addEventListener("click", () => setFeatured(featured - 1, -1));
    $("#carNext").addEventListener("click", () => setFeatured(featured + 1, 1));
    // drag to spin (pointer events; vertical scrolling still works thanks to touch-action: pan-y)
    const c = refs.canvas;
    c.addEventListener("pointerdown", e => { tt.dragging = true; tt.lastX = e.clientX; tt.lastT = performance.now(); tt.vel = 0; c.setPointerCapture(e.pointerId); refs.hint.classList.add("gone"); });
    c.addEventListener("pointermove", e => { if (!tt.dragging) return; const dx = e.clientX - tt.lastX, now = performance.now(), dt = Math.max(8, now - tt.lastT); tt.theta -= dx * 0.012; tt.vel = -dx * 0.012 * (16 / dt); tt.lastX = e.clientX; tt.lastT = now; });
    const release = () => { if (!tt.dragging) return; tt.dragging = false; tt.idleAt = performance.now(); };
    c.addEventListener("pointerup", release); c.addEventListener("pointercancel", release); c.addEventListener("pointerleave", release);
    window.addEventListener("resize", () => { tt.ctx = null; if (active) draw(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) stopLoop(); else startLoop(); });
    refs.buy.addEventListener("click", async ev => {
      const car = featuredCar(), btn = ev.currentTarget;
      if (car.premium) { btn.disabled = true; const ok = await monetize.buy(car.premium); btn.disabled = false; if (ok) { coinBurst(btn, 12); tt.bounce = 1; tt.vel = 0.08; } return; }
      if (E.buyAsset(car.id)) { sfx.buy(); coinBurst(btn, 12); toast(`${car.name} parked in your garage!`, "good"); tt.bounce = 1; tt.vel = 0.08; }
      else { sfx.fail(); pop(refs.expand); }
    });
    refs.expand.addEventListener("click", ev => {
      if (E.expandGarage()) { sfx.success(); coinBurst(ev.currentTarget, 10); toast(`Garage expanded: ${E.garageSpaces()} spaces!`, "good"); } else sfx.fail();
    });
    refs.mods.addEventListener("click", ev => {
      const b = ev.target.closest("button"); if (!b) return;
      const car = featuredCar();
      if (b.dataset.act === "tune") { if (E.buyMod(car.id)) { sfx.buy(); coinBurst(b, 6); toast(`${car.name} tuned to level ${E.modLevel(car.id)}!`, "good"); tt.bounce = 1; } else sfx.fail(); }
      if (b.dataset.act === "paint") { sfx.tap(); openPaintSheet(car); }
    });
    refs.grid.addEventListener("click", ev => {
      const tile = ev.target.closest("[data-car]"); if (!tile) return;
      const i = CARS.findIndex(c => c.id === tile.dataset.car); if (i >= 0) { setFeatured(i); section.scrollTo({ top: 0, behavior: "smooth" }); }
    });
  },
  onShow() { active = true; tt.ctx = null; tt.idleAt = performance.now(); draw(); startLoop(); },
  onHide() { active = false; stopLoop(); },
  update(s) {
    const car = featuredCar(), owned = s.assets[car.id] || 0, level = s.garageLevel;
    const color = E.carColor(car, s);
    const prev = CARS[(featured - 1 + CARS.length) % CARS.length], next = CARS[(featured + 1) % CARS.length];
    tt.body = car.body; tt.color = color; tt.prev = { body: prev.body, color: E.carColor(prev, s) }; tt.next = { body: next.body, color: E.carColor(next, s) };
    const sig = [featured, level, color, s.outfit].join("|");
    if (sig !== bgSig) {
      bgSig = sig;
      const o = OUTFITS.find(x => x.id === s.outfit) || OUTFITS[0];
      refs.art.innerHTML = showroomSVG({ level, bare: true, featured: { body: car.body, color }, outfit: { top: o.top, accent: o.accent, pants: o.pants, style: o.style } });
      refs.chip.textContent = GARAGE_NAMES[Math.min(level, GARAGE_NAMES.length - 1)];
      refs.dots.innerHTML = CARS.map((c, i) => `<i class="${i === featured ? "on" : ""} ${s.assets[c.id] ? "owned" : ""}"></i>`).join("");
      refs.cat.textContent = `VEHICLE ${featured + 1} OF ${CARS.length}`;
      refs.name.textContent = car.name; refs.desc.textContent = car.desc;
      if (active) draw();
    }
    const locked = !E.isUnlocked(car, s);
    refs.badge.innerHTML = car.premium ? `${icon("sparkle")} PREMIUM${owned ? " · OWNED" : ""}` : owned ? (owned > 1 ? `OWNED ×${owned}` : "OWNED") : locked ? `${icon("lock")} LEVEL ${car.unlock}` : "FOR SALE"; refs.badge.classList.toggle("owned", owned > 0 && !car.premium); refs.badge.classList.toggle("lock", locked); refs.badge.classList.toggle("premium", !!car.premium);
    const mod = E.modLevel(car.id, s);
    const product = car.premium ? monetize.productById(car.premium) : null;
    refs.price.textContent = product ? monetize.priceLabel(product) : fmt(E.assetPrice(car, s));
    refs.value.textContent = fmt(E.assetValueOf(car, s));
    refs.income.textContent = "+" + fmt(E.assetIncomeOf(car, s)) + "/sec";
    refs.bonus.textContent = "+" + Math.round(car.bonus * 100) + "% profit";
    const spaces = E.garageSpaces(s), cars = E.carCount(s), full = cars >= spaces, price = E.assetPrice(car, s), can = s.cash >= price;
    refs.buy.disabled = product ? owned > 0 : owned > 0 || locked || !can || full;
    refs.buy.innerHTML = product ? (owned ? `${icon("check")} YOURS FOREVER` : `GET IT · ${monetize.priceLabel(product)}`) : owned ? `${icon("check")} IN YOUR GARAGE` : locked ? `${icon("lock")} UNLOCKS AT LEVEL ${car.unlock}` : full ? `GARAGE FULL — EXPAND BELOW` : can ? `BUY · ${fmt(price)}` : `NEED ${fmt(price - s.cash)} MORE`;
    const msig = [car.id, owned > 0, mod, s.paints[car.id] || "stock", s.cash >= E.assetModCost(car, s)].join("|");
    if (msig !== modsSig) {
      modsSig = msig;
      if (!owned) refs.mods.innerHTML = `<div class="mod-hint">${icon("wrench")} Buy it to unlock <b>Tune</b> (+${Math.round(MOD_INCOME_PER_LEVEL * 100)}% income per level) and <b>Paint</b>.</div>`;
      else {
        const maxed = mod >= MOD_MAX, cost = E.assetModCost(car, s);
        refs.mods.innerHTML = `<button class="btn btn-sm btn-cyan" data-act="tune" ${maxed || s.cash < cost ? "disabled" : ""}>${icon("wrench")} Tune ${mod}/${MOD_MAX} ${maxed ? "· MAX" : "· " + fmt(cost)}</button><button class="btn btn-sm btn-ghost" data-act="paint">${icon("paint")} Paint · ${E.paintOf(car.id, s).name}</button>`;
      }
    }
    const gsig = JSON.stringify([CARS.map(c => [s.assets[c.id] || 0, s.mods[c.id] || 0, s.paints[c.id] || ""]), level]);
    if (gsig !== gridSig) {
      gridSig = gsig;
      const tiles = [];
      CARS.forEach(c => { for (let i = 0; i < (s.assets[c.id] || 0); i++) tiles.push(c); });
      const total = Math.max(spaces, tiles.length);
      let html = "";
      for (let i = 0; i < total; i++) {
        const c = tiles[i];
        if (c) html += `<div class="park ${c.id === car.id ? "sel" : ""}" data-car="${c.id}">${parkingSVG3D(c, E.carColor(c, s))}<div class="park-meta"><b>${esc(c.name)}</b><small class="good">+${fmt(E.assetIncomeOf(c, s))}/sec${s.mods[c.id] ? ` · tune ${s.mods[c.id]}` : ""}</small></div></div>`;
        else html += `<div class="park empty">${parkingSVG3D(null)}<div class="park-meta"><b>Empty space</b><small>Buy a car to park here</small></div></div>`;
      }
      refs.grid.innerHTML = html;
    } else refs.grid.querySelectorAll(".park[data-car]").forEach(t => t.classList.toggle("sel", t.dataset.car === car.id));
    refs.title.textContent = `${cars} / ${spaces} spaces`;
    const maxLv = level >= GARAGE.maxLevel, ecost = E.garageExpandCost(s);
    refs.expand.innerHTML = maxLv ? `${icon("check")} Max size` : `${icon("expand")} Expand · ${fmt(ecost)}`;
    refs.expand.disabled = maxLv || s.cash < ecost;
    refs.expand.classList.toggle("attention", full && !maxLv && s.cash >= ecost);
  }
};

function openPaintSheet(car) {
  const body = el(`<div class="paint-grid"></div>`);
  const cost = E.paintCost(car);
  const render = s => {
    body.innerHTML = PAINTS.map(p => `<button class="swatch ${(s.paints[car.id] || "stock") === p.id ? "on" : ""}" data-paint="${p.id}" style="--c:${p.color || car.color}"><i></i><span>${esc(p.name)}</span></button>`).join("");
  };
  render(E.getState());
  body.addEventListener("click", ev => {
    const b = ev.target.closest("[data-paint]"); if (!b) return;
    if (E.buyPaint(car.id, b.dataset.paint)) { sfx.buy(); coinBurst(b, 6); toast(`${car.name} repainted!`, "good"); render(E.getState()); bgSig = ""; garageScene.update(E.getState()); tt.bounce = 1; }
    else { sfx.fail(); if ((E.getState().paints[car.id] || "stock") !== b.dataset.paint) toast(`Repainting costs ${fmt(cost)}.`); }
  });
  openSheet({ title: `Paint shop · ${car.name}`, subtitle: `Each repaint costs ${fmt(cost)}. Your color shows on the turntable and in the garage.`, body });
}

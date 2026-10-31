// Shop sheet: premium items, remove ads, cash packs, restore purchases. Opened from the HUD "+" and from Me.
import * as E from "../economy.js";
import { PRODUCTS, ASSETS, ADS } from "../data.js";
import { fmt } from "../format.js";
import { icon } from "../art.js";
import { assetScene3D } from "../scenes3d.js";
import { carModel } from "../models.js";
import { camera, toSVG } from "../iso.js";
import * as $$ from "../monetize.js";
import { $, el, esc, sfx, openSheet, coinBurst, pop, toast } from "../ui.js";

const KIND_LABEL = { item: "PREMIUM", noads: "NO ADS", cash: "CASH" };
function art(p) {
  if (p.kind !== "item") return `<div class="row-icon shop-ic">${icon(p.kind === "noads" ? "sparkle" : "coin")}</div>`;
  const a = ASSETS.find(x => x.id === p.item);
  if (a.kind === "car") { const cam = camera({ theta: -0.6, phi: 0.42, scale: 0.42, cx: 60, cy: 52 }); return `<div class="shop-art"><svg viewBox="0 0 120 80">${toSVG(cam, carModel(a.body, a.color))}</svg></div>`; }
  return `<div class="shop-art">${assetScene3D(a, "shop-scene")}</div>`;
}
export function openShop(highlight) {
  const body = el(`<div class="list shop-list"></div>`);
  const rows = {};
  PRODUCTS.forEach(p => {
    const row = el(`<div class="row shop-row ${p.kind} ${p.id === highlight ? "pop-anim" : ""}" data-product="${p.id}">${art(p)}<div class="row-main"><div class="row-title"><b>${esc(p.name)}</b><span class="tag tag-premium">${KIND_LABEL[p.kind]}</span></div><p>${esc(p.desc)}</p><div class="row-effect" data-effect></div></div><button class="btn btn-sm btn-gold" data-buy>${$$.priceLabel(p)}</button></div>`);
    row.querySelector("[data-buy]").addEventListener("click", async ev => {
      const b = ev.currentTarget; b.disabled = true;
      const ok = await $$.buy(p.id);
      if (ok) { coinBurst(b, 10); pop(row); } else sfx.tap();
      refresh(E.getState());
    });
    rows[p.id] = row; body.appendChild(row);
  });
  const foot = el(`<div class="shop-foot"><button class="btn btn-sm btn-ghost" id="restoreBtn">${icon("cloud")} Restore purchases</button><p class="fine">Prices in USD; your store shows local prices. Premium items are kept forever — across resets and prestige. Virtual in-game currency only: nothing bought here can be cashed out.${$$.isTestMode() ? " <b>Test mode:</b> purchases and ads are simulated and nothing is charged." : ""}</p></div>`);
  foot.querySelector("#restoreBtn").addEventListener("click", async () => { sfx.tap(); await $$.restore(); refresh(E.getState()); });
  body.appendChild(foot);
  const refresh = s => PRODUCTS.forEach(p => {
    const row = rows[p.id], owned = E.ownsProduct(p, s), b = row.querySelector("[data-buy]");
    b.disabled = owned; b.textContent = owned ? "OWNED" : $$.priceLabel(p);
    row.classList.toggle("owned", owned);
    const eff = row.querySelector("[data-effect]");
    if (p.kind === "cash") eff.textContent = `+${fmt(E.cashPackAmount(p, s))} at your current income`;
    else if (p.kind === "item") { const a = ASSETS.find(x => x.id === p.item); eff.textContent = `Now: +${fmt(E.assetIncomeOf(a, s))}/sec · +${Math.round(a.bonus * 100)}% trade profit · grows every level`; }
    else eff.textContent = owned ? "Ads are off." : "No banner, no ads between trades. Rewarded ads (boosts, free cash) stay optional.";
  });
  refresh(E.getState());
  openSheet({ title: "Shop", subtitle: "Premium items from level 1, cash packs, and no ads.", body, onUpdate: refresh, cls: "sheet-shop" });
  if (highlight && rows[highlight]) requestAnimationFrame(() => rows[highlight].scrollIntoView({ block: "center", behavior: "smooth" }));
}

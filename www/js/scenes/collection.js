// Shared scene for Properties and Businesses: an illustrated strip of what you own, then owned /
// for-sale cards. Buying updates cash, ownership and passive income through the shared economy.
import * as E from "../economy.js";
import { ASSETS, MOD_MAX, MOD_INCOME_PER_LEVEL } from "../data.js";
import * as monetize from "../monetize.js";
import { fmt } from "../format.js";
import { icon } from "../art.js";
import { assetScene3D as assetScene, collectionStrip3D as collectionStrip } from "../scenes3d.js";
import { $, el, esc, toast, sfx, coinBurst, pop } from "../ui.js";

export function makeCollectionScene(cfg) {
  const items = ASSETS.filter(a => a.kind === cfg.kind);
  let refs = {}, listSig = "", stripSig = "", cards = {};
  const isBiz = cfg.kind === "business";

  function card(a, s) {
    const owned = s.assets[a.id] || 0;
    const c = el(`<article class="asset-card ${owned ? "owned" : ""}" data-id="${a.id}">
      <div class="asset-art">${assetScene(a)}<span class="count" data-count></span></div>
      <div class="asset-main">
        <div class="asset-top"><h4>${esc(a.name)}</h4><span class="tag" data-tag></span></div>
        <p>${esc(a.desc)}</p>
        <div class="asset-stats"><span class="good" data-income></span><span data-value></span><span>+${Math.round(a.bonus * 100)}% profit</span></div>
        <div class="asset-actions"><button class="btn btn-sm btn-gold" data-buy></button>${isBiz ? "" : `<button class="btn btn-sm btn-cyan" data-mod></button>`}</div>
      </div></article>`);
    c.querySelector("[data-buy]").addEventListener("click", async ev => {
      if (a.premium) { const b = ev.currentTarget; b.disabled = true; const ok = await monetize.buy(a.premium); b.disabled = false; if (ok) { coinBurst(b, 12); pop(c); } return; }
      if (E.buyAsset(a.id)) { sfx.buy(); coinBurst(ev.currentTarget, 10); pop(c); toast(isBiz ? `${a.name} ${s.assets[a.id] > 1 ? "leveled up" : "opened"}!` : `${a.name} added to your portfolio!`, "good"); }
      else sfx.fail();
    });
    const modBtn = c.querySelector("[data-mod]");
    if (modBtn) modBtn.addEventListener("click", ev => { if (E.buyMod(a.id)) { sfx.buy(); coinBurst(ev.currentTarget, 6); toast(`${a.name} renovated to level ${E.modLevel(a.id)}!`, "good"); } else sfx.fail(); });
    return c;
  }
  function refreshCard(a, s) {
    const c = cards[a.id]; if (!c) return;
    const owned = s.assets[a.id] || 0, price = E.assetPrice(a, s), locked = !owned && !E.isUnlocked(a, s), can = !locked && s.cash >= price, product = a.premium ? monetize.productById(a.premium) : null;
    c.classList.toggle("owned", owned > 0); c.classList.toggle("locked", locked); c.classList.toggle("premium", !!product);
    c.querySelector("[data-count]").textContent = owned && !product ? (isBiz ? `LV ${owned}` : `×${owned}`) : "";
    const tag = c.querySelector("[data-tag]"); tag.innerHTML = product ? `${icon("sparkle")} PREMIUM` : locked ? `${icon("lock")} LEVEL ${a.unlock}` : isBiz ? (owned ? `LEVEL ${owned}` : "NOT OPENED") : (owned ? "OWNED" : "FOR SALE"); tag.classList.toggle("tag-lock", locked); tag.classList.toggle("tag-premium", !!product);
    c.querySelector("[data-income]").textContent = owned ? `+${fmt(E.assetIncomeOf(a, s) * owned)}/sec` : `+${fmt(E.assetIncomeOf(a, s))}/sec`;
    c.querySelector("[data-value]").textContent = `Value ${fmt(E.assetValueOf(a, s))}`;
    const b = c.querySelector("[data-buy]");
    if (product) { b.textContent = owned ? "YOURS FOREVER" : `GET IT · ${monetize.priceLabel(product)}`; b.disabled = owned > 0; b.classList.toggle("btn-gold", !owned); b.classList.toggle("btn-ghost", owned > 0); }
    else {
      b.textContent = locked ? `UNLOCKS AT LEVEL ${a.unlock}` : isBiz ? (owned ? `LEVEL UP · ${fmt(price)}` : `OPEN · ${fmt(price)}`) : (owned ? `BUY ANOTHER · ${fmt(price)}` : `BUY · ${fmt(price)}`);
      b.disabled = !can; b.classList.toggle("btn-gold", can); b.classList.toggle("btn-ghost", !can);
    }
    const m = c.querySelector("[data-mod]");
    if (m) { const lvl = E.modLevel(a.id, s), cost = E.assetModCost(a, s), maxed = lvl >= MOD_MAX; m.hidden = !owned; m.innerHTML = `${icon("wrench")} Renovate ${lvl}/${MOD_MAX} ${maxed ? "· MAX" : "· " + fmt(cost)}`; m.disabled = maxed || s.cash < cost; }
  }
  return {
    id: cfg.id, label: cfg.label, iconName: cfg.iconName,
    build(section) {
      section.innerHTML = `
        <div class="strip-box"><div class="strip-scroll"><div class="strip" id="${cfg.id}Strip"></div></div><div class="art-chip" id="${cfg.id}Chip">${icon(cfg.iconName)}<span></span></div></div>
        <div class="scene-body">
          <div class="section-head"><div><span class="eyebrow">${esc(cfg.ownedEyebrow)}</span><h3 id="${cfg.id}OwnedTitle"></h3></div><span class="chip chip-good" id="${cfg.id}Income">+$0/sec</span></div>
          <div class="cards" id="${cfg.id}Owned"></div>
          <div class="section-head"><div><span class="eyebrow">${esc(cfg.availEyebrow)}</span><h3>${esc(cfg.availTitle)}</h3></div></div>
          <div class="cards" id="${cfg.id}Avail"></div>
          <p class="fine">${esc(cfg.footnote)}</p>
        </div>`;
      refs = { strip: $(`#${cfg.id}Strip`), chip: $(`#${cfg.id}Chip span`), ownedTitle: $(`#${cfg.id}OwnedTitle`), income: $(`#${cfg.id}Income`), owned: $(`#${cfg.id}Owned`), avail: $(`#${cfg.id}Avail`) };
      items.forEach(a => { cards[a.id] = card(a, E.getState()); });
    },
    update(s) {
      const ownedItems = items.filter(a => s.assets[a.id] > 0);
      const sig = ownedItems.map(a => a.id + ":" + s.assets[a.id]).join(",");
      if (sig !== stripSig) {
        stripSig = sig;
        refs.strip.innerHTML = collectionStrip(ownedItems.map(a => ({ asset: a, count: s.assets[a.id] })), cfg.kind);
        const w = +refs.strip.firstElementChild.getAttribute("data-w");
        refs.strip.style.width = `max(100%, ${Math.round(w * 170 / 180)}px)`;
        const n = ownedItems.reduce((t, a) => t + s.assets[a.id], 0);
        refs.chip.textContent = ownedItems.length ? `${cfg.stripLabel} · ${n} ${isBiz ? (n === 1 ? "business" : "businesses") : (n === 1 ? "property" : "properties")}` : cfg.emptyLabel;
      }
      const lsig = items.map(a => (s.assets[a.id] > 0 ? 1 : 0)).join("");
      if (lsig !== listSig) {
        listSig = lsig;
        refs.owned.innerHTML = ""; refs.avail.innerHTML = "";
        items.forEach(a => (s.assets[a.id] > 0 ? refs.owned : refs.avail).appendChild(cards[a.id]));
        if (!ownedItems.length) refs.owned.innerHTML = `<div class="empty-note">${icon("info")} ${esc(cfg.emptyNote)}</div>`;
      }
      items.forEach(a => refreshCard(a, s));
      const inc = ownedItems.reduce((t, a) => t + E.assetIncomeOf(a, s) * s.assets[a.id], 0);
      refs.income.textContent = `+${fmt(inc)}/sec`;
      refs.ownedTitle.textContent = ownedItems.length ? `${ownedItems.length} ${isBiz ? (ownedItems.length === 1 ? "business" : "businesses") : (ownedItems.length === 1 ? "property type" : "property types")} owned` : "Nothing owned yet";
    }
  };
}

export const propertiesScene = makeCollectionScene({
  id: "properties", label: "Homes", iconName: "homes", kind: "property",
  ownedEyebrow: "YOUR PORTFOLIO", availEyebrow: "ON THE MARKET", availTitle: "Properties for sale", stripLabel: "Your neighborhood", emptyLabel: "Your neighborhood is empty",
  emptyNote: "Buy your first property below. Owned homes appear on your street and pay rent every second.",
  footnote: "Each extra copy of a property costs 30% more. Renovations raise income by 20% and value by 10% per level."
});
export const businessScene = makeCollectionScene({
  id: "business", label: "Business", iconName: "business", kind: "business",
  ownedEyebrow: "YOUR EMPIRE", availEyebrow: "OPPORTUNITIES", availTitle: "Businesses to open", stripLabel: "Business district", emptyLabel: "No businesses yet",
  emptyNote: "Open your first business below. Each level adds more earnings per second; every level costs 45% more.",
  footnote: "Business profits feed the same cash balance you trade with — reinvest to grow faster."
});

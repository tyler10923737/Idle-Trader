// Game content. The economy numbers for the original items are preserved from the
// starter project; new vehicles, properties, businesses and outfits extend the roster.
import { fmt } from "./format.js";

// ---------- Run upgrades (unchanged formulas) ----------
// Trade time per Deal Optimization level (seconds). The last level is instant: trades complete as fast as you can tap.
export const TRADE_TIMES = [8, 6, 4.5, 3.5, 2.5, 1.8, 1.2, 0.6, 0];
export const tradeTimeLabel = t => (t > 0 ? `${t} sec` : "INSTANT");
// The fastest Deal Optimization levels need a player level (upgrade level → player level), so tapping speed arrives gradually.
export const SPEED_TIERS = { 5: 6, 6: 10, 7: 14, 8: 18 };
export const BASE_PROFIT = 0.3;        // profit fraction of the stake before upgrades (+30%)
export const BASE_MULTIPLIER = 1.5;    // trade profit multiplier every run starts with
export const SETUP_STEP = 0.04;        // Professional Setup: +4% profit per level
export const RESEARCH_STEP = 0.05;     // Market Research: +5% profit per level
export const MULT_STEP = 0.08;         // Profit Multiplier: +0.08x per level
export const CAP_GROWTH = 1.1;         // each Trade Capacity level adds 10 × 1.1^level to the stake
export const ASSET_BONUS_CAP = 1.5;    // asset trade bonus (counted once per asset type) caps at +150%
export const automationIncome = lvl => 5 * (Math.pow(1.35, lvl) - 1) / 0.35; // $/sec, flat
export const slotsIncome = lvl => 3 * (Math.pow(1.3, lvl) - 1) / 0.3;        // $/sec, flat

export const UPGRADES = [
  // Many small steps rather than a few big ones: no single purchase is make-or-break.
  { id: "duration", name: "Deal Optimization", icon: "clock", unlock: 1, max: 8, tiers: SPEED_TIERS, desc: "Improve your setup to complete deals faster. At the top level deals are instant — as fast as you can tap.", visual: "More monitors",
    effect: s => `Trade time ${tradeTimeLabel(TRADE_TIMES[Math.min(8, s.upgrades.duration)])}${s.upgrades.duration < 8 ? ` → ${tradeTimeLabel(TRADE_TIMES[s.upgrades.duration + 1])}` : ""}`,
    cost: s => Math.floor(15 * Math.pow(1.9, s.upgrades.duration)),
    buy: s => (s.upgrades.duration = Math.min(8, s.upgrades.duration + 1)) },
  { id: "setup", name: "Professional Setup", icon: "laptop", unlock: 1, max: 20, desc: "Better tools and systems improve the profit on every completed trade.", visual: "Better chair + gear",
    effect: s => `+${Math.round(s.upgrades.setup * SETUP_STEP * 100)}% trade profit`,
    cost: s => Math.floor(20 * Math.pow(1.6, s.upgrades.setup)),
    buy: s => s.upgrades.setup++ },
  { id: "capacity", name: "Trade Capacity", icon: "cash", unlock: 2, max: 20, desc: "Put more capital into each deal. Bigger trades mean bigger returns.", visual: "Bigger desk",
    effect: s => `Deal amount ${fmt(s.baseAmount)} → ${fmt(s.baseAmount + 10 * Math.pow(CAP_GROWTH, s.upgrades.capacity))}`,
    cost: s => Math.floor(40 * Math.pow(1.5, s.upgrades.capacity)),
    buy: s => { s.upgrades.capacity++; s.baseAmount += 10 * Math.pow(CAP_GROWTH, s.upgrades.capacity - 1); } },
  { id: "multiplier", name: "Profit Multiplier", icon: "star", unlock: 4, max: 20, desc: "Increase your base trade payout multiplier.", visual: "Office décor",
    effect: s => `x${(BASE_MULTIPLIER + s.upgrades.multiplier * MULT_STEP).toFixed(2)} trade profit`,
    cost: s => Math.floor(150 * Math.pow(1.8, s.upgrades.multiplier)),
    buy: s => s.upgrades.multiplier++ },
  { id: "offline", name: "Offline Network", icon: "wifi", unlock: 5, max: 5, desc: "Keep your network earning when you close the game. Each level boosts offline payout.", visual: "Network hub",
    effect: s => `${Math.min(100, 25 + s.upgrades.offline * 15)}% offline earnings`,
    cost: s => Math.floor(4000 * Math.pow(2.5, s.upgrades.offline)),
    buy: s => s.upgrades.offline++ },
  { id: "slots", name: "Parallel Deals", icon: "grid", unlock: 6, max: 15, desc: "Your operation works several small deals in the background. Adds passive income.", visual: "Wall ticker board",
    effect: s => `+${fmt(slotsIncome(s.upgrades.slots + 1) - slotsIncome(s.upgrades.slots))}/sec next level`,
    cost: s => Math.floor(500 * Math.pow(2.0, s.upgrades.slots)),
    buy: s => s.upgrades.slots++ },
  { id: "automation", name: "Trade Automation", icon: "robot", unlock: 8, max: 15, desc: "Automated systems trade for you around the clock. Adds passive income.", visual: "Server rack + bot",
    effect: s => `+${fmt(automationIncome(s.upgrades.automation + 1) - automationIncome(s.upgrades.automation))}/sec next level`,
    cost: s => Math.floor(2500 * Math.pow(2.3, s.upgrades.automation)),
    buy: s => s.upgrades.automation++ },
  { id: "research", name: "Market Research", icon: "search", unlock: 10, max: 15, desc: "Learn which deals are worth pursuing. Improves total trade returns.", visual: "Bookshelf + whiteboard",
    effect: s => `+${Math.round(s.upgrades.research * RESEARCH_STEP * 100)}% trade profit`,
    cost: s => Math.floor(2500 * Math.pow(1.9, s.upgrades.research)),
    buy: s => s.upgrades.research++ }
];

// ---------- Assets ----------
// kind: car | property | business.  Original ids (usedcar, studio, sports, house, penthouse,
// supercar, warehouse, mansion, tower) keep their original price / income / value / bonus so
// existing saves keep the same economy.
export const ASSETS = [
  // Vehicles — payback grows with the tier (4 min for the first car, ~2 days for the last)
  { id: "usedcar", kind: "car", unlock: 1, name: "Reliable Used Car", body: "hatch", color: "#6fb3ff", price: 500, income: 2.083, value: 500, bonus: 0.02, desc: "Your first set of wheels. A modest asset with a little recurring income." },
  { id: "van", kind: "car", unlock: 2, name: "Delivery Van", body: "van", color: "#f4f6fb", price: 1200, income: 2.5, value: 1200, bonus: 0.02, desc: "Deliveries all day, every day. Boring, dependable money." },
  { id: "hothatch", kind: "car", unlock: 3, name: "Hot Hatch", body: "hatch", color: "#ff8a3c", price: 3000, income: 3.333, value: 3000, bonus: 0.03, desc: "Small, quick and surprisingly profitable at the weekend meet." },
  { id: "pickup", kind: "car", unlock: 4, name: "Work Pickup", body: "pickup", color: "#f08a3c", price: 6000, income: 2.5, value: 6000, bonus: 0.03, desc: "Hauls parts, flips furniture, pays for itself." },
  { id: "sedan", kind: "car", unlock: 5, name: "Executive Sedan", body: "sedan", color: "#2f3b52", price: 12000, income: 3.333, value: 12000, bonus: 0.04, desc: "Quiet, comfortable and very presentable at client meetings." },
  { id: "sports", kind: "car", unlock: 6, name: "Performance Coupe", body: "coupe", color: "#ff3b5c", price: 25000, income: 1.984, value: 25000, bonus: 0.05, desc: "A serious upgrade to your garage and your cash flow." },
  { id: "offroad", kind: "car", unlock: 7, name: "Off-Road Truck", body: "offroad", color: "#2ecc71", price: 50000, income: 2.778, value: 50000, bonus: 0.05, desc: "Lifted, lit and booked solid for weekend tours." },
  { id: "muscle", kind: "car", unlock: 8, name: "Street Muscle", body: "muscle", color: "#ffd23f", price: 100000, income: 3.968, value: 100000, bonus: 0.06, desc: "Loud, fast and impossible to ignore. Great for showing off." },
  { id: "esedan", kind: "car", unlock: 9, name: "Electric Sedan", body: "sedan", color: "#4fd3ff", price: 200000, income: 5.556, value: 200000, bonus: 0.06, desc: "Silent, slick and cheap to run. Tenants love the charging perk." },
  { id: "suv", kind: "car", unlock: 10, name: "Luxury SUV", body: "suv", color: "#f4f6fb", price: 400000, income: 8.547, value: 400000, bonus: 0.07, desc: "Room for the whole crew and the deals that come with them." },
  { id: "roadster", kind: "car", unlock: 11, name: "Classic Roadster", body: "roadster", color: "#c0392b", price: 800000, income: 13.89, value: 800000, bonus: 0.08, desc: "A collector's open-top icon that appreciates in style." },
  { id: "luxcoupe", kind: "car", unlock: 12, name: "Grand Coupe", body: "coupe", color: "#1b1e27", price: 1600000, income: 24.69, value: 1600000, bonus: 0.09, desc: "Hand-stitched leather and a waiting list of renters." },
  { id: "sterling", kind: "car", unlock: 13, name: "Sterling GT", body: "sterling", color: "#c9ced6", price: 2800000, income: 37.037, value: 2800000, bonus: 0.09, desc: "A long-hood grand tourer in brushed silver — German-style muscle with a tailored suit on." },
  { id: "supercar", kind: "car", unlock: 13, name: "Supercar", body: "supercar", color: "#00d2ff", price: 4000000, income: 52.91, value: 4000000, bonus: 0.1, desc: "A collection piece worthy of a high-net-worth trader." },
  { id: "limo", kind: "car", unlock: 14, name: "Stretch Limo", body: "limo", color: "#23262f", price: 9000000, income: 104.2, value: 9000000, bonus: 0.11, desc: "Airport runs for VIPs. Every ride is a deal in progress." },
  { id: "trackcar", kind: "car", unlock: 15, name: "Track Car", body: "supercar", color: "#ff8a3c", price: 18000000, income: 185.2, value: 18000000, bonus: 0.12, desc: "Lap records on Sunday, sponsorship checks on Monday." },
  { id: "rossa", kind: "car", unlock: 16, name: "Rossa Corsa", body: "rossa", color: "#d8141c", price: 28000000, income: 259.259, value: 28000000, bonus: 0.13, desc: "Mid-engine, racing red, quad tail lights and a glass engine cover. An Italian-style icon." },
  { id: "hypercar", kind: "car", unlock: 17, name: "Hypercar", body: "hypercar", color: "#9b5cff", price: 40000000, income: 336.7, value: 40000000, bonus: 0.14, desc: "Carbon fiber, hybrid power and a thousand horsepower." },
  { id: "wedge", kind: "car", unlock: 18, name: "Tempesta Wedge", body: "wedge", color: "#c9f31d", price: 60000000, income: 462.963, value: 60000000, bonus: 0.15, desc: "A razor-sharp lime wedge with a black roof, angular intakes and a big wing. Pure Italian drama." },
  { id: "goldgt", kind: "car", unlock: 19, name: "Gold Grand Tourer", body: "gt", color: "#ffc43d", price: 90000000, income: 625, value: 90000000, bonus: 0.16, desc: "The ultimate statement. Everyone knows who just pulled up." },
  { id: "papaya", kind: "car", unlock: 20, name: "Papaya Hyper", body: "papaya", color: "#ff8a1f", price: 130000000, income: 820.707, value: 130000000, bonus: 0.17, desc: "Teardrop cabin, dihedral door line and a full-width light bar in papaya orange. British hypercar spirit." },
  { id: "vintage", kind: "car", unlock: 21, name: "Vintage Racer", body: "roadster", color: "#f4f6fb", price: 200000000, income: 1157, value: 200000000, bonus: 0.18, desc: "A pre-war racing legend. Museums call about it weekly." },
  { id: "concept", kind: "car", unlock: 22, name: "Concept Car", body: "hypercar", color: "#ff6fb5", price: 450000000, income: 2315, value: 450000000, bonus: 0.2, desc: "One of one. The design studio still asks for it back." },
  { id: "lemans", kind: "car", unlock: 23, name: "Le Mans Prototype", body: "supercar", color: "#f4f6fb", price: 900000000, income: 4167, value: 900000000, bonus: 0.22, desc: "An endurance racer with a trophy cabinet to match." },
  // Premium (real-money) items: last in each list, available from level 1, income grows with your level so they stay strong all game.
  { id: "phantom", kind: "car", unlock: 1, premium: "premium_car", name: "Phantom GT", body: "phantom", color: "#15171f", price: 0, income: 0, incomeAt: lvl => 2 * Math.pow(1.5, lvl - 1), value: 250000, bonus: 0.4, desc: "Black and gold, and faster than anything in the garage. +40% trade profit, income that grows with every level." },
  // Properties
  { id: "room", kind: "property", unlock: 1, name: "Garage Apartment", price: 800, income: 3.333, value: 800, bonus: 0.02, desc: "A rented room above the garage. Small, but it pays." },
  { id: "studio", kind: "property", unlock: 2, name: "Studio Apartment", price: 2500, income: 5.208, value: 2500, bonus: 0.03, desc: "A compact rental property that starts building passive income." },
  { id: "duplex", kind: "property", unlock: 3, name: "Suburban Duplex", price: 8000, income: 8.889, value: 8000, bonus: 0.04, desc: "Two doors, two tenants, twice the rent." },
  { id: "condo", kind: "property", unlock: 4, name: "Downtown Condo", price: 20000, income: 8.333, value: 20000, bonus: 0.04, desc: "A bright mid-rise condo with steady tenants." },
  { id: "cabin", kind: "property", unlock: 6, name: "Lakeside Cabin", price: 45000, income: 3.571, value: 45000, bonus: 0.05, desc: "Weekend rentals by the lake, booked out all summer." },
  { id: "house", kind: "property", unlock: 7, name: "Modern Family Home", price: 90000, income: 5, value: 90000, bonus: 0.06, desc: "A valuable property that generates rent every second." },
  { id: "townhouse", kind: "property", unlock: 8, name: "Townhouse Row", price: 200000, income: 7.937, value: 200000, bonus: 0.06, desc: "A whole row of townhouses on one quiet street." },
  { id: "villa", kind: "property", unlock: 9, name: "Hillside Villa", price: 450000, income: 12.5, value: 450000, bonus: 0.07, desc: "Glass walls, a pool and a view worth every dollar." },
  { id: "chalet", kind: "property", unlock: 11, name: "Ski Chalet", price: 1000000, income: 17.36, value: 1000000, bonus: 0.08, desc: "Powder days and premium winter rates." },
  { id: "penthouse", kind: "property", unlock: 12, name: "City Penthouse", price: 2500000, income: 38.58, value: 2500000, bonus: 0.09, desc: "A premium property in the heart of the city." },
  { id: "beach", kind: "property", unlock: 14, name: "Beachfront Retreat", price: 6000000, income: 69.44, value: 6000000, bonus: 0.1, desc: "Wake up to waves. Rent it out when you're busy trading." },
  { id: "vineyard", kind: "property", unlock: 16, name: "Vineyard Estate", price: 20000000, income: 185.2, value: 20000000, bonus: 0.12, desc: "Rolling hills, a tasting room and a very good year." },
  { id: "mansion", kind: "property", unlock: 18, name: "Private Estate", price: 60000000, income: 463, value: 60000000, bonus: 0.14, desc: "A statement property and a substantial passive asset." },
  { id: "golf", kind: "property", unlock: 19, name: "Golf Resort", price: 90000000, income: 625, value: 90000000, bonus: 0.15, desc: "Eighteen holes, a clubhouse and members who pay on time." },
  { id: "skytower", kind: "property", unlock: 20, name: "Sky Residence", price: 150000000, income: 947, value: 150000000, bonus: 0.16, desc: "The top three floors of the tallest tower in town." },
  { id: "castle", kind: "property", unlock: 21, name: "Hilltop Castle", price: 400000000, income: 2315, value: 400000000, bonus: 0.18, desc: "Stone walls, a moat, and weddings every weekend." },
  { id: "island", kind: "property", unlock: 23, name: "Private Island", price: 1000000000, income: 4630, value: 1000000000, bonus: 0.2, desc: "Your own coordinates on the map." },
  { id: "resort", kind: "property", unlock: 24, name: "Mountain Resort", price: 2200000000, income: 8987, value: 2200000000, bonus: 0.22, desc: "A mountain resort with lifts, lodges and a long season." },
  { id: "skyline", kind: "property", unlock: 24, name: "Skyline Tower", price: 5000000000, income: 2.042e+04, value: 5000000000, bonus: 0.24, desc: "The whole tower. Every floor pays you rent." },
  { id: "skyvilla", kind: "property", unlock: 1, premium: "premium_home", name: "Sky Villa", price: 0, income: 0, incomeAt: lvl => 3 * Math.pow(1.5, lvl - 1), value: 400000, bonus: 0.3, perk: "offline", desc: "A glass villa on a cliff with an infinity pool. +25% offline earnings, +30% trade profit, income that grows with every level." },
  // Businesses (buying again levels the business up; each level costs 60% more)
  { id: "vending", kind: "business", unlock: 1, name: "Vending Machines", price: 600, income: 2.5, value: 600, bonus: 0.02, desc: "Snacks and drinks in every lobby in town." },
  { id: "foodcart", kind: "business", unlock: 2, name: "Street Food Cart", price: 1800, income: 3.75, value: 1800, bonus: 0.02, desc: "Small, cheerful and always busy at lunch." },
  { id: "lawncare", kind: "business", unlock: 3, name: "Lawn Care Crew", price: 5000, income: 5.556, value: 5000, bonus: 0.03, desc: "Two trucks, four mowers, a full schedule." },
  { id: "carwash", kind: "business", unlock: 5, name: "Express Car Wash", price: 15000, income: 4.167, value: 15000, bonus: 0.04, desc: "Cash flow on every sunny weekend." },
  { id: "autoshop", kind: "business", unlock: 6, name: "Auto Shop", price: 40000, income: 3.175, value: 40000, bonus: 0.04, desc: "Oil changes, brake jobs and loyal customers." },
  { id: "cafe", kind: "business", unlock: 8, name: "Coffee Roastery", price: 120000, income: 4.762, value: 120000, bonus: 0.05, desc: "A neighborhood favorite with a loyal morning crowd." },
  { id: "machineshop", kind: "business", unlock: 9, name: "CNC Machine Shop", price: 350000, income: 9.722, value: 350000, bonus: 0.06, desc: "Three-axis mills, tight tolerances and aerospace contracts." },
  { id: "solar", kind: "business", unlock: 10, name: "Solar Farm", price: 1000000, income: 21.37, value: 1000000, bonus: 0.07, desc: "Acres of panels selling power back to the grid." },
  { id: "warehouse", kind: "business", unlock: 12, name: "Logistics Warehouse", price: 3000000, income: 46.3, value: 3000000, bonus: 0.08, desc: "A real operating business that expands your empire." },
  { id: "shipping", kind: "business", unlock: 14, name: "Shipping Line", price: 10000000, income: 115.7, value: 10000000, bonus: 0.1, desc: "Container ships on three routes. Freight never sleeps." },
  { id: "startup", kind: "business", unlock: 16, name: "Tech Startup", price: 40000000, income: 370.4, value: 40000000, bonus: 0.12, desc: "Software margins and a rooftop patio." },
  { id: "moviestudio", kind: "business", unlock: 18, name: "Movie Studio", price: 120000000, income: 925.9, value: 120000000, bonus: 0.14, desc: "Soundstages, a backlot and a summer blockbuster." },
  { id: "hotel", kind: "business", unlock: 20, name: "Luxury Hotel", price: 250000000, income: 1578, value: 250000000, bonus: 0.15, desc: "Five stars, full occupancy, room service margins." },
  { id: "tower", kind: "business", unlock: 20, name: "Commercial Tower", price: 350000000, income: 2210, value: 350000000, bonus: 0.16, desc: "A landmark asset that puts you in a different league." },
  { id: "stadium", kind: "business", unlock: 22, name: "Sports Stadium", price: 700000000, income: 3601, value: 700000000, bonus: 0.18, desc: "Sixty thousand seats and naming rights." },
  { id: "bank", kind: "business", unlock: 23, name: "Private Bank", price: 1500000000, income: 6944, value: 1500000000, bonus: 0.2, desc: "When you own the bank, the bank works for you." },
  { id: "airline", kind: "business", unlock: 23, name: "Airline", price: 2800000000, income: 1.296e+04, value: 2800000000, bonus: 0.22, desc: "A fleet of jets and a loyalty program." },
  { id: "space", kind: "business", unlock: 24, name: "Orbital Launch Co.", price: 4500000000, income: 1.838e+04, value: 4500000000, bonus: 0.25, desc: "Launch contracts for satellites and more." },
  { id: "satellite", kind: "business", unlock: 24, name: "Satellite Network", price: 9000000000, income: 3.676e+04, value: 9000000000, bonus: 0.28, desc: "A constellation in orbit, selling connectivity to the world." },
  { id: "mint", kind: "business", unlock: 1, premium: "premium_biz", name: "The Mint", price: 0, income: 0, incomeAt: lvl => 4 * Math.pow(1.5, lvl - 1), value: 600000, bonus: 0.3, perk: "income", desc: "Your own money printer. +20% to all passive income, +30% trade profit, income that grows with every level." }
];
export const BUSINESS_LEVEL_SCALE = 1.6; // each business level costs 60% more than the last
export const DUPLICATE_SCALE = 1.6;      // each extra copy of a car or property costs 60% more

// Per-asset improvements ("Tune" for cars, "Renovate" for properties). Max 5 levels.
export const MOD_MAX = 5;
export const MOD_INCOME_PER_LEVEL = 0.2;
export const MOD_VALUE_PER_LEVEL = 0.1;
export const modCost = (asset, level) => Math.floor((asset.price || asset.value) * 0.25 * Math.pow(1.6, level));
export const PAINT_COST_RATE = 0.05; // 5% of the car price per repaint

export const PAINTS = [
  { id: "stock", name: "Stock", color: null },
  { id: "red", name: "Racing Red", color: "#ff3b5c" },
  { id: "orange", name: "Sunset Orange", color: "#ff8a3c" },
  { id: "yellow", name: "Lemon", color: "#ffd23f" },
  { id: "green", name: "Mint", color: "#2ee6a6" },
  { id: "blue", name: "Ocean", color: "#2d8cff" },
  { id: "purple", name: "Grape", color: "#9b5cff" },
  { id: "pink", name: "Bubblegum", color: "#ff6fb5" },
  { id: "white", name: "Pearl", color: "#f6f7fb" },
  { id: "black", name: "Midnight", color: "#23262f" },
  { id: "gold", name: "24K Gold", color: "#ffc43d" }
];

// Garage: 4 spaces to start, +4 per expansion.
export const GARAGE = { baseSpaces: 4, perLevel: 4, maxLevel: 6, cost: level => Math.floor(2000 * Math.pow(7.5, level)) };

// ---------- Mentors (unchanged economy) ----------
export const MENTORS = [
  { id: "hustler", name: "The Hustler", icon: "H", rarity: "Common", unlock: 2, price: 250, desc: "Knows how to turn small opportunities into momentum.", bonus: "×1.15 trade profits", type: "trade", mult: 1.15,
    look: { skin: "#d9a066", hair: "#2b1d12", hairStyle: "cap", top: "#ff8a3c", accent: "#ffffff" } },
  { id: "investor", name: "The Investor", icon: "I", rarity: "Rare", unlock: 5, price: 5000, desc: "Sees value where everyone else sees risk.", bonus: "+35% asset income", type: "asset", mult: 1.35,
    look: { skin: "#f1c27d", hair: "#9aa5b1", hairStyle: "short", top: "#2f3b52", accent: "#ffffff", glasses: true } },
  { id: "analyst", name: "The Analyst", icon: "A", rarity: "Rare", unlock: 8, price: 25000, desc: "Reads the charts before the market does.", bonus: "×1.3 trade profits", type: "trade", mult: 1.3,
    look: { skin: "#c68642", hair: "#1b1e27", hairStyle: "bun", top: "#2ecc71", accent: "#ffffff", glasses: true } },
  { id: "closer", name: "The Closer", icon: "C", rarity: "Epic", unlock: 11, price: 150000, desc: "Gets deals done quickly and keeps the pipeline moving.", bonus: "×1.5 trade profits", type: "trade", mult: 1.5,
    look: { skin: "#8d5524", hair: "#111111", hairStyle: "slick", top: "#1f2d5c", accent: "#ff3b5c", tie: true } },
  { id: "networker", name: "The Networker", icon: "N", rarity: "Epic", unlock: 14, price: 1000000, desc: "Knows a tenant, a buyer and a manager for everything you own.", bonus: "+60% asset income", type: "asset", mult: 1.6,
    look: { skin: "#f1c27d", hair: "#c0392b", hairStyle: "long", top: "#9b5cff", accent: "#ffd23f" } },
  { id: "mogul", name: "The Mogul", icon: "M", rarity: "Legendary", unlock: 18, price: 5000000, desc: "A world-class operator who turns a business into an empire.", bonus: "×2 all income", type: "all", mult: 2,
    look: { skin: "#f1c27d", hair: "#f4f6fb", hairStyle: "short", top: "#ffc43d", accent: "#23262f", shades: true } }
];

// ---------- Legacy upgrades (unchanged) ----------
export const LEGACY = [
  { id: "legacyCash", name: "Head Start", icon: "cash", desc: "Start future runs with a cash bonus.", cost: 1, apply: s => s.legacy.legacyCash++, effect: s => `Start runs with ${fmt(HEAD_START_CASH * s.legacy.legacyCash)}` },
  { id: "legacyProfit", name: "Golden Touch", icon: "star", desc: "Permanent bonus to all income.", cost: 2, apply: s => s.legacy.legacyProfit++, effect: s => `+${s.legacy.legacyProfit * 10}% all income` },
  { id: "legacyOffline", name: "Always On", icon: "wifi", desc: "Earn a larger share of income while offline.", cost: 2, apply: s => s.legacy.legacyOffline++, effect: s => `+${s.legacy.legacyOffline * 10}% offline payout` }
];

// ---------- Outfits (cosmetic, kept across prestige) ----------
export const OUTFITS = [
  { id: "hoodie", name: "Starter Hoodie", unlock: 1, price: 0, top: "#6c7a89", accent: "#4b5663", pants: "#2f3b52", style: "hoodie" },
  { id: "casual", name: "Business Casual", unlock: 3, price: 5000, top: "#2d8cff", accent: "#ffffff", pants: "#1f2d5c", style: "shirt" },
  { id: "suit", name: "Tailored Suit", unlock: 7, price: 100000, top: "#1f2d5c", accent: "#ff3b5c", pants: "#1f2d5c", style: "suit" },
  { id: "racing", name: "Racing Jacket", unlock: 10, price: 800000, top: "#ff3b5c", accent: "#ffffff", pants: "#23262f", style: "shirt" },
  { id: "gold", name: "Gold Blazer", unlock: 13, price: 5000000, top: "#ffc43d", accent: "#23262f", pants: "#23262f", style: "suit" },
  { id: "tux", name: "Midnight Tuxedo", unlock: 16, price: 30000000, top: "#111422", accent: "#ffffff", pants: "#111422", style: "suit" },
  { id: "legend", name: "Legend Jacket", unlock: 20, price: 200000000, top: "#9b5cff", accent: "#ffd23f", pants: "#2c2c54", style: "suit", requiresPrestige: 1 },
  { id: "orbital", name: "Orbital Suit", unlock: 24, price: 2000000000, top: "#f4f6fb", accent: "#4fd3ff", pants: "#f4f6fb", style: "shirt" }
];

// Fictional companies you trade; each deal uses the next one. Tickers are made up.
export const DEALS = [
  { sym: "ZPHR", name: "Zephyr Dynamics" }, { sym: "QBYT", name: "Qubyte Labs" }, { sym: "LUMX", name: "Lumex Solar" }, { sym: "ORBX", name: "Orbex Freight" },
  { sym: "HLXG", name: "Helixgen Bio" }, { sym: "VLTQ", name: "Voltiq Grid" }, { sym: "PXLF", name: "Pixelforge Games" }, { sym: "AERN", name: "Aeronimbus Air" },
  { sym: "FRSL", name: "Frostline Foods" }, { sym: "TTNM", name: "Titanium Metals" }, { sym: "BLMW", name: "Bloomwell Farms" }, { sym: "NXCL", name: "Nexcloud Systems" },
  { sym: "DRFW", name: "Driftwood Yachts" }, { sym: "MRDN", name: "Meridian Shipping" }, { sym: "SLRX", name: "Solarix Energy" }, { sym: "CRBN", name: "Carbonite Motors" }
];
export const START_CASH = 0;          // every run starts broke: the first tap is a starter task worth $10
export const HEAD_START_CASH = 100;   // Head Start legacy upgrade: $100 of starting cash per level

// ---------- Real-money store (in-app purchases) and ads ----------
// Prices are what the stores display; the charge itself happens in the native billing layer (js/monetize.js + README).
export const PRODUCTS = [
  { id: "premium_car", kind: "item", item: "phantom", name: "Phantom GT", priceUSD: 2.99, desc: "A black-and-gold supercar with +40% trade profit and passive income that grows with your level. Yours from level 1, forever." },
  { id: "premium_home", kind: "item", item: "skyvilla", name: "Sky Villa", priceUSD: 2.99, desc: "A cliff-top glass villa: +25% offline earnings, +30% trade profit and level-scaling income." },
  { id: "premium_biz", kind: "item", item: "mint", name: "The Mint", priceUSD: 2.99, desc: "Prints money: +20% to all passive income, +30% trade profit and level-scaling income." },
  { id: "noads", kind: "noads", name: "Remove ads", priceUSD: 2.99, desc: "No more ads between sessions. Rewarded ads (your choice) stay available." },
  { id: "cash_s", kind: "cash", name: "Cash stack", priceUSD: 1.99, hours: 2, min: 2000, desc: "2 hours of your current income, right now." },
  { id: "cash_m", kind: "cash", name: "Cash vault", priceUSD: 4.99, hours: 8, min: 10000, desc: "8 hours of your current income, right now." },
  { id: "cash_l", kind: "cash", name: "Cash empire", priceUSD: 9.99, hours: 24, min: 50000, desc: "A full day of your current income, right now." }
];
export const ADS = {
  banner: true,                              // banner strip at the bottom (off for Remove-ads owners)
  interstitialEverySec: 180,                 // a forced ad every 3 minutes of play, shown at the next quiet moment…
  interstitialMinLevel: 3,                   // …but not for brand-new players (level 3 takes about 10 minutes)
  interstitialAfterAwayMs: 5 * 60 * 1000,    // coming back after 5+ minutes also counts as "due"
  testAdSeconds: 5,                          // length of the placeholder ads in test mode
  // rewarded ads: offered often, each a modest-but-real help
  boost: { mult: 2, minutes: 5, maxMinutes: 15 },             // 2x all earnings for 5 min; watch again to extend up to 15
  cash: { minutesOfIncome: 3, min: 25, cooldownMs: 10 * 60 * 1000 }, // free cash = 3 minutes of income (min $25), every 10 minutes
  offline: { mult: 2 }                                          // double the welcome-back payout
};

// Store listing links (fill in after the apps are published; used by "Rate" and "Share").
export const STORE = { appStoreUrl: "", playStoreUrl: "", privacyUrl: "privacy.html", supportEmail: "" };
// Daily bonus: once per calendar day from the second day on; grows with the streak (day 7 = 2.5x), resets after a missed day.
export const DAILY = { minutesOfIncome: 5, min: 50, stepPerDay: 0.25, maxDays: 7 };

// UI color themes (a device preference, not part of the save). Swatch colors preview the background gradient.
export const THEMES = [
  { id: "ocean", name: "Ocean", c: ["#3ad4ff", "#4a7dff", "#6b35e0"] },
  { id: "sunset", name: "Sunset", c: ["#ffb36b", "#ff5e8a", "#5b1a8c"] },
  { id: "forest", name: "Forest", c: ["#9fe8b0", "#2fae6a", "#0f5a3c"] },
  { id: "midnight", name: "Midnight", c: ["#243055", "#161e3c", "#0a0f22"] },
  { id: "candy", name: "Candy", c: ["#ffd6f3", "#ff7bd4", "#7b3fe4"] }
];

// ---------- Player level ----------
// XP comes from completed trades, purchases and collected offline earnings. Levels unlock content.
export const LEVELS = {
  max: 40,
  xpToNext: lvl => Math.round(100 * Math.pow(1.3, lvl - 1)),
  // scaled by trade time so XP per minute of trading stays about the same at every speed (instant trades still give 15%)
  xpForTrade: (profit, tradeTime = 2.5) => 0.3 * (2 + 3 * Math.log10(Math.max(0, profit) + 1)) * Math.max(0.15, Math.min(1, tradeTime / 2.5)),
  xpForPurchase: cost => 0.25 * 20 * Math.log10(Math.max(0, cost) + 10),
  // passive income levels you up too (XP per second for a given $/sec income; half rate while away)
  xpPerSecond: income => (income > 0 ? 0.15 * Math.sqrt(income) / 60 : 0),
  // cash reward for reaching a level (about a quarter of the cheapest thing that unlocks there); slower growth past the last unlock
  bonus: lvl => Math.round(125 * Math.pow(1.9, Math.min(lvl, 24) - 1) * Math.pow(1.25, Math.max(0, lvl - 24))),
  // one-time estimate for saves made before levels existed
  estimate: lifetimeEarned => Math.max(1, Math.min(30, 1 + Math.floor(2.2 * Math.log10(Math.max(0, lifetimeEarned) + 1))))
};

export const RANKS = [
  { min: 0, name: "Aspiring Trader" }, { min: 1e3, name: "Established Trader" }, { min: 1e5, name: "Investor" },
  { min: 1e6, name: "Business Mogul" }, { min: 1e7, name: "Tycoon" }, { min: 1e9, name: "Market Legend" }
];

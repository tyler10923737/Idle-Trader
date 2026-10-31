// Number formatting helpers (shared by data + UI). Preserved from the original app.js.
export const fmt = n => {
  if (!Number.isFinite(n)) return "$0";
  if (Math.abs(n) < 1000) return "$" + Math.floor(n).toLocaleString("en-US");
  const units = [["T", 1e12], ["B", 1e9], ["M", 1e6], ["K", 1e3]];
  for (const [s, v] of units) if (Math.abs(n) >= v) return "$" + (n / v).toFixed(n / v >= 100 ? 0 : n / v >= 10 ? 1 : 2) + s;
  return "$" + Math.floor(n).toLocaleString("en-US");
};
export const numberFmt = n => Math.floor(n).toLocaleString("en-US");
export const safeNum = x => (Number.isFinite(Number(x)) ? Number(x) : 0);
export const pct = x => Math.round(x * 100) + "%";
export const timeFmt = secs => {
  secs = Math.max(0, Math.floor(secs));
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
};

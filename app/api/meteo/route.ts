// file: app/api/meteo/route.js
import { NextResponse } from "next/server";

// --- utilidades de limpieza ---
const isMissing = (v) => v == null || Number.isNaN(v) || v <= -900;
const clamp = (v, min, max) => (v == null ? null : (v < min || v > max ? null : v));
const toISODateUTC = (d) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
};

// NASA: m/s → km/h
const msToKmh = (ms) => (typeof ms === "number" ? ms * 3.6 : null);

const pickLatestPowerValue = (rec) => {
  if (!rec) return null;
  const keys = Object.keys(rec).sort();
  if (!keys.length) return null;
  const last = keys[keys.length - 1];
  const v = Number(rec[last]);
  return Number.isFinite(v) ? v : null;
};

const nearNowIndex = (times = []) => {
  const now = Date.now();
  let best = 0, bestDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - now);
    if (diff < bestDiff) { best = i; bestDiff = diff; }
  });
  return best;
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const hours = Number(searchParams.get("hours") || 48);
  const tz = searchParams.get("tz") || "auto";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ ok: false, error: "lat y lon son obligatorios" }, { status: 400 });
  }

  // === 1) NASA POWER (hourly) ===
  const now = new Date();
  const start = toISODateUTC(new Date(now.getTime() - 24 * 3600 * 1000));
  const end = toISODateUTC(now);
  const powerUrl =
    `https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=` +
    ["PS","ALLSKY_SFC_UV_INDEX","PRECTOTCORR","WS10M","WD10M"].join(",") +
    `&community=RE&longitude=${lon}&latitude=${lat}&start=${start}&end=${end}&format=JSON&time-standard=UTC`;

  let powerRaw = { ps: null, uv: null, prectot: null, ws10m: null, wd10m: null };
  let power = { ps_hpa: null, uv: null, prectot_mmph: null, ws_kmh: null, wd_deg: null };
  let powerErr = null, powerUnits = null;

  try {
    const r = await fetch(powerUrl, { next: { revalidate: 1800 } });
    if (!r.ok) throw new Error(`POWER ${r.status}`);
    const j = await r.json();
    const p = j?.properties?.parameter ?? null;
    powerUnits = j?.properties?.parameter_units ?? null;

    // crudos
    powerRaw.ps = pickLatestPowerValue(p?.PS);
    powerRaw.uv = pickLatestPowerValue(p?.ALLSKY_SFC_UV_INDEX);
    powerRaw.prectot = pickLatestPowerValue(p?.PRECTOTCORR);
    powerRaw.ws10m = pickLatestPowerValue(p?.WS10M);
    powerRaw.wd10m = pickLatestPowerValue(p?.WD10M);

    // limpieza y conversiones
    // PS → hPa: si unidad kPa o valor <200 asumimos kPa; si no, ya es hPa
    let ps = isMissing(powerRaw.ps) ? null : Number(powerRaw.ps);
    if (ps != null) {
      const unit = String(powerUnits?.PS || "").toLowerCase();
      const inKPa = unit === "kpa" || ps < 200; // heurística segura
      ps = inKPa ? ps * 10 : ps;
      ps = clamp(ps, 800, 1100); // rango típico superficie
    }
    power.ps_hpa = ps;

    let uv = isMissing(powerRaw.uv) ? null : clamp(Number(powerRaw.uv), 0, 20);
    power.uv = uv;

    let pre = isMissing(powerRaw.prectot) ? null : Number(powerRaw.prectot);
    pre = pre != null && pre < 0 ? 0 : pre; // no negativos
    power.prectot_mmph = pre;

    let ws = isMissing(powerRaw.ws10m) ? null : msToKmh(Number(powerRaw.ws10m));
    ws = ws != null && ws < 0 ? null : ws;
    power.ws_kmh = ws;

    let wd = isMissing(powerRaw.wd10m) ? null : clamp(Number(powerRaw.wd10m), 0, 360);
    power.wd_deg = wd;
  } catch (e) {
    powerErr = String(e?.message || e);
    console.error("POWER error:", powerErr);
  }

  // === 2) Open-Meteo Weather (forecast) ===
    let wx = null, wxErr = null, wxRaw: any = {};
    try {
      const u = new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude", String(lat));
    u.searchParams.set("longitude", String(lon));
    u.searchParams.set("hourly", [
      "wind_speed_10m","wind_direction_10m","wind_gusts_10m",
      "precipitation","precipitation_probability","rain","showers","snowfall",
      "freezing_level_height","uv_index","surface_pressure"
    ].join(","));
    u.searchParams.set("forecast_hours", String(hours));
    u.searchParams.set("timezone", tz);

    const r = await fetch(u, { next: { revalidate: 900 } });
    if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
    const j = await r.json();
    const H = j?.hourly;
    const idx = H?.time ? nearNowIndex(H.time) : 0;

    // crudos
    wxRaw = {
      wind_speed_10m: H?.wind_speed_10m?.[idx] ?? null,         // km/h
      wind_direction_10m: H?.wind_direction_10m?.[idx] ?? null, // deg
      wind_gusts_10m: H?.wind_gusts_10m?.[idx] ?? null,         // km/h
      precipitation: H?.precipitation?.[idx] ?? null,           // mm
      precipitation_probability: H?.precipitation_probability?.[idx] ?? null, // %
      rain: H?.rain?.[idx] ?? null,                              // mm
      showers: H?.showers?.[idx] ?? null,                        // mm
      snowfall: H?.snowfall?.[idx] ?? null,                      // cm
      freezing_level_height: H?.freezing_level_height?.[idx] ?? null, // m
      uv_index: H?.uv_index?.[idx] ?? null,                      // index
      surface_pressure: H?.surface_pressure?.[idx] ?? null       // hPa
    };

    // limpieza (OM YA está en km/h / hPa / mm)
    wx = {
      time: H?.time?.[idx] ?? null,
      wind_speed_kmh: clamp(Number(wxRaw.wind_speed_10m), 0, 300),
      wind_dir_deg: clamp(Number(wxRaw.wind_direction_10m), 0, 360),
      wind_gust_kmh: clamp(Number(wxRaw.wind_gusts_10m), 0, 350),
      precipitation_mm: Math.max(0, Number(wxRaw.precipitation ?? 0)),
      precipitation_probability_pct: clamp(Number(wxRaw.precipitation_probability), 0, 100),
      rain_mm: Math.max(0, Number(wxRaw.rain ?? 0)),
      showers_mm: Math.max(0, Number(wxRaw.showers ?? 0)),
      snowfall_cm: Math.max(0, Number(wxRaw.snowfall ?? 0)),
      freezing_level_m: clamp(Number(wxRaw.freezing_level_height), 0, 8000),
      uv_index_openmeteo: clamp(Number(wxRaw.uv_index), 0, 20),
      surface_pressure_hpa: clamp(Number(wxRaw.surface_pressure), 800, 1100)
    };
  } catch (e) {
    wxErr = String(e?.message || e);
    console.error("Open-Meteo weather error:", wxErr);
  }

  // === 3) Open-Meteo Air Quality ===
  let air = null, aqErr = null;
  try {
    const u = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    u.searchParams.set("latitude", String(lat));
    u.searchParams.set("longitude", String(lon));
    u.searchParams.set("hourly", [
      "pm2_5","pm10","ozone","nitrogen_dioxide","sulphur_dioxide","carbon_monoxide",
      "uv_index","uv_index_clear_sky","dust"
    ].join(","));
    u.searchParams.set("timezone", tz);

    const r = await fetch(u, { next: { revalidate: 900 } });
    if (!r.ok) throw new Error(`Open-Meteo AQ ${r.status}`);
    const j = await r.json();
    const H = j?.hourly;
    const idx = H?.time ? nearNowIndex(H.time) : 0;

    air = H ? {
      time: H.time[idx],
      pm25: clamp(Number(H.pm2_5?.[idx]), 0, 1000),
      pm10: clamp(Number(H.pm10?.[idx]), 0, 1000),
      o3: clamp(Number(H.ozone?.[idx]), 0, 1000),
      no2: clamp(Number(H.nitrogen_dioxide?.[idx]), 0, 1000),
      so2: clamp(Number(H.sulphur_dioxide?.[idx]), 0, 1000),
      co: clamp(Number(H.carbon_monoxide?.[idx]), 0, 50000),
      uv_index_openmeteo: clamp(Number(H.uv_index?.[idx]), 0, 20),
      uv_index_clear_sky: clamp(Number(H.uv_index_clear_sky?.[idx]), 0, 20),
      dust: clamp(Number(H.dust?.[idx]), 0, 10000),
    } : null;
  } catch (e) {
    aqErr = String(e?.message || e);
    console.error("Open-Meteo air error:", aqErr);
  }

  // === 4) Open-Meteo Pollen ===
  let pollen = null, polErr = null;
  try {
    const u = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    u.searchParams.set("latitude", String(lat));
    u.searchParams.set("longitude", String(lon));
    u.searchParams.set("hourly", [
      "grass_pollen","birch_pollen","ragweed_pollen","alder_pollen","olive_pollen","mugwort_pollen"
    ].join(","));
    u.searchParams.set("timezone", tz);

    const r = await fetch(u, { next: { revalidate: 900 } });
    if (!r.ok) throw new Error(`Open-Meteo Pollen ${r.status}`);
    const j = await r.json();
    const H = j?.hourly;
    const idx = H?.time ? nearNowIndex(H.time) : 0;

    pollen = H ? {
      time: H.time[idx],
      grass: clamp(Number(H.grass_pollen?.[idx]), 0, 5),
      birch: clamp(Number(H.birch_pollen?.[idx]), 0, 5),
      ragweed: clamp(Number(H.ragweed_pollen?.[idx]), 0, 5),
      alder: clamp(Number(H.alder_pollen?.[idx]), 0, 5),
      olive: clamp(Number(H.olive_pollen?.[idx]), 0, 5),
      mugwort: clamp(Number(H.mugwort_pollen?.[idx]), 0, 5),
    } : null;
  } catch (e) {
    polErr = String(e?.message || e);
    console.error("Open-Meteo pollen error:", polErr);
  }

  // === Selección con fallbacks ===
  const final = {
    pressure_hpa: power.ps_hpa ?? wx?.surface_pressure_hpa ?? null,
    uv_index: power.uv ?? air?.uv_index_openmeteo ?? wx?.uv_index_openmeteo ?? null,
    precipitation_mm_per_hr: power.prectot_mmph ?? wx?.precipitation_mm ?? null,
    wind: {
      speed_kmh: power.ws_kmh ?? wx?.wind_speed_kmh ?? null,
      direction_deg: power.wd_deg ?? wx?.wind_dir_deg ?? null,
      gust_kmh: wx?.wind_gust_kmh ?? null,
    },
    forecast: {
      precipitation_probability_pct: wx?.precipitation_probability_pct ?? null,
      rain_mm: wx?.rain_mm ?? null,
      showers_mm: wx?.showers_mm ?? null,
      snowfall_cm: wx?.snowfall_cm ?? null,
      freezing_level_m: wx?.freezing_level_m ?? null,
    },
  };

  return NextResponse.json({
    ok: true,
    coords: { lat, lon },
    ...final,
    air_quality: air,
    pollen,
    sources: {
      nasa_power: !powerErr,
      open_meteo_weather: !!wx,
      open_meteo_air_quality: !!air,
      open_meteo_pollen: !!pollen,
    },
    generated_at: new Date().toISOString(),
    units: {
      pressure: "hPa",
      precipitation_rate: "mm/h",
      precipitation_amount: "mm",
      wind_speed: "km/h",
      wind_direction: "deg",
      snowfall: "cm",
      freezing_level: "m",
      pollutants: "µg/m³",
      co: "µg/m³",
      uv_index: "index",
      pollen: "index",
    },
  }, { status: 200 });
}

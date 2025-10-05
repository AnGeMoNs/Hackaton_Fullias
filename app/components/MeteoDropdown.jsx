// file: app/components/MeteoDropdown.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Cloud, RefreshCcw, Wind, Droplet, Sun, Gauge } from "lucide-react";

function dirText(deg) {
  if (deg == null || Number.isNaN(deg)) return "-";
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

export default function MeteoDropdown({ lat, lon, city, disabled }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null);
  const [ts, setTs] = useState(null);
  const last = useRef({ lat: null, lon: null });
  const ref = useRef(null);

  async function load(force=false) {
    if (disabled) return;
    const same = last.current.lat === lat && last.current.lon === lon;
    if (!force && same && data) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/meteo?lat=${lat}&lon=${lon}&tz=auto`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || "Respuesta inválida");
      setData(j); setTs(new Date());
      last.current = { lat, lon };
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) load(); }, [open, lat, lon]);
  useEffect(() => {
    const onDown = (e) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("mousedown", onClick); };
  }, []);

  const badge = city ? city : `${lat?.toFixed?.(2)}, ${lon?.toFixed?.(2)}`;
  const fmt = (v, f=1) => (v == null || Number.isNaN(v) ? "—" : Number(v).toFixed(f));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen(v => !v)}
        className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}`}
        aria-haspopup="menu" aria-expanded={open}
        title="Ver detalles meteorológicos"
      >
        <Cloud size={18} />
        <span className="text-sm hidden md:inline">Meteo</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] sm:w-[26rem] bg-white border shadow-xl rounded-2xl p-3 sm:p-4 z-50">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{badge}</div>
              <div className="text-xs text-gray-500 truncate">{lat?.toFixed?.(4)}, {lon?.toFixed?.(4)}</div>
            </div>
            <button
              onClick={() => load(true)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
              title="Actualizar"
            >
              <RefreshCcw size={14} /> Refrescar
            </button>
          </div>

          {loading && (
            <div className="py-6 text-center text-sm text-gray-600">
              Cargando datos…
            </div>
          )}

          {!loading && err && (
            <div className="text-red-600 text-sm">Error: {err}</div>
          )}

          {!loading && !err && data && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Presión */}
              <div className="p-3 border rounded-xl">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Gauge size={14} /> Presión
                </div>
                <div className="text-2xl font-bold">{fmt(data.pressure_hpa,0)}<span className="text-sm font-normal ml-1">hPa</span></div>
              </div>

              {/* UV */}
              <div className="p-3 border rounded-xl">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Sun size={14} /> Índice UV
                </div>
                <div className="text-2xl font-bold">{fmt(data.uv_index,1)}</div>
              </div>

              {/* Aire */}
              <div className="p-3 border rounded-xl col-span-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Cloud size={14} /> Calidad del aire (µg/m³)
                </div>
                <div className="grid grid-cols-6 gap-2 text-center text-[11px]">
                  <div><div className="font-semibold">{fmt(data.air_quality?.pm25,0)}</div><div className="text-gray-500">PM2.5</div></div>
                  <div><div className="font-semibold">{fmt(data.air_quality?.pm10,0)}</div><div className="text-gray-500">PM10</div></div>
                  <div><div className="font-semibold">{fmt(data.air_quality?.o3,0)}</div><div className="text-gray-500">O₃</div></div>
                  <div><div className="font-semibold">{fmt(data.air_quality?.no2,0)}</div><div className="text-gray-500">NO₂</div></div>
                  <div><div className="font-semibold">{fmt(data.air_quality?.so2,0)}</div><div className="text-gray-500">SO₂</div></div>
                  <div><div className="font-semibold">{fmt(data.air_quality?.co,0)}</div><div className="text-gray-500">CO</div></div>
                </div>
              </div>

              {/* Viento */}
              <div className="p-3 border rounded-xl">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Wind size={14} /> Viento
                </div>
                <div className="text-sm mt-1">
                  <div>Vel: <span className="font-semibold">{fmt(data.wind?.speed_kmh,1)} km/h</span></div>
                  <div>Ráf: <span className="font-semibold">{fmt(data.wind?.gust_kmh,1)} km/h</span></div>
                  <div>Dir: <span className="font-semibold">{fmt(data.wind?.direction_deg,0)}° ({dirText(data.wind?.direction_deg)})</span></div>
                </div>
              </div>

              {/* Precipitación */}
              <div className="p-3 border rounded-xl">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Droplet size={14} /> Precipitación
                </div>
                <div className="text-sm mt-1">
                  <div>Prob: <span className="font-semibold">{fmt(data.forecast?.precipitation_probability_pct,0)}%</span></div>
                  <div>Tasa: <span className="font-semibold">{fmt(data.precipitation_mm_per_hr ?? data.forecast?.rain_mm ?? data.forecast?.showers_mm,1)} mm/h</span></div>
                  <div>Cota: <span className="font-semibold">{fmt(data.forecast?.freezing_level_m,0)} m</span></div>
                </div>
              </div>

              {/* Fuentes */}
              <div className="col-span-2 text-[11px] text-gray-500 flex items-center justify-between">
                <div>
                  {data.sources?.nasa_power && "NASA POWER"}{data.sources?.nasa_power && (data.sources?.open_meteo_weather || data.sources?.open_meteo_air_quality) ? " + " : ""}
                  {(data.sources?.open_meteo_weather || data.sources?.open_meteo_air_quality) && "Open-Meteo"}
                </div>
                <div>{ts ? `Act: ${ts.toLocaleTimeString()}` : null}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
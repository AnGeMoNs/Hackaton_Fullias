// file: app/components/MeteoPanel.tsx
"use client";
import { useEffect, useState } from "react";

function dirToText(deg?: number | null) {
  if (deg == null) return "-";
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"];
  const i = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[i];
}

export default function MeteoPanel({ lat, lon }: { lat: number; lon: number }) {
  const [data, setData] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch(`/api/meteo?lat=${lat}&lon=${lon}&tz=auto`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setData(j);
        if (!j?.ok) throw new Error(j?.error || "Respuesta inválida");
      } catch (e: any) {
        setErr(e.message || "Error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [lat, lon]);

  if (loading) return <div className="p-4 rounded-2xl shadow border">Cargando meteo…</div>;
  if (err) return <div className="p-4 rounded-2xl shadow border text-red-600">
    Error: {err}. Revisa consola (F12) y `debug` del endpoint.
  </div>;
  if (!data) return null;

  const a = data.air_quality || {};
  const pol = data.pollen || {};
  const w = data.wind || {};
  const f = data.forecast || {};

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <section className="p-4 rounded-2xl shadow border">
        <h3 className="text-lg font-semibold mb-2">Presión atmosférica</h3>
        <div className="text-3xl font-bold">{data.pressure_hpa?.toFixed?.(0) ?? "—"} <span className="text-base font-normal">hPa</span></div>
        <p className="text-xs text-gray-500">Fuente: NASA POWER</p>
      </section>

      <section className="p-4 rounded-2xl shadow border">
        <h3 className="text-lg font-semibold mb-2">Índice UV</h3>
        <div className="text-3xl font-bold">{data.uv_index != null ? data.uv_index.toFixed?.(1) : "—"}</div>
        <p className="text-xs text-gray-500">NASA (fallback Open-Meteo)</p>
      </section>

      <section className="p-4 rounded-2xl shadow border">
        <h3 className="text-lg font-semibold mb-2">Calidad del aire</h3>
        <ul className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
          <li>PM2.5: <strong>{a.pm25 ?? "—"}</strong></li>
          <li>PM10: <strong>{a.pm10 ?? "—"}</strong></li>
          <li>O₃: <strong>{a.o3 ?? "—"}</strong></li>
          <li>NO₂: <strong>{a.no2 ?? "—"}</strong></li>
          <li>SO₂: <strong>{a.so2 ?? "—"}</strong></li>
          <li>CO: <strong>{a.co ?? "—"}</strong></li>
          <li>Polvo: <strong>{a.dust ?? "—"}</strong></li>
        </ul>
        <p className="text-xs text-gray-500 mt-1">Open-Meteo</p>
      </section>

      <section className="p-4 rounded-2xl shadow border">
        <h3 className="text-lg font-semibold mb-2">Polen</h3>
        <ul className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
          <li>Gramíneas: <strong>{pol.grass ?? "—"}</strong></li>
          <li>Abedul: <strong>{pol.birch ?? "—"}</strong></li>
          <li>Ambrosía: <strong>{pol.ragweed ?? "—"}</strong></li>
          <li>Aliso: <strong>{pol.alder ?? "—"}</strong></li>
          <li>Olivo: <strong>{pol.olive ?? "—"}</strong></li>
          <li>Artemisa: <strong>{pol.mugwort ?? "—"}</strong></li>
        </ul>
        <p className="text-xs text-gray-500 mt-1">Open-Meteo</p>
      </section>

      <section className="p-4 rounded-2xl shadow border">
        <h3 className="text-lg font-semibold mb-2">Viento</h3>
        <div className="text-sm">Velocidad: <strong>{w.speed_kmh?.toFixed?.(1) ?? "—"} km/h</strong></div>
        <div className="text-sm">Ráfagas: <strong>{w.gust_kmh?.toFixed?.(1) ?? "—"} km/h</strong></div>
        <div className="text-sm">Dirección: <strong>{w.direction_deg ?? "—"}° ({dirToText(w.direction_deg)})</strong></div>
        <p className="text-xs text-gray-500 mt-1">NASA + Open-Meteo</p>
      </section>

      <section className="p-4 rounded-2xl shadow border">
        <h3 className="text-lg font-semibold mb-2">Precipitación</h3>
        <div className="text-sm">Prob.: <strong>{f.precipitation_probability_pct ?? "—"}%</strong></div>
        <div className="text-sm">Total: <strong>{(data.precipitation_mm_per_hr ?? f.rain_mm ?? f.showers_mm) ?? "—"} mm/h</strong></div>
        <div className="text-sm">Chubascos: <strong>{f.showers_mm ?? "—"} mm/h</strong></div>
        <div className="text-sm">Cota de nieve (≈): <strong>{f.freezing_level_m ?? "—"} m</strong></div>
        <p className="text-xs text-gray-500 mt-1">Open-Meteo</p>
      </section>


    </div>
  );
}

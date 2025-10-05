// file: app/meteo/page.js
"use client";
import { useEffect, useState } from "react";
import MeteoPanel from "../components/MeteoPanel"; // importante: ruta correcta y misma mayúscula

export default function MeteoPage() {
  const [pos, setPos] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setErr("Geolocalización no soportada");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => setErr(e.message || "No se pudo obtener tu ubicación"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const useSantiago = () => setPos({ lat: -33.45, lon: -70.66 });

  if (!pos && !err) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Detalles meteorológicos</h1>
        <p className="mb-3">Obteniendo ubicación…</p>
        <button onClick={useSantiago} className="px-3 py-2 rounded-xl shadow border">
          Usar Santiago (fallback)
        </button>
      </main>
    );
  }

  if (err) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Detalles meteorológicos</h1>
        <div className="mb-4 text-red-600">Ubicación denegada o fallida: {err}</div>
        <button onClick={useSantiago} className="px-3 py-2 rounded-xl shadow border">
          Usar Santiago (fallback)
        </button>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Detalles meteorológicos</h1>
      <MeteoPanel lat={pos.lat} lon={pos.lon} />
    </main>
  );
}

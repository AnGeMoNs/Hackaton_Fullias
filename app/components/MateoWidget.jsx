// app/components/MeteoWidget.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Thermometer, Wind } from "lucide-react";

// Calcula el AQI (Air Quality Index) y determina el color
function getAQIInfo(pm25) {
  if (pm25 == null || pm25 < 0) {
    return { level: "Desconocido", color: "bg-gray-400", textColor: "text-gray-700", icon: "😶" };
  }
  
  if (pm25 <= 12) {
    return { level: "Bueno", color: "bg-green-500", textColor: "text-green-700", icon: "😊" };
  } else if (pm25 <= 35.4) {
    return { level: "Moderado", color: "bg-yellow-500", textColor: "text-yellow-700", icon: "😐" };
  } else if (pm25 <= 55.4) {
    return { level: "Sensible", color: "bg-orange-500", textColor: "text-orange-700", icon: "😷" };
  } else if (pm25 <= 150.4) {
    return { level: "No saludable", color: "bg-red-500", textColor: "text-red-700", icon: "😨" };
  } else if (pm25 <= 250.4) {
    return { level: "Muy malo", color: "bg-purple-500", textColor: "text-purple-700", icon: "🤢" };
  } else {
    return { level: "Peligroso", color: "bg-red-900", textColor: "text-red-900", icon: "☠️" };
  }
}

export default function MeteoWidget({ lat, lon, city, className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastFetch = useRef({ lat: null, lon: null });

  // Cargar datos meteorológicos
  useEffect(() => {
    const fetchData = async () => {
      // Evitar fetch duplicados
      if (lastFetch.current.lat === lat && lastFetch.current.lon === lon && data) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/meteo?lat=${lat}&lon=${lon}&tz=auto`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "Error al cargar datos");

        setData(json);
        lastFetch.current = { lat, lon };
      } catch (err) {
        console.error("Error en MeteoWidget:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (lat && lon) {
      fetchData();
    }
  }, [lat, lon]);

  // Auto-actualizar cada 10 minutos
  useEffect(() => {
    if (!lat || !lon) return;

    const interval = setInterval(() => {
      lastFetch.current = { lat: null, lon: null }; // Forzar refetch
      fetch(`/api/meteo?lat=${lat}&lon=${lon}&tz=auto`, { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (json?.ok) setData(json);
        })
        .catch((err) => console.error("Error actualizando meteo:", err));
    }, 600000); // 10 minutos

    return () => clearInterval(interval);
  }, [lat, lon]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg ${className}`}>
        <div className="animate-pulse flex gap-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <div className="w-12 h-4 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg ${className}`}>
        <span className="text-xs text-gray-500">Sin datos</span>
      </div>
    );
  }

  const temp = data.temperature_c;
  const pm25 = data.air_quality?.pm25;
  const aqiInfo = getAQIInfo(pm25);

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {/* Temperatura */}
      <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-blue-200">
        <Thermometer className="text-blue-600" size={16} />
        <span className="text-sm sm:text-base font-semibold text-blue-900">
          {temp != null ? `${Math.round(temp)}°C` : "--°C"}
        </span>
      </div>

      {/* Calidad del Aire */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-opacity-30 ${aqiInfo.color} bg-opacity-20`}
        title={`Calidad del aire: ${aqiInfo.level} (PM2.5: ${pm25 != null ? Math.round(pm25) : "--"} µg/m³)`}
      >
        <Wind className={aqiInfo.textColor} size={16} />
        <span className="text-sm sm:text-base font-semibold hidden xs:inline">
          {aqiInfo.icon}
        </span>
        <span className={`text-xs sm:text-sm font-medium ${aqiInfo.textColor} hidden sm:inline`}>
          {aqiInfo.level}
        </span>
      </div>
    </div>
  );
}
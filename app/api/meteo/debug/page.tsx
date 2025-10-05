// file: app/meteo/debug/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function DebugMeteo() {
  const [json, setJson] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const test = { lat: -33.45, lon: -70.66 };

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch(`/api/meteo?lat=${test.lat}&lon=${test.lon}&tz=auto`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setJson(await r.json());
      } catch (e: any) {
        setErr(e.message || "error");
      }
    };
    run();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-2">/api/meteo debug</h1>
      {err && <div className="text-red-600 mb-2">Error: {err}</div>}
      <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">{JSON.stringify(json, null, 2)}</pre>
    </main>
  );
}
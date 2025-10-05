// file: Hackaton_Fullias-main/app/api/nasa-fires/route.js
import { NextResponse } from 'next/server';

function parseConfidence(raw) {
  // Why: VIIRS often returns low|nominal|high instead of %.
  if (raw == null) return null;
  const t = String(raw).trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const map = { low: 25, nominal: 55, high: 85 };
  return map[t] ?? null;
}

function parseWhen(acq_date, acq_time) {
  // Why: "YYYY-MM-DD HHMM" is not a reliable Date for all engines.
  const date = String(acq_date || '').trim();
  const time = String(acq_time || '').padStart(4, '0'); // e.g. 0342
  const hh = time.slice(0, 2);
  const mm = time.slice(2, 4);
  const iso = `${date}T${hh}:${mm}:00Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function GET() {
  const MAP_KEY = process.env.NASA_FIRMS_KEY;

  if (!MAP_KEY) {
    return NextResponse.json(
      { success: false, fires: [], error: 'NASA FIRMS API key not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/VIIRS_SNPP_NRT/world/1`,
      {
        next: { revalidate: 3600 },
        headers: { Accept: 'text/csv' }
      }
    );

    if (!response.ok) {
      throw new Error(`NASA FIRMS API error: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) {
      return NextResponse.json({ success: true, fires: [], count: 0, timestamp: new Date().toISOString() });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const fires = lines
      .slice(1, 101)
      .map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((h, i) => (row[h] = values[i]?.trim()));
        return row;
      })
      .filter(f => f.latitude && f.longitude && f.brightness)
      .map((f, idx) => {
        const lat = Number(f.latitude);
        const lng = Number(f.longitude);
        const brightness = Number(f.brightness);
        const confidence = parseConfidence(f.confidence);
        return {
          id: `firms-${lat}-${lng}-${idx}`,
          type: 'fire',
          lat,
          lng,
          description: `Incendio detectado por satélite – Brillo: ${brightness}K${confidence != null ? `, Confianza: ${confidence}%` : ''}`,
          user: 'NASA FIRMS',
          time: parseWhen(f.acq_date, f.acq_time),
          confirmations: 0,
          falseReports: 0,
          source: 'nasa-firms',
          brightness,
          confidence,
          frp: f.frp != null ? Number(f.frp) : undefined
        };
      });

    return NextResponse.json({
      success: true,
      fires,
      count: fires.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('NASA FIRMS API Error:', error);
    return NextResponse.json(
      { success: false, fires: [], error: error.message },
      { status: 500 }
    );
  }
}

// app/api/nasa-fires/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  const MAP_KEY = process.env.NASA_FIRMS_KEY;
  
  if (!MAP_KEY) {
    return NextResponse.json(
      { success: false, fires: [], error: 'NASA FIRMS API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Obtener incendios activos de las últimas 24 horas a nivel mundial
    const response = await fetch(
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/VIIRS_SNPP_NRT/world/1`,
      { 
        next: { revalidate: 3600 }, // Cache por 1 hora
        headers: {
          'Accept': 'text/csv'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`NASA FIRMS API error: ${response.status}`);
    }

    const csvText = await response.text();
    
    // Parsear CSV
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    const fires = lines.slice(1, 101) // Limitar a 100 incendios más recientes
      .map(line => {
        const values = line.split(',');
        const fire = {};
        headers.forEach((header, index) => {
          fire[header.trim()] = values[index]?.trim();
        });
        return fire;
      })
      .filter(fire => fire.latitude && fire.longitude && fire.brightness)
      .map((fire, index) => ({
        id: `firms-${fire.latitude}-${fire.longitude}-${index}`,
        type: 'fire',
        lat: parseFloat(fire.latitude),
        lng: parseFloat(fire.longitude),
        description: `Incendio activo detectado por satélite - Brillo: ${fire.brightness}K, Confianza: ${fire.confidence}%`,
        user: 'NASA FIRMS',
        time: new Date(fire.acq_date + ' ' + fire.acq_time),
        confirmations: 0,
        falseReports: 0,
        source: 'nasa-firms',
        brightness: parseFloat(fire.brightness),
        confidence: parseFloat(fire.confidence),
        frp: parseFloat(fire.frp) // Fire Radiative Power
      }));

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
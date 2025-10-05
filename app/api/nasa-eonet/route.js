// app/api/nasa-eonet/route.js
import { NextResponse } from 'next/server';

const EVENT_TYPE_MAP = {
  'Wildfires': 'fire',
  'Severe Storms': 'smoke',
  'Volcanoes': 'fire',
  'Dust and Haze': 'pollution',
  'Floods': 'pollution',
  'Sea and Lake Ice': 'good'
};

export async function GET() {
  try {
    const response = await fetch(
      'https://eonet.gsfc.nasa.gov/api/v3/events?limit=20&status=open',
      { next: { revalidate: 300 } } // Cache por 5 minutos
    );

    if (!response.ok) {
      throw new Error('Error fetching NASA EONET data');
    }

    const data = await response.json();

    const events = data.events
      .filter(event => event.geometry && event.geometry.length > 0)
      .map(event => {
        const geometry = event.geometry[0];
        const coords = geometry.coordinates;
        
        return {
          id: `nasa-${event.id}`,
          type: EVENT_TYPE_MAP[event.categories[0]?.title] || 'pollution',
          lat: coords[1],
          lng: coords[0],
          description: event.title,
          user: 'NASA EONET',
          time: new Date(geometry.date || event.geometry[0]?.date),
          confirmations: 0,
          falseReports: 0,
          source: 'nasa'
        };
      });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('NASA EONET API Error:', error);
    return NextResponse.json(
      { success: false, events: [], error: error.message },
      { status: 500 }
    );
  }
}
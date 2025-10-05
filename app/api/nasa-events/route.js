// app/api/nasa-events/route.js
export async function GET() {
  try {
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?limit=10');

    if (!res.ok) {
      const errorText = await res.text();
      console.error('NASA EONET error response:', errorText);
      return Response.json({ error: 'Failed to fetch NASA events' }, { status: 502 });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error('Unexpected error in NASA EONET route:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

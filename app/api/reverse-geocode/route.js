// file: Hackaton_Fullias-main/app/api/reverse-geocode/route.js
// Why: Respect Nominatim usage policy by setting a proper UA/email server-side.
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const lang = searchParams.get('lang') || 'es';
  const contact = process.env.CONTACT_EMAIL || 'contact@example.com';

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1&email=${encodeURIComponent(contact)}`;

  const res = await fetch(url, {
    headers: {
      'Accept-Language': lang,
      'User-Agent': `FullCleanAirs/1.0 (${contact})`
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'reverse geocode failed' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

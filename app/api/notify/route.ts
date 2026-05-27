import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 });

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const { name, phone, bedrooms, city, callBackDate, notes } = await req.json();

  const lines = [
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Bedrooms: ${bedrooms}BR`,
    `City: ${city}`,
    callBackDate ? `Call Back Date: ${callBackDate}` : null,
    notes ? `\nNotes: ${notes}` : null,
  ].filter(Boolean).join('\n');

  const { error } = await resend.emails.send({
    from: 'Canyon Apartments <noreply@canyon-markets.com>',
    to: 'properties@canyon-advisors.com',
    subject: `New Follow-Up: ${name} — ${bedrooms}BR in ${city}`,
    text: lines,
  });

  if (error) return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  return NextResponse.json({ success: true });
}

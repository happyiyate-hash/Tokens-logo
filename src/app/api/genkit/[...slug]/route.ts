
import { NextResponse } from 'next/server';

// This API route has been disabled to resolve a build issue with Genkit dependencies.
// It can be re-enabled later with a corrected implementation.

export async function GET() {
  return NextResponse.json({ message: 'Genkit API is currently disabled.' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ message: 'Genkit API is currently disabled.' }, { status: 404 });
}

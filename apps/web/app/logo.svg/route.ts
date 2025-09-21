import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // Read the logo.svg file from the public directory
    const logoPath = join(process.cwd(), 'public', 'logo.svg');
    const logoContent = await readFile(logoPath);
    
    // Return the SVG with correct headers
    return new NextResponse(logoContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new NextResponse('Not Found', { status: 404 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // Read the favicon.svg file from the public directory
    const faviconPath = join(process.cwd(), 'public', 'favicon.svg');
    const faviconContent = await readFile(faviconPath);
    
    // Return the SVG with correct headers
    return new NextResponse(faviconContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new NextResponse('Not Found', { status: 404 });
  }
}

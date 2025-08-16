import { NextResponse } from 'next/server';
import { listResponses } from '@/data/store';

export async function GET() {
  const data = listResponses();
  const n = data.length;
  const themes = ['usability', 'integrations', 'reporting', 'customization', 'pricing'];
  const plan = `Battle plan to defeat the Ugly CRM: focus on ${themes
    .slice(0, 3)
    .join(', ')} first, then iterate.`;
  return NextResponse.json({ count: n, themes, plan });
}



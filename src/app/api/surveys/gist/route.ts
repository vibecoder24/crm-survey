import { NextResponse } from 'next/server';

type GistBody = {
  text: string;
};

export async function POST(request: Request) {
  const { text } = (await request.json()) as GistBody;
  if (!text || text.trim().length < 10) {
    return NextResponse.json({ gist: '', hint: 'Try adding more details so we can summarize better.' });
  }
  // Placeholder: In production, call LLM to summarize.
  const gist = text.trim().split(/\s+/).slice(0, 30).join(' ') + (text.length > 200 ? '…' : '');
  const hint = 'Looks good—clear and actionable.';
  return NextResponse.json({ gist, hint });
}



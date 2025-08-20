"use client";
import { useEffect, useMemo, useState } from 'react';

type Resp = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  company?: string;
  answers: Record<string, unknown>;
  ratingGroup?: Record<string, number>;
};

export default function IndividualView() {
  const [rows, setRows] = useState<Resp[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/surveys/responses').then(r => r.json()).then(d => { setRows(d); setActiveId(d[0]?.id || null); }).catch(() => setRows([]));
  }, []);

  const active = useMemo(() => rows.find(r => r.id === activeId) || null, [rows, activeId]);

  return (
    <main className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Individual Response</h1>
      <div className="flex gap-4">
        <aside className="w-72 border rounded p-2 overflow-auto h-[70vh]">
          {rows.map(r => (
            <button key={r.id} className={`w-full text-left px-2 py-1 rounded ${activeId===r.id?'bg-black text-white':''}`} onClick={() => setActiveId(r.id)}>
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-xs text-gray-500">{r.email}</div>
              <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
            </button>
          ))}
        </aside>
        <section className="flex-1 border rounded p-3 text-sm">
          {active ? (
            <div>
              <div className="text-gray-600 text-xs mb-2">ID: {active.id}</div>
              <h2 className="font-semibold mb-2">Answers</h2>
              <pre className="whitespace-pre-wrap">{JSON.stringify(active.answers, null, 2)}</pre>
              <h2 className="font-semibold mt-4 mb-2">Ratings</h2>
              <pre className="whitespace-pre-wrap">{JSON.stringify(active.ratingGroup || {}, null, 2)}</pre>
            </div>
          ) : (
            <div className="text-gray-500">No selection.</div>
          )}
        </section>
      </div>
    </main>
  );
}



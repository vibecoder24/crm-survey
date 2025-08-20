"use client";
import { useEffect, useMemo, useState } from 'react';

type Resp = {
  id: string;
  createdAt: string;
  answers: Record<string, unknown>;
  ratingGroup?: Record<string, number>;
};

export default function AggregateView() {
  const [rows, setRows] = useState<Resp[]>([]);
  const [questionId, setQuestionId] = useState<string>("top_metrics");

  useEffect(() => {
    fetch('/api/surveys/responses').then(r => r.json()).then(setRows).catch(() => setRows([]));
  }, []);

  const values = useMemo(() => {
    return rows.map(r => ({ id: r.id, value: r.answers?.[questionId] }));
  }, [rows, questionId]);

  return (
    <main className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Aggregate by Question</h1>
        <select className="border rounded px-2 py-1" value={questionId} onChange={e => setQuestionId(e.target.value)}>
          {Object.keys(rows[0]?.answers || { top_metrics: '' }).map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-3">
        {values.map(v => (
          <div key={v.id} className="border rounded p-2 text-sm">
            <div className="text-gray-500">{v.id}</div>
            <div className="whitespace-pre-wrap">{typeof v.value === 'string' ? v.value : JSON.stringify(v.value)}</div>
          </div>
        ))}
      </div>
    </main>
  );
}



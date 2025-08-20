"use client";
import { useEffect, useState } from 'react';

type Summary = { steps: Array<{ questionId: string; views: number; nexts: number; dropPct: number; avgMs?: number }> };

export default function AnalyticsView() {
  const [events, setEvents] = useState<Summary | null>(null);

  useEffect(() => {
    fetch('/api/telemetry/summary')
      .then(r => r.json())
      .then(setEvents)
      .catch(() => setEvents({ steps: [] }));
  }, []);

  const steps = events?.steps;

  return (
    <main className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Survey Analytics</h1>
      <div className="grid gap-4">
        <section>
          <h2 className="font-semibold mb-2">Step Drop-off</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Question</th>
                <th className="py-2 pr-4">Views</th>
                <th className="py-2 pr-4">Nexts</th>
                <th className="py-2 pr-4">Drop%</th>
                <th className="py-2 pr-4">Avg time (s)</th>
              </tr>
            </thead>
            <tbody>
              {steps?.map(s => (
                <tr key={s.questionId} className="border-b">
                  <td className="py-2 pr-4">{s.questionId}</td>
                  <td className="py-2 pr-4">{s.views}</td>
                  <td className="py-2 pr-4">{s.nexts}</td>
                  <td className="py-2 pr-4">{s.dropPct.toFixed(1)}%</td>
                  <td className="py-2 pr-4">{s.avgMs ? (s.avgMs/1000).toFixed(1) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}



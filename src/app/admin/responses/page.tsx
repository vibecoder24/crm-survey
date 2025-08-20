"use client";
import { useEffect, useState } from 'react';

type Resp = {
  id: string;
  name: string;
  email: string;
  company?: string;
  createdAt: string;
  answers: Record<string, unknown>;
  ratingGroup?: Record<string, number>;
  aiGists?: Record<string, string>;
};

export default function ResponsesPage() {
  const [rows, setRows] = useState<Resp[]>([]);

  useEffect(() => {
    fetch('/api/surveys/responses')
      .then(r => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  function toCSV(data: Resp[]): string {
    const headers = ['id', 'createdAt', 'name', 'email', 'company', 'answers', 'ratings'];
    const lines = [headers.join(',')];
    for (const r of data) {
      const answers = JSON.stringify(r.answers).replaceAll('"', '""');
      const ratings = JSON.stringify(r.ratingGroup || {}).replaceAll('"', '""');
      lines.push([
        r.id,
        r.createdAt,
        r.name,
        r.email,
        r.company || '',
        `"${answers}"`,
        `"${ratings}"`,
      ].join(','));
    }
    return lines.join('\n');
  }

  function downloadCSV() {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'responses.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Responses</h1>
        <div className="flex gap-2">
          <a className="px-3 py-2 border rounded" href="/admin/aggregate">Aggregate</a>
          <a className="px-3 py-2 border rounded" href="/admin/individual">Individual</a>
          <a className="px-3 py-2 border rounded" href="/admin/analytics">Analytics</a>
          <button className="px-3 py-2 border rounded" onClick={downloadCSV}>Export CSV</button>
        </div>
      </div>
      <div className="mt-4 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Answers</th>
              <th className="py-2 pr-4">Ratings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b align-top">
                <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{r.name}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{r.email}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{r.company}</td>
                <td className="py-2 pr-4">
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(r.answers, null, 2)}</pre>
                </td>
                <td className="py-2 pr-4">
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(r.ratingGroup || {}, null, 2)}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}



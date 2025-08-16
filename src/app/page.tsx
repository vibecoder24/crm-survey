import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">CRM Pain Points Survey</h1>
      <p className="mt-2 text-sm text-gray-600">
        Minimal, mobile-first survey to understand CRM pain points. No login required.
      </p>
      <div className="mt-6 flex gap-4">
        <Link className="px-4 py-2 rounded bg-black text-white" href="/survey">
          Take the survey
        </Link>
        <Link className="px-4 py-2 rounded border" href="/admin/responses">
          View responses (admin)
        </Link>
      </div>
    </main>
  );
}

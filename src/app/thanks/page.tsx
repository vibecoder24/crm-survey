export default function ThanksPage() {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('survey-submitted');
    if (!token) {
      // Guard: if user refreshes or deep-links, send them home
      if (typeof window !== 'undefined') window.location.href = '/';
    }
  }
  return (
    <main className="max-w-2xl mx-auto p-10 text-center">
      <div className="inline-block rounded-2xl border p-8 shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-black text-white flex items-center justify-center text-xl">✓</div>
        <h1 className="text-2xl font-semibold">Thanks for your time!</h1>
        <p className="text-gray-600 mt-2">Your insights will directly shape the next‑generation CRM experience.</p>
        <div className="mt-6 text-sm text-gray-500">You can safely close this tab now.</div>
      </div>
    </main>
  );
}



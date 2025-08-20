import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="max-w-3xl w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/aether.svg" alt="Aether" className="h-10 w-10" />
          <span className="text-xl font-semibold">Aether</span>
        </div>
        <h1 className="text-3xl font-semibold">CRM Pain Points & Product Fit Survey</h1>
        <p className="mt-3 text-gray-600">
          Help us understand what works and what gets in your way so we can build a CRM experience you’ll love.
        </p>
        <div className="mt-6 grid gap-3 text-left text-gray-700">
          <div>• Time to complete: ~15 minutes</div>
          <div>• What you’ll get: a summary of your top pain points and prioritized suggestions for improvement</div>
          <div>• How we use your answers: to identify the biggest friction and opportunities for Aether’s next releases</div>
        </div>
        <div className="mt-8">
          <Link className="inline-block px-5 py-3 rounded bg-black text-white" href="/survey">
            Start the survey
          </Link>
        </div>
        </div>
      </main>
  );
}

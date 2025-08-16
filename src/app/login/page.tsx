"use client";
import { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get('next') || '/admin/responses';
      window.location.href = next;
    }
  }

  return (
    <main className="max-w-sm mx-auto p-8">
      <h1 className="text-xl font-semibold mb-4">Admin Login</h1>
      <div className="grid gap-3">
        <input className="border rounded px-3 py-2" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="px-4 py-2 rounded bg-black text-white" onClick={handleLogin}>Login</button>
      </div>
    </main>
  );
}



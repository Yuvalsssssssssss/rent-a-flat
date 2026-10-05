import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import Field from '../components/Field';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-56 left-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <form onSubmit={onSubmit} className="relative w-full max-w-sm space-y-5 rounded-3xl border border-line bg-surface/80 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="space-y-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-violet-500 to-cyan-400 text-xl shadow-lg shadow-violet-900/40">🏠</div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">rent-a-flat</h1>
            <p className="text-sm text-zinc-400">Find the one. Together.</p>
          </div>
        </div>
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

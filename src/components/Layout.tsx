import { Link, NavLink, Outlet } from 'react-router-dom';
import { Columns3, LogOut, Plus, SlidersHorizontal, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useData } from '../lib/data';

const TABS = [
  { to: '/', label: 'Ranking', icon: Trophy, end: true },
  { to: '/compare', label: 'Compare', icon: Columns3, end: false },
  { to: '/categories', label: 'Weights', icon: SlidersHorizontal, end: false },
];

export default function Layout() {
  const { members, me } = useData();
  const myName = members.find((m) => m.user_id === me)?.display_name ?? '';
  return (
    <div className="min-h-dvh">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(139_92_246/0.16),transparent)]" />
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-violet-500 to-cyan-400 text-sm">🏠</span>
            rent-a-flat
          </Link>
          <nav className="hidden items-center gap-1 rounded-xl border border-line bg-surface p-1 sm:flex">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end}
                className={({ isActive }) => `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-surface-2 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
                <t.icon size={15} />{t.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <Link to="/apartment/new" className="btn-primary hidden sm:inline-flex"><Plus size={16} />Add</Link>
            <span title={myName} className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/15 text-sm font-semibold text-violet-300 ring-1 ring-violet-500/30">
              {myName.charAt(0).toUpperCase()}
            </span>
            <button className="btn-icon h-8 w-8" aria-label="Sign out" title="Sign out" onClick={() => supabase.auth.signOut()}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-5xl px-4 pt-6 pb-32 sm:pb-12">
        <Outlet />
      </main>
      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-1 rounded-2xl border border-line bg-surface/85 p-1.5 shadow-2xl shadow-black/70 backdrop-blur-xl">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition ${isActive ? 'bg-surface-2 text-white' : 'text-zinc-500'}`}>
              <t.icon size={20} />{t.label}
            </NavLink>
          ))}
          <Link to="/apartment/new" aria-label="Add apartment"
            className="grid h-12 w-14 place-items-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-950/60 active:scale-95">
            <Plus size={22} />
          </Link>
        </div>
      </nav>
    </div>
  );
}

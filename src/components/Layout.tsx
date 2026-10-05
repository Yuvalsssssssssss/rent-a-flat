import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../lib/data';

const TABS = [
  { to: '/', label: 'Ranking', end: true },
  { to: '/compare', label: 'Compare', end: false },
  { to: '/categories', label: 'Categories', end: false },
];

export default function Layout() {
  const { members, me } = useData();
  const myName = members.find((m) => m.user_id === me)?.display_name;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="font-bold">🏠 rent-a-flat</NavLink>
          <nav className="hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end}
                className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="text-sm text-slate-500">
            {myName} · <button className="underline" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 sm:pb-10">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="grid grid-cols-3">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `py-3 text-center text-sm font-medium ${isActive ? 'text-indigo-700' : 'text-slate-500'}`}>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

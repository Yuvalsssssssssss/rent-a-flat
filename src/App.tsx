import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { DataProvider, useData } from './lib/data';
import { ToastProvider } from './components/Toast';
import FullScreenMessage from './components/FullScreenMessage';
import Layout from './components/Layout';
import SignIn from './pages/SignIn';
import Ranking from './pages/Ranking';
import Compare from './pages/Compare';
import Categories from './pages/Categories';
import MapPage from './pages/MapPage';
import ApartmentPage from './pages/ApartmentPage';
import ApartmentForm from './pages/ApartmentForm';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <FullScreenMessage text="Loading…" />;
  return (
    <ToastProvider>
      {session ? (
        <DataProvider key={session.user.id} userId={session.user.id}>
          <Gate />
        </DataProvider>
      ) : <SignIn />}
    </ToastProvider>
  );
}

function Gate() {
  const { status, members, me, reload } = useData();
  if (status === 'loading') return <FullScreenMessage text="Loading…" />;
  if (status === 'error') return <FullScreenMessage text="Couldn't load data." action={{ label: 'Retry', onClick: reload }} />;
  if (!members.some((m) => m.user_id === me)) {
    return <FullScreenMessage text="This account isn't allowed to use rent-a-flat." action={{ label: 'Sign out', onClick: () => supabase.auth.signOut() }} />;
  }
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Ranking />} />
          <Route path="compare" element={<Compare />} />
          <Route path="categories" element={<Categories />} />
          <Route path="map" element={<MapPage />} />
          <Route path="apartment/new" element={<ApartmentForm />} />
          <Route path="apartment/:id" element={<ApartmentPage />} />
          <Route path="apartment/:id/edit" element={<ApartmentForm />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

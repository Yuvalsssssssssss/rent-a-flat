import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useToast } from '../components/Toast';
import { indexScores, type ScoreIndex } from './scoring';
import type { Apartment, ApartmentInput, Category, Member, Place, Score } from './types';

type Status = 'loading' | 'ready' | 'error';

type DataContextValue = {
  status: Status;
  me: string;
  members: Member[];
  categories: Category[];
  apartments: Apartment[];
  scores: Score[];
  places: Place[];
  scoreIndex: ScoreIndex;
  reload: () => Promise<void>;
  saveApartment: (input: ApartmentInput & { lat?: number | null; lng?: number | null }, id?: string) => Promise<string | null>;
  setLocation: (apartmentId: string, lat: number, lng: number) => Promise<void>;
  setTags: (apartmentId: string, tags: string[]) => Promise<void>;
  addPlace: (place: Omit<Place, 'id'>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  deleteApartment: (id: string) => Promise<boolean>;
  setScore: (apartmentId: string, categoryId: string, score: number | null) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, patch: { name?: string; weight?: number }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  moveCategory: (id: string, direction: -1 | 1) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>('loading');
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  const reload = useCallback(async () => {
    const [m, c, a, s, p] = await Promise.all([
      supabase.rpc('members'),
      supabase.from('categories').select('id,name,weight,position').order('position').order('created_at'),
      supabase.from('apartments').select('*').order('created_at'),
      supabase.from('scores').select('apartment_id,category_id,user_id,score'),
      supabase.from('places').select('id,name,emoji,lat,lng').order('created_at'),
    ]);
    const error = m.error ?? c.error ?? a.error ?? s.error ?? p.error;
    if (error) {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
      toast(`Couldn't load data: ${error.message}`);
      return;
    }
    setMembers(m.data as Member[]);
    setCategories(c.data as Category[]);
    setApartments(a.data as Apartment[]);
    setScores(s.data as Score[]);
    setPlaces(p.data as Place[]);
    setStatus('ready');
  }, [toast]);

  useEffect(() => {
    reload();
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const fail = useCallback((what: string, message: string) => {
    toast(`Couldn't ${what}: ${message}`);
    reload();
  }, [toast, reload]);

  const saveApartment = async (input: ApartmentInput, id?: string) => {
    const { data, error } = id
      ? await supabase.from('apartments').update(input).eq('id', id).select().single()
      : await supabase.from('apartments').insert(input).select().single();
    if (error) { toast(`Couldn't save apartment: ${error.message}`); return null; }
    const saved = data as Apartment;
    setApartments((list) => (id ? list.map((x) => (x.id === id ? saved : x)) : [...list, saved]));
    return saved.id;
  };

  const setLocation = async (apartmentId: string, lat: number, lng: number) => {
    setApartments((list) => list.map((x) => (x.id === apartmentId ? { ...x, lat, lng } : x)));
    const { error } = await supabase.from('apartments').update({ lat, lng }).eq('id', apartmentId);
    if (error) fail('save location', error.message);
  };

  const setTags = async (apartmentId: string, tags: string[]) => {
    setApartments((list) => list.map((x) => (x.id === apartmentId ? { ...x, tags } : x)));
    const { error } = await supabase.from('apartments').update({ tags }).eq('id', apartmentId);
    if (error) fail('save tags', error.message);
  };

  const addPlace = async (place: Omit<Place, 'id'>) => {
    const { data, error } = await supabase.from('places').insert(place).select('id,name,emoji,lat,lng').single();
    if (error) { toast(`Couldn't add place: ${error.message}`); return; }
    setPlaces((list) => [...list, data as Place]);
  };

  const deletePlace = async (id: string) => {
    const { error } = await supabase.from('places').delete().eq('id', id);
    if (error) { toast(`Couldn't delete place: ${error.message}`); return; }
    setPlaces((list) => list.filter((x) => x.id !== id));
  };

  const deleteApartment = async (id: string) => {
    const { error } = await supabase.from('apartments').delete().eq('id', id);
    if (error) { toast(`Couldn't delete apartment: ${error.message}`); return false; }
    setApartments((list) => list.filter((x) => x.id !== id));
    setScores((list) => list.filter((s) => s.apartment_id !== id));
    return true;
  };

  const setScore = async (apartmentId: string, categoryId: string, score: number | null) => {
    const match = { apartment_id: apartmentId, category_id: categoryId, user_id: userId };
    setScores((list) => {
      const rest = list.filter((s) => !(s.apartment_id === apartmentId && s.category_id === categoryId && s.user_id === userId));
      return score === null ? rest : [...rest, { ...match, score }];
    });
    const { error } = score === null
      ? await supabase.from('scores').delete().match(match)
      : await supabase.from('scores').upsert({ ...match, score, updated_at: new Date().toISOString() });
    if (error) fail('save score', error.message);
  };

  const addCategory = async (name: string) => {
    const position = categories.reduce((max, c) => Math.max(max, c.position), -1) + 1;
    const { data, error } = await supabase.from('categories')
      .insert({ name, weight: 3, position }).select('id,name,weight,position').single();
    if (error) { toast(`Couldn't add category: ${error.message}`); return; }
    setCategories((list) => [...list, data as Category]);
  };

  const updateCategory = async (id: string, patch: { name?: string; weight?: number }) => {
    setCategories((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from('categories').update(patch).eq('id', id);
    if (error) fail('update category', error.message);
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast(`Couldn't delete category: ${error.message}`); return; }
    setCategories((list) => list.filter((c) => c.id !== id));
    setScores((list) => list.filter((s) => s.category_id !== id));
  };

  const moveCategory = async (id: string, direction: -1 | 1) => {
    const i = categories.findIndex((c) => c.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= categories.length) return;
    const list = [...categories];
    [list[i], list[j]] = [list[j], list[i]];
    const next = list.map((c, idx) => ({ ...c, position: idx }));
    const changed = next.filter((c) => categories.find((o) => o.id === c.id)!.position !== c.position);
    setCategories(next);
    const results = await Promise.all(changed.map((c) =>
      supabase.from('categories').update({ position: c.position }).eq('id', c.id)));
    const error = results.find((r) => r.error)?.error;
    if (error) fail('reorder categories', error.message);
  };

  const scoreIndex = useMemo(() => indexScores(scores), [scores]);

  return (
    <DataContext.Provider value={{
      status, me: userId, members, categories, apartments, scores, places, scoreIndex, reload,
      saveApartment, setLocation, setTags, addPlace, deletePlace, deleteApartment, setScore, addCategory, updateCategory, deleteCategory, moveCategory,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('useData must be used inside DataProvider');
  return value;
}

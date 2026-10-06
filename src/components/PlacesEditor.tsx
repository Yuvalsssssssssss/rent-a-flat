import { useState, type FormEvent } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { useData } from '../lib/data';
import { useToast } from './Toast';
import { searchPlaces, type GeoResult } from '../lib/geocode';

export default function PlacesEditor() {
  const { places, addPlace, deletePlace } = useData();
  const toast = useToast();
  const [emoji, setEmoji] = useState('📍');
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    try {
      setResults(await searchPlaces(query.trim()));
    } catch (err) {
      toast((err as Error).message);
    }
    setBusy(false);
  }

  async function pick(r: GeoResult) {
    await addPlace({ name: name.trim() || r.label.split(',')[0], emoji: emoji.trim() || '📍', lat: r.lat, lng: r.lng });
    setName('');
    setQuery('');
    setEmoji('📍');
    setResults(null);
  }

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold">Key places</h2>
        <p className="text-xs text-zinc-500">Every apartment shows its walking time to these.</p>
      </div>
      <ul className="divide-y divide-line">
        {places.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <span className="text-lg">{p.emoji}</span>
            <span className="flex-1 text-sm">{p.name}</span>
            <button className="btn-icon hover:text-rose-400" aria-label={`Delete ${p.name}`}
              onClick={() => { if (confirm(`Remove "${p.name}"?`)) deletePlace(p.id); }}><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
      <form onSubmit={onSearch} className="space-y-2 border-t border-line pt-3">
        <div className="flex gap-2">
          <input className="input w-14 text-center" value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" />
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Work" />
        </div>
        <div className="flex gap-2">
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Address or place to search" />
          <button className="btn shrink-0" disabled={busy}><Search size={15} />{busy ? '…' : 'Find'}</button>
        </div>
      </form>
      {results && (
        results.length === 0 ? <p className="text-sm text-zinc-500">No results. Try a different spelling or add the city.</p> : (
          <ul className="space-y-1">
            {results.map((r, i) => (
              <li key={i}>
                <button onClick={() => pick(r)} className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-sm text-zinc-300 hover:border-violet-500/50">
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}

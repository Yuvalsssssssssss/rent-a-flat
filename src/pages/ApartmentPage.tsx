import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BedDouble, CalendarDays, Euro, ExternalLink, Layers, MapPin, Pencil, Ruler, Trash2 } from 'lucide-react';
import { useData } from '../lib/data';
import { getScore, summarize } from '../lib/scoring';
import { formatEuro } from '../lib/format';
import ScoreRing from '../components/ScoreRing';
import PersonBar from '../components/PersonBar';
import { colorAt, personColor } from '../lib/people';
import ScoreRow from '../components/ScoreRow';
import VideoEmbed from '../components/VideoEmbed';

export default function ApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apartments, categories, members, me, scoreIndex, setScore, deleteApartment } = useData();
  const a = apartments.find((x) => x.id === id);
  if (!a) return <p className="card">Apartment not found. <Link to="/" className="text-violet-300 underline">Back</Link></p>;

  const s = summarize(a.id, categories, scoreIndex, members.map((m) => m.user_id));
  const partner = members.find((m) => m.user_id !== me);
  const facts: [ReactNode, string, string | null][] = [
    [<Euro size={12} />, 'Rent', a.rent_eur === null ? null : `${formatEuro(a.rent_eur)}/mo`],
    [<Ruler size={12} />, 'Size', a.size_m2 === null ? null : `${a.size_m2} m²`],
    [<BedDouble size={12} />, 'Rooms', a.rooms === null ? null : String(a.rooms)],
    [<Layers size={12} />, 'Floor', a.floor],
    [<CalendarDays size={12} />, 'Visited', a.visited_on],
  ];
  const shownFacts = facts.filter(([, , v]) => v !== null);
  const notes: [string, string | null, string][] = [
    ['Pros', a.pros, 'border-l-emerald-400'],
    ['Cons', a.cons, 'border-l-rose-400'],
    ['Notes', a.notes, 'border-l-zinc-500'],
  ];

  async function onDelete() {
    if (!a || !confirm(`Delete "${a.name}"? This also deletes all its scores.`)) return;
    if (await deleteApartment(a.id)) navigate('/', { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"><ArrowLeft size={16} />Ranking</Link>

      <section className="card relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{a.name}</h1>
            {a.address && <p className="mt-1 flex items-center gap-1 text-sm text-zinc-400"><MapPin size={14} className="shrink-0" />{a.address}</p>}
            <div className="mt-3 space-y-1.5">
              {members.map((m, k) => <PersonBar key={m.email} name={m.display_name} value={s.totals[k]} color={colorAt(k)} />)}
            </div>
          </div>
          <ScoreRing value={s.combined} size={92} stroke={8} />
        </div>
      </section>

      {(shownFacts.length > 0 || a.listing_url) && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shownFacts.map(([icon, label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-surface px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] tracking-wide text-zinc-500 uppercase">{icon}{label}</div>
              <div className="mt-0.5 font-medium tabular-nums">{value}</div>
            </div>
          ))}
          {a.listing_url && (
            <a href={a.listing_url} target="_blank" rel="noreferrer" className="rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:border-violet-500/50">
              <div className="flex items-center gap-1.5 text-[11px] tracking-wide text-zinc-500 uppercase"><ExternalLink size={12} />Listing</div>
              <div className="mt-0.5 font-medium text-violet-300">Open ↗</div>
            </a>
          )}
        </section>
      )}

      {a.video_urls.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Videos</h2>
          {a.video_urls.map((u, i) => <VideoEmbed key={i} url={u} />)}
        </section>
      )}

      <section className="card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Your scores</h2>
          {partner && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full" style={{ background: personColor(members, partner.user_id) }} />{partner.display_name}'s pick
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">Tap to score · tap again to clear</p>
        <ul className="divide-y divide-line">
          {categories.map((c) => (
            <ScoreRow key={c.id} category={c}
              mine={getScore(scoreIndex, a.id, c.id, me)}
              partnerScore={partner ? getScore(scoreIndex, a.id, c.id, partner.user_id) : null}
              partnerColor={personColor(members, partner?.user_id ?? null)}
              myColor={personColor(members, me)}
              onChange={(v) => setScore(a.id, c.id, v)} />
          ))}
        </ul>
      </section>

      {notes.some(([, v]) => v) && (
        <section className="grid gap-3 sm:grid-cols-3">
          {notes.map(([label, value, accent]) => value && (
            <div key={label} className={`card border-l-2 ${accent}`}>
              <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</h3>
              <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-200">{value}</p>
            </div>
          ))}
        </section>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        <Link to={`/apartment/${a.id}/edit`} className="btn"><Pencil size={15} />Edit details</Link>
        <button className="btn-ghost-danger" onClick={onDelete}><Trash2 size={15} />Delete</button>
      </div>
    </div>
  );
}

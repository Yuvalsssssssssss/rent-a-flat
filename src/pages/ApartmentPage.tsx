import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../lib/data';
import { formatTotal, getScore, scoreColor, summarize } from '../lib/scoring';
import { formatEuro } from '../lib/format';
import ScoreRow from '../components/ScoreRow';
import VideoEmbed from '../components/VideoEmbed';

export default function ApartmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apartments, categories, members, me, scoreIndex, setScore, deleteApartment } = useData();
  const a = apartments.find((x) => x.id === id);
  if (!a) return <p className="card">Apartment not found. <Link to="/" className="underline">Back</Link></p>;

  const s = summarize(a.id, categories, scoreIndex, members.map((m) => m.user_id));
  const partner = members.find((m) => m.user_id !== me);
  const facts: [string, string][] = [
    ['Rent', a.rent_eur === null ? '—' : `${formatEuro(a.rent_eur)}/mo`],
    ['Size', a.size_m2 === null ? '—' : `${a.size_m2} m²`],
    ['Rooms', a.rooms === null ? '—' : String(a.rooms)],
    ['Floor', a.floor ?? '—'],
    ['Visited', a.visited_on ?? '—'],
  ];

  async function onDelete() {
    if (!a || !confirm(`Delete "${a.name}"? This also deletes all its scores.`)) return;
    if (await deleteApartment(a.id)) navigate('/', { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{a.name}</h1>
          {a.address && <p className="text-slate-500">{a.address}</p>}
          <p className="mt-1 text-sm text-slate-700">
            {members.map((m, k) => `${m.display_name}: ${formatTotal(s.totals[k])}`).join(' · ')}
          </p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-2xl font-bold"
          style={{ background: scoreColor(s.combined === null ? null : s.combined / 10) }}>
          {formatTotal(s.combined)}
        </div>
      </div>

      <section className="card">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
          {a.listing_url && (
            <div><dt className="text-slate-500">Listing</dt><dd><a href={a.listing_url} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 underline">Open</a></dd></div>
          )}
        </dl>
      </section>

      {a.video_urls.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Videos</h2>
          {a.video_urls.map((u, i) => <VideoEmbed key={i} url={u} />)}
        </section>
      )}

      <section className="card">
        <h2 className="font-semibold">My scores</h2>
        <p className="text-xs text-slate-500">Tap a number to score, tap it again to clear. ×N = category weight.</p>
        <ul className="divide-y divide-slate-100">
          {categories.map((c) => (
            <ScoreRow key={c.id} category={c}
              mine={getScore(scoreIndex, a.id, c.id, me)}
              partnerScore={partner ? getScore(scoreIndex, a.id, c.id, partner.user_id) : null}
              partnerName={partner?.display_name}
              onChange={(v) => setScore(a.id, c.id, v)} />
          ))}
        </ul>
      </section>

      {(a.pros || a.cons || a.notes) && (
        <section className="card grid gap-4 sm:grid-cols-3">
          {([['Pros', a.pros], ['Cons', a.cons], ['Notes', a.notes]] as const).map(([k, v]) => v && (
            <div key={k}><h3 className="text-sm font-semibold text-slate-500">{k}</h3><p className="whitespace-pre-wrap">{v}</p></div>
          ))}
        </section>
      )}

      <div className="flex gap-2">
        <Link to={`/apartment/${a.id}/edit`} className="btn">Edit</Link>
        <button className="btn-danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

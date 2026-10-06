import { Link } from 'react-router-dom';
import { BedDouble, ChevronRight, Crown, Euro, Home, Plus, Ruler } from 'lucide-react';
import { useData } from '../lib/data';
import { rankSummaries, summarize } from '../lib/scoring';
import { formatEuro } from '../lib/format';
import { hasLocation, pricePerM2, walkMinutes } from '../lib/geo';
import PageHeader from '../components/PageHeader';
import ScoreRing from '../components/ScoreRing';
import PersonBar from '../components/PersonBar';
import { TagBadges } from '../components/Tags';
import { isRejected, rejectedLast } from '../lib/tags';
import { colorAt } from '../lib/people';

export default function Ranking() {
  const { apartments, categories, scoreIndex, members, places } = useData();
  const memberIds = members.map((m) => m.user_id);
  const byId = new Map(apartments.map((a) => [a.id, a]));
  const ranked = rejectedLast(
    rankSummaries(apartments.map((a) => summarize(a.id, categories, scoreIndex, memberIds))),
    (s) => isRejected(byId.get(s.apartmentId)!),
  );
  const complete = ranked.filter((s) => !s.incomplete).length;

  if (ranked.length === 0) {
    return (
      <div className="card mt-8 flex flex-col items-center gap-4 py-14 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><Home size={26} /></div>
        <div>
          <p className="font-semibold">No apartments yet</p>
          <p className="text-sm text-zinc-400">Add the first one you visited and start scoring.</p>
        </div>
        <Link to="/apartment/new" className="btn-primary"><Plus size={16} />Add apartment</Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Ranking"
        subtitle={`${ranked.length} apartment${ranked.length === 1 ? '' : 's'} · ${complete} fully scored`} />
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {ranked.map((s, i) => {
          const a = byId.get(s.apartmentId)!;
          const rejected = isRejected(a);
          const top = i === 0 && !rejected && s.combined !== null && ranked.length > 1;
          const scorers = members.filter((_, k) => s.totals[k] !== null);
          return (
            <li key={a.id}>
              <Link to={`/apartment/${a.id}`}
                className={`group relative flex h-full items-center gap-4 rounded-2xl border bg-surface p-4 transition hover:bg-surface-2 ${rejected ? 'opacity-45 grayscale' : ''} ${top ? 'border-violet-500/40 shadow-[0_12px_40px_-12px_rgb(139_92_246/0.45)]' : 'border-line'}`}>
                <ScoreRing value={s.combined} size={68} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    {s.combined !== null && !rejected && <span className="pt-0.5 text-xs font-semibold text-zinc-500 tabular-nums">#{i + 1}</span>}
                    <h2 className="line-clamp-2 min-w-0 font-semibold break-words">{a.name}</h2>
                    {top && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                        <Crown size={11} />Top
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <TagBadges apartment={a} />
                    {a.rent_eur !== null && <span className="chip"><Euro size={11} />{formatEuro(a.rent_eur).replace('€', '')}/mo</span>}
                    {a.size_m2 !== null && <span className="chip"><Ruler size={11} />{a.size_m2} m²</span>}
                    {pricePerM2(a.rent_eur, a.size_m2) !== null && <span className="chip">€{pricePerM2(a.rent_eur, a.size_m2)!.toFixed(1)}/m²</span>}
                    {a.rooms !== null && <span className="chip"><BedDouble size={11} />{a.rooms}</span>}
                    {hasLocation(a) && places.slice(0, 3).map((p) => <span key={p.id} className="chip" title={p.name}>{p.emoji} {walkMinutes(a, p)}′</span>)}
                  </div>
                  <div className="mt-2.5 space-y-1">
                    {members.map((m, k) => <PersonBar key={m.email} name={m.display_name} value={s.totals[k]} color={colorAt(k)} />)}
                  </div>
                  {s.incomplete && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {scorers.length === 1 && members.length > 1 ? `Only ${scorers[0].display_name} scored so far` : 'Not fully scored'}
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-400" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

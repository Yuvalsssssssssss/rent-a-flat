import { Link } from 'react-router-dom';
import { Crown, Zap } from 'lucide-react';
import { useData } from '../lib/data';
import { average, formatTotal, getScore, isDisagreement, rankSummaries, scoreTone, summarize } from '../lib/scoring';
import { formatEuro } from '../lib/format';
import { hasLocation, pricePerM2, walkMinutes } from '../lib/geo';
import PageHeader from '../components/PageHeader';
import PersonScores from '../components/PersonScores';
import { colorAt, initial } from '../lib/people';

const stickyCell = 'sticky left-0 z-10 bg-surface px-3 py-2 text-left break-words';

/** Indexes of the best values (ties included); empty when there's nothing to compare. */
function bestOf(values: (number | null)[], prefer: 'high' | 'low'): Set<number> {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2 || new Set(present).size === 1) return new Set();
  const best = prefer === 'high' ? Math.max(...present) : Math.min(...present);
  return new Set(values.flatMap((v, i) => (v === best ? [i] : [])));
}

export default function Compare() {
  const { apartments, categories, scoreIndex, members, places } = useData();
  const memberIds = members.map((m) => m.user_id);
  const summaries = rankSummaries(apartments.map((a) => summarize(a.id, categories, scoreIndex, memberIds)));
  const byId = new Map(apartments.map((a) => [a.id, a]));
  const cols = summaries.map((s) => byId.get(s.apartmentId)!);

  if (cols.length === 0) {
    return <p className="card mt-8 text-center text-zinc-400">Add apartments to compare them.</p>;
  }

  const bestRent = bestOf(cols.map((a) => a.rent_eur), 'low');
  const bestSize = bestOf(cols.map((a) => a.size_m2), 'high');
  const ppm = cols.map((a) => pricePerM2(a.rent_eur, a.size_m2));
  const walks = places.map((p) => cols.map((a) => (hasLocation(a) ? walkMinutes(a, p) : null)));
  const bestTotal = bestOf(summaries.map((s) => s.combined), 'high');

  return (
    <div>
      <PageHeader title="Compare"
        subtitle={<>Big number = average. {members.map((m, k) => <span key={m.email}><b style={{ color: colorAt(k) }}>{initial(m.display_name)}</b> = {m.display_name}. </span>)}<Zap size={12} className="inline text-amber-400" /> = 3+ apart. <Crown size={12} className="inline text-violet-300" /> = best in row.</>} />
      <div className="max-h-[calc(100dvh-14rem)] overflow-auto overscroll-contain rounded-2xl border border-line bg-surface sm:max-h-[calc(100dvh-12rem)]">
        <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: `${9 + cols.length * 8}rem` }}>
          <colgroup>
            <col className="w-36 sm:w-52" />
            {cols.map((a) => <col key={a.id} />)}
          </colgroup>
          <thead>
            <tr>
              <th className={`${stickyCell} top-0 z-30 border-b border-line align-middle text-xs font-medium text-zinc-500 uppercase`}>Category</th>
              {cols.map((a) => (
                <th key={a.id} className="sticky top-0 z-20 border-b border-line bg-surface px-2 py-3 text-center align-middle font-semibold leading-snug break-words">
                  <Link to={`/apartment/${a.id}`} className="hover:text-violet-300">{a.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line">
              <th className={`${stickyCell} font-semibold`}>Total</th>
              {summaries.map((s, i) => {
                const tone = scoreTone(s.combined === null ? null : s.combined / 10);
                return (
                  <td key={s.apartmentId} className="p-1.5">
                    <div className={`relative rounded-xl px-2 py-2 text-center ${bestTotal.has(i) ? 'ring-1 ring-violet-400/60' : ''}`} style={{ background: tone.bg }}>
                      <div className="text-xl font-semibold tabular-nums" style={{ color: tone.fg }}>{formatTotal(s.combined)}</div>
                      <PersonScores members={members} values={s.totals.map((t) => (t === null ? null : formatTotal(t)))} />
                      {bestTotal.has(i) && <Crown size={14} className="absolute top-1.5 right-2 text-violet-300" />}
                    </div>
                  </td>
                );
              })}
            </tr>
            <FactRow label="Rent" values={cols.map((a) => formatEuro(a.rent_eur))} best={bestRent} />
            <FactRow label="Size" values={cols.map((a) => (a.size_m2 === null ? '—' : `${a.size_m2} m²`))} best={bestSize} />
            <FactRow label="€ / m²" values={ppm.map((v) => (v === null ? '—' : `€${v.toFixed(1)}`))} best={bestOf(ppm, 'low')} />
            {places.map((p, pi) => (
              <FactRow key={p.id} label={`${p.emoji} ${p.name}`} values={walks[pi].map((v) => (v === null ? '—' : `~${v} min`))} best={bestOf(walks[pi], 'low')} />
            ))}
            {categories.map((c) => {
              const cells = cols.map((a) => memberIds.map((u) => getScore(scoreIndex, a.id, c.id, u)));
              const best = bestOf(cells.map(average), 'high');
              return (
                <tr key={c.id} className={`border-t border-line ${c.weight === 0 ? 'opacity-40' : ''}`}>
                  <th className={`${stickyCell} font-medium`}>
                    {c.name} <span className="text-xs font-normal text-zinc-500">×{c.weight}</span>
                  </th>
                  {cells.map((values, i) => {
                    const tone = scoreTone(average(values));
                    return (
                      <td key={cols[i].id} className="p-1.5">
                        <div className={`relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 ${best.has(i) ? 'ring-1 ring-violet-400/60' : ''}`}
                          style={{ background: tone.bg }}>
                          <span className="flex items-center gap-1 text-base font-semibold tabular-nums" style={{ color: tone.fg }}>
                            {formatAverage(average(values))}
                            {isDisagreement(values) && <Zap size={12} className="text-amber-400" />}
                          </span>
                          <PersonScores members={members} values={values} />
                          {best.has(i) && <Crown size={12} className="absolute top-1 right-1.5 text-violet-300" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatAverage(v: number | null): string {
  return v === null ? '—' : String(Math.round(v * 10) / 10);
}

function FactRow({ label, values, best }: { label: string; values: string[]; best: Set<number> }) {
  return (
    <tr className="border-t border-line">
      <th className={`${stickyCell} font-medium text-zinc-300`}>{label}</th>
      {values.map((v, i) => (
        <td key={i} className={`px-2 py-2.5 text-center tabular-nums ${best.has(i) ? 'font-semibold text-emerald-300' : 'text-zinc-300'}`}>
          <span className="inline-flex items-center gap-1">{v}{best.has(i) && <Crown size={12} className="text-violet-300" />}</span>
        </td>
      ))}
    </tr>
  );
}

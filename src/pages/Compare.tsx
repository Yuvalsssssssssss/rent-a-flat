import { Link } from 'react-router-dom';
import { Crown, Zap } from 'lucide-react';
import { useData } from '../lib/data';
import { average, formatTotal, getScore, isDisagreement, rankSummaries, scoreTone, summarize } from '../lib/scoring';
import { formatEuro } from '../lib/format';
import PageHeader from '../components/PageHeader';

const stickyCell = 'sticky left-0 z-10 bg-surface px-3 py-2 text-left';

/** Indexes of the best values (ties included); empty when there's nothing to compare. */
function bestOf(values: (number | null)[], prefer: 'high' | 'low'): Set<number> {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2 || new Set(present).size === 1) return new Set();
  const best = prefer === 'high' ? Math.max(...present) : Math.min(...present);
  return new Set(values.flatMap((v, i) => (v === best ? [i] : [])));
}

export default function Compare() {
  const { apartments, categories, scoreIndex, members } = useData();
  const memberIds = members.map((m) => m.user_id);
  const summaries = rankSummaries(apartments.map((a) => summarize(a.id, categories, scoreIndex, memberIds)));
  const byId = new Map(apartments.map((a) => [a.id, a]));
  const cols = summaries.map((s) => byId.get(s.apartmentId)!);

  if (cols.length === 0) {
    return <p className="card mt-8 text-center text-zinc-400">Add apartments to compare them.</p>;
  }

  const bestRent = bestOf(cols.map((a) => a.rent_eur), 'low');
  const bestSize = bestOf(cols.map((a) => a.size_m2), 'high');
  const bestTotal = bestOf(summaries.map((s) => s.combined), 'high');

  return (
    <div>
      <PageHeader title="Compare"
        subtitle={<>Cells show {members.map((m) => m.display_name).join(' · ')}. <Zap size={12} className="inline text-amber-400" /> = 3+ apart. <Crown size={12} className="inline text-violet-300" /> = best in row.</>} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${stickyCell} text-xs font-medium text-zinc-500 uppercase`}>Category</th>
              {cols.map((a) => (
                <th key={a.id} className="min-w-28 px-2 py-3 text-center font-semibold">
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
                    <div className={`rounded-xl px-2 py-2 text-center ${bestTotal.has(i) ? 'ring-1 ring-violet-400/60' : ''}`} style={{ background: tone.bg }}>
                      <div className="text-xl font-semibold tabular-nums" style={{ color: tone.fg }}>{formatTotal(s.combined)}</div>
                      <div className="text-[11px] text-zinc-400 tabular-nums">{s.totals.map(formatTotal).join(' · ')}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
            <FactRow label="Rent" values={cols.map((a) => formatEuro(a.rent_eur))} best={bestRent} />
            <FactRow label="Size" values={cols.map((a) => (a.size_m2 === null ? '—' : `${a.size_m2} m²`))} best={bestSize} />
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
                        <div className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 font-medium tabular-nums ${best.has(i) ? 'ring-1 ring-violet-400/60' : ''}`}
                          style={{ background: tone.bg, color: tone.fg }}>
                          {values.map((v) => v ?? '–').join(' · ')}
                          {isDisagreement(values) && <Zap size={12} className="text-amber-400" />}
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

function FactRow({ label, values, best }: { label: string; values: string[]; best: Set<number> }) {
  return (
    <tr className="border-t border-line">
      <th className={`${stickyCell} font-medium text-zinc-300`}>{label}</th>
      {values.map((v, i) => (
        <td key={i} className={`px-2 py-2.5 text-center tabular-nums ${best.has(i) ? 'font-semibold text-emerald-300' : 'text-zinc-300'}`}>{v}</td>
      ))}
    </tr>
  );
}

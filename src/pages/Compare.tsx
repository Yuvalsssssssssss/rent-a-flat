import { Link } from 'react-router-dom';
import { useData } from '../lib/data';
import { average, formatTotal, getScore, isDisagreement, rankSummaries, scoreColor, summarize } from '../lib/scoring';
import { formatEuro } from '../lib/format';

const stickyCell = 'sticky left-0 z-10 bg-white p-2 text-left';

export default function Compare() {
  const { apartments, categories, scoreIndex, members } = useData();
  const memberIds = members.map((m) => m.user_id);
  const summaries = rankSummaries(apartments.map((a) => summarize(a.id, categories, scoreIndex, memberIds)));
  const byId = new Map(apartments.map((a) => [a.id, a]));
  const cols = summaries.map((s) => byId.get(s.apartmentId)!);

  if (cols.length === 0) {
    return <p className="card text-center text-slate-500">Add apartments to compare them.</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Compare</h1>
      <p className="mb-3 text-sm text-slate-500">
        Cells show {members.map((m) => m.display_name).join(' / ')}. ⚡ = you disagree by 3+. ×N = category weight.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${stickyCell} font-medium text-slate-500`}>Category</th>
              {cols.map((a) => (
                <th key={a.id} className="min-w-28 p-2 text-center font-semibold">
                  <Link to={`/apartment/${a.id}`} className="hover:underline">{a.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200">
              <th className={`${stickyCell} font-bold`}>Total</th>
              {summaries.map((s) => (
                <td key={s.apartmentId} className="p-2 text-center" style={{ background: scoreColor(s.combined === null ? null : s.combined / 10) }}>
                  <div className="text-lg font-bold">{formatTotal(s.combined)}</div>
                  <div className="text-xs text-slate-600">{s.totals.map(formatTotal).join(' / ')}</div>
                </td>
              ))}
            </tr>
            <tr className="border-t border-slate-200">
              <th className={`${stickyCell} font-medium`}>Rent</th>
              {cols.map((a) => <td key={a.id} className="p-2 text-center">{formatEuro(a.rent_eur)}</td>)}
            </tr>
            <tr className="border-t border-slate-200">
              <th className={`${stickyCell} font-medium`}>Size</th>
              {cols.map((a) => <td key={a.id} className="p-2 text-center">{a.size_m2 === null ? '—' : `${a.size_m2} m²`}</td>)}
            </tr>
            {categories.map((c) => (
              <tr key={c.id} className={`border-t border-slate-200 ${c.weight === 0 ? 'opacity-50' : ''}`}>
                <th className={`${stickyCell} font-medium`}>
                  {c.name} <span className="text-xs font-normal text-slate-400">×{c.weight}</span>
                </th>
                {cols.map((a) => {
                  const values = memberIds.map((u) => getScore(scoreIndex, a.id, c.id, u));
                  return (
                    <td key={a.id} className="p-2 text-center tabular-nums" style={{ background: scoreColor(average(values)) }}>
                      {values.map((v) => v ?? '–').join(' / ')}{isDisagreement(values) && ' ⚡'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

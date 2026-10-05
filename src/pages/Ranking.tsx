import { Link } from 'react-router-dom';
import { useData } from '../lib/data';
import { formatTotal, rankSummaries, scoreColor, summarize } from '../lib/scoring';
import { formatFacts } from '../lib/format';

export default function Ranking() {
  const { apartments, categories, scoreIndex, members } = useData();
  const memberIds = members.map((m) => m.user_id);
  const ranked = rankSummaries(apartments.map((a) => summarize(a.id, categories, scoreIndex, memberIds)));
  const byId = new Map(apartments.map((a) => [a.id, a]));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Ranking</h1>
        <Link to="/apartment/new" className="btn-primary">+ Add apartment</Link>
      </div>
      {ranked.length === 0 ? (
        <p className="card text-center text-slate-500">No apartments yet. Add the first one you visited.</p>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2">
          {ranked.map((s, i) => {
            const a = byId.get(s.apartmentId)!;
            const scoredBy = s.totals.filter((t) => t !== null).length;
            return (
              <li key={a.id}>
                <Link to={`/apartment/${a.id}`} className="card flex items-center gap-4 transition hover:border-indigo-300">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-2xl font-bold"
                    style={{ background: scoreColor(s.combined === null ? null : s.combined / 10) }}>
                    {formatTotal(s.combined)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      {s.combined !== null && <span className="text-sm text-slate-400">#{i + 1}</span>}
                      <h2 className="truncate font-semibold">{a.name}</h2>
                    </div>
                    {formatFacts(a) && <p className="text-sm text-slate-500">{formatFacts(a)}</p>}
                    <p className="text-sm text-slate-700">
                      {members.map((m, k) => `${m.display_name} ${formatTotal(s.totals[k])}`).join(' · ')}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {scoredBy === 1 && members.length > 1 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">Only 1 of {members.length} scored</span>}
                      {s.incomplete && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Not fully scored</span>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

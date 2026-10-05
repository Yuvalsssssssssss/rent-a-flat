import { scoreColor } from '../lib/scoring';
import type { Category } from '../lib/types';

type Props = {
  category: Category;
  mine: number | null;
  partnerScore: number | null;
  partnerName?: string;
  onChange: (score: number | null) => void;
};

export default function ScoreRow({ category, mine, partnerScore, partnerName, onChange }: Props) {
  return (
    <li className="py-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-medium">
          {category.name}
          <span className="ml-1 text-xs font-normal text-slate-400">×{category.weight}</span>
        </span>
        {partnerName && (
          <span className="text-xs text-slate-500">{partnerName}: <b className="text-slate-800">{partnerScore ?? '–'}</b></span>
        )}
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = mine === n;
          return (
            <button key={n} type="button" aria-pressed={selected}
              onClick={() => onChange(selected ? null : n)}
              className={`h-10 rounded-md text-sm font-semibold tabular-nums ${selected ? 'text-slate-900 ring-2 ring-slate-800' : 'bg-slate-100 text-slate-600'}`}
              style={selected ? { background: scoreColor(n) } : undefined}>
              {n}
            </button>
          );
        })}
      </div>
    </li>
  );
}

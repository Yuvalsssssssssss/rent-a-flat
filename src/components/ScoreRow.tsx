import { scoreTone } from '../lib/scoring';
import type { Category } from '../lib/types';
import WeightPips from './WeightPips';

type Props = {
  category: Category;
  mine: number | null;
  partnerScore: number | null;
  partnerColor: string;
  myColor: string;
  onChange: (score: number | null) => void;
};

export default function ScoreRow({ category, mine, partnerScore, partnerColor, myColor, onChange }: Props) {
  return (
    <li className="py-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{category.name}</span>
        <WeightPips weight={category.weight} />
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = mine === n;
          return (
            <button key={n} type="button" aria-pressed={selected} aria-label={`${category.name} ${n}`}
              onClick={() => onChange(selected ? null : n)}
              className={`relative h-10 rounded-lg text-sm font-semibold tabular-nums transition active:scale-90 ${selected ? 'text-zinc-950 shadow-lg' : 'bg-surface-2 text-zinc-400 hover:text-zinc-100'}`}
              style={selected ? { background: scoreTone(n).fg, boxShadow: `0 0 0 2px ${myColor}` } : undefined}>
              {n}
              {partnerScore === n && (
                <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ring-2 ring-surface" style={{ background: partnerColor }} />
              )}
            </button>
          );
        })}
      </div>
    </li>
  );
}

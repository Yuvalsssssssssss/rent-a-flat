import { formatTotal, scoreTone } from '../lib/scoring';

/** One person's 0–100 total as a slim bar. */
export default function PersonBar({ name, value, color }: { name: string; value: number | null; color: string }) {
  const tone = scoreTone(value === null ? null : value / 10);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex w-20 items-center gap-1.5 truncate text-zinc-300"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />{name}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${value ?? 0}%`, background: tone.fg }} />
      </div>
      <span className="w-6 text-right font-semibold tabular-nums" style={{ color: tone.fg }}>{formatTotal(value)}</span>
    </div>
  );
}

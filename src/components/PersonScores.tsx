import type { Member } from '../lib/types';
import { colorAt, initial } from '../lib/people';

/** "Y 9 · M –" with each initial in that person's color. */
export default function PersonScores({ members, values }: { members: Member[]; values: (string | number | null)[] }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs tabular-nums">
      {members.map((m, k) => (
        <span key={m.email} className="inline-flex items-center gap-1">
          <span className="font-semibold" style={{ color: colorAt(k) }}>{initial(m.display_name)}</span>
          <span className="text-zinc-300">{values[k] ?? '–'}</span>
        </span>
      ))}
    </span>
  );
}

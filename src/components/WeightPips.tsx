/** Five small bars showing a 0–5 weight. */
export default function WeightPips({ weight }: { weight: number }) {
  if (weight === 0) return <span className="text-[11px] text-zinc-500">ignored</span>;
  return (
    <span className="flex items-end gap-0.5" title={`Weight ${weight} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`w-1 rounded-full ${n <= weight ? 'bg-violet-400' : 'bg-white/10'}`} style={{ height: 4 + n * 2 }} />
      ))}
    </span>
  );
}

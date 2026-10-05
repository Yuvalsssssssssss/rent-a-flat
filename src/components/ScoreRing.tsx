import { formatTotal, scoreTone } from '../lib/scoring';

/** Circular gauge for a 0–100 total. */
export default function ScoreRing({ value, size = 64, stroke = 6 }: { value: number | null; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const tone = scoreTone(value === null ? null : value / 10);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone.fg} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-semibold tracking-tight tabular-nums"
        style={{ fontSize: size * 0.3, color: tone.fg }}>
        {formatTotal(value)}
      </span>
    </div>
  );
}

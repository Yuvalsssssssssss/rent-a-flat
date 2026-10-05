type Props = { text: string; action?: { label: string; onClick: () => void } };

export default function FullScreenMessage({ text, action }: Props) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-linear-to-br from-violet-500 to-cyan-400 text-xl">🏠</div>
        <p className="text-sm text-zinc-400">{text}</p>
        {action && <button className="btn" onClick={action.onClick}>{action.label}</button>}
      </div>
    </div>
  );
}

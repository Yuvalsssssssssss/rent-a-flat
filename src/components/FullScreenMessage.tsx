type Props = { text: string; action?: { label: string; onClick: () => void } };

export default function FullScreenMessage({ text, action }: Props) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="space-y-3">
        <p className="text-slate-600">{text}</p>
        {action && <button className="btn" onClick={action.onClick}>{action.label}</button>}
      </div>
    </div>
  );
}

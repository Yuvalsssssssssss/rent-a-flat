import { ExternalLink } from 'lucide-react';
import { toEmbed } from '../lib/video';

export default function VideoEmbed({ url }: { url: string }) {
  const embed = toEmbed(url);
  if (embed.kind === 'link') {
    return (
      <a href={embed.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-violet-300 hover:bg-zinc-800">
        <ExternalLink size={14} className="shrink-0" />{embed.url}
      </a>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="aspect-video overflow-hidden rounded-xl border border-line bg-black">
        <iframe src={embed.embedUrl} title="Apartment video" className="h-full w-full"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
        <ExternalLink size={11} />Open original
      </a>
    </div>
  );
}

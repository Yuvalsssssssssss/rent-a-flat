import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { toEmbed } from '../lib/video';

const isWide = () => window.matchMedia('(min-width: 640px)').matches;

/**
 * Thumbnail card with a play button. On desktop it swaps to an inline player;
 * on phones it opens the video in Drive/YouTube, whose own players work far better there.
 */
export default function VideoEmbed({ url }: { url: string }) {
  const embed = toEmbed(url);
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  if (embed.kind === 'link') {
    return (
      <a href={embed.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-violet-300 hover:bg-zinc-800">
        <ExternalLink size={14} className="shrink-0" />{embed.url}
      </a>
    );
  }

  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border border-line bg-black">
        <iframe src={`${embed.embedUrl}${embed.kind === 'youtube' ? '?autoplay=1' : ''}`} title="Apartment video" className="h-full w-full"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer"
      onClick={(e) => { if (isWide()) { e.preventDefault(); setPlaying(true); } }}
      className="group relative block aspect-video overflow-hidden rounded-xl border border-line bg-linear-to-br from-zinc-800 to-zinc-900">
      {!thumbFailed && (
        <img src={embed.thumbUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setThumbFailed(true)}
          className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.02] group-hover:opacity-100" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute top-1/2 left-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition group-hover:scale-110 group-active:scale-95">
        <Play size={24} className="translate-x-0.5 fill-white" />
      </span>
      <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 text-xs font-medium text-white/90">
        {embed.kind === 'drive' ? 'Google Drive' : 'YouTube'}<ExternalLink size={11} className="sm:hidden" />
      </span>
    </a>
  );
}

import { toEmbed } from '../lib/video';

export default function VideoEmbed({ url }: { url: string }) {
  const embed = toEmbed(url);
  if (embed.kind === 'link') {
    return <a href={embed.url} target="_blank" rel="noreferrer" className="break-all text-indigo-600 underline">Open link: {embed.url}</a>;
  }
  return (
    <div className="space-y-1">
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe src={embed.embedUrl} title="Apartment video" className="h-full w-full"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">Open original</a>
    </div>
  );
}

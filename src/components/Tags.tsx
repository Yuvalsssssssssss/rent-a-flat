import { Ban, Eye, Handshake, type LucideIcon } from 'lucide-react';
import { useData } from '../lib/data';
import { TAG_IDS, tagsOf, toggleTag, type TagId } from '../lib/tags';
import type { Apartment } from '../lib/types';

const TAG_STYLE: Record<TagId, { label: string; icon: LucideIcon; on: string }> = {
  visited: { label: 'Visited', icon: Eye, on: 'bg-sky-500/15 text-sky-300 ring-sky-500/40' },
  negotiating: { label: 'In negotiation', icon: Handshake, on: 'bg-amber-500/15 text-amber-300 ring-amber-500/40' },
  rejected: { label: 'Rejected', icon: Ban, on: 'bg-rose-500/15 text-rose-300 ring-rose-500/40' },
};

/** Tappable tag toggles for the apartment page. */
export function TagToggles({ apartment }: { apartment: Apartment }) {
  const { setTags } = useData();
  const tags = tagsOf(apartment);
  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_IDS.map((id) => {
        const { label, icon: Icon, on } = TAG_STYLE[id];
        const active = tags.includes(id);
        return (
          <button key={id} type="button" aria-pressed={active} onClick={() => setTags(apartment.id, toggleTag(tags, id))}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition active:scale-95 ${active ? on : 'text-zinc-500 ring-line hover:text-zinc-300'}`}>
            <Icon size={13} />{label}
          </button>
        );
      })}
    </div>
  );
}

/** Read-only badges for the active tags. */
export function TagBadges({ apartment }: { apartment: Pick<Apartment, 'tags'> }) {
  const tags = tagsOf(apartment).filter((t): t is TagId => t in TAG_STYLE);
  if (tags.length === 0) return null;
  return (
    <>
      {tags.map((id) => {
        const { label, icon: Icon, on } = TAG_STYLE[id];
        return (
          <span key={id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${on}`}>
            <Icon size={11} />{label}
          </span>
        );
      })}
    </>
  );
}

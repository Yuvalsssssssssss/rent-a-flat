export type VideoEmbed =
  | { kind: 'drive' | 'youtube'; embedUrl: string; thumbUrl: string }
  | { kind: 'link'; url: string };

export function toEmbed(raw: string): VideoEmbed {
  const url = raw.trim();
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { kind: 'link', url };
  }
  const host = u.hostname.replace(/^(www|m)\./, '');

  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1]
      ?? (u.pathname === '/open' ? u.searchParams.get('id') : null);
    if (id) return { kind: 'drive', embedUrl: `https://drive.google.com/file/d/${id}/preview`, thumbUrl: `https://drive.google.com/thumbnail?id=${id}&sz=w1000` };
  }

  let ytId: string | null = null;
  if (host === 'youtu.be') ytId = u.pathname.split('/')[1] || null;
  if (host === 'youtube.com') {
    ytId = u.searchParams.get('v')
      ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]
      ?? null;
  }
  if (ytId) return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytId}`, thumbUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` };

  return { kind: 'link', url };
}

import { describe, expect, it } from 'vitest';
import { toEmbed } from './video';

describe('toEmbed', () => {
  it('handles Google Drive file links', () => {
    expect(toEmbed('https://drive.google.com/file/d/ABC_123-x/view?usp=sharing')).toEqual({
      kind: 'drive', embedUrl: 'https://drive.google.com/file/d/ABC_123-x/preview',
      thumbUrl: 'https://drive.google.com/thumbnail?id=ABC_123-x&sz=w1000',
    });
    expect(toEmbed('https://drive.google.com/open?id=XYZ')).toEqual({
      kind: 'drive', embedUrl: 'https://drive.google.com/file/d/XYZ/preview',
      thumbUrl: 'https://drive.google.com/thumbnail?id=XYZ&sz=w1000',
    });
  });
  it('handles YouTube links', () => {
    const embed = {
      kind: 'youtube', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    };
    expect(toEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3')).toEqual(embed);
    expect(toEmbed('https://youtu.be/dQw4w9WgXcQ?si=abc')).toEqual(embed);
    expect(toEmbed('https://youtube.com/shorts/dQw4w9WgXcQ')).toEqual(embed);
    expect(toEmbed('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual(embed);
  });
  it('falls back to a plain link', () => {
    expect(toEmbed(' https://example.com/x ')).toEqual({ kind: 'link', url: 'https://example.com/x' });
    expect(toEmbed('not a url')).toEqual({ kind: 'link', url: 'not a url' });
  });
});

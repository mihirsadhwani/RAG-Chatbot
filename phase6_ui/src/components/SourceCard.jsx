import { ExternalLink, Link2 } from 'lucide-react';
import { trackEvent } from '../services/api';

export default function SourceCard({ url }) {
  if (!url) return null;

  let displayName = url;
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
    displayName = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch {
    displayName = url;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('source_click', url)}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors"
    >
      <Link2 className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[240px]">{displayName}</span>
      <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
    </a>
  );
}

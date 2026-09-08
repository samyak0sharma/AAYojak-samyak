import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { EventSummary } from '../../api/events';
import { Dialog } from '../ui/Dialog';
import { ImageWithFallback } from '../ui/ImageWithFallback';

type EventMedia = EventSummary['media'][number];

export function EventGallery({ media, title }: { media: EventMedia[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const close = () => setActiveIndex(null);
  const move = (direction: -1 | 1) => {
    if (activeIndex === null || media.length < 2) return;
    setActiveIndex((activeIndex + direction + media.length) % media.length);
  };

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, media.length]);

  if (!media.length) return null;
  const active = activeIndex === null ? undefined : media[activeIndex];
  return <section className="detail-section event-gallery" aria-labelledby="gallery-heading"><div className="detail-section-heading"><h2 id="gallery-heading">Gallery</h2><span>{media.length} {media.length === 1 ? 'item' : 'items'}</span></div><div className="gallery-grid">{media.map((item, index) => item.mediaType === 'VIDEO' ? <button type="button" className="gallery-tile gallery-video" key={item.id} onClick={() => setActiveIndex(index)} aria-label={`Open video ${index + 1}`}><video src={item.url} muted playsInline preload="metadata" aria-label={item.altText ?? `${title} video ${index + 1}`} /><span className="gallery-expand"><Expand size={16} /></span></button> : <button type="button" className="gallery-tile" key={item.id} onClick={() => setActiveIndex(index)} aria-label={`Open image ${index + 1}`}><ImageWithFallback src={item.url} alt={item.altText ?? `${title} gallery image ${index + 1}`} loading="lazy" /><span className="gallery-expand"><Expand size={16} /></span></button>)}</div><Dialog open={activeIndex !== null} title={active?.altText ?? title} onClose={close}>{active ? <div className="lightbox"><div className="lightbox-media">{active.mediaType === 'VIDEO' ? <video src={active.url} controls autoPlay playsInline aria-label={active.altText ?? title} /> : <ImageWithFallback src={active.url} alt={active.altText ?? title} />}</div><div className="lightbox-controls"><button type="button" className="icon-button" onClick={() => move(-1)} aria-label="Previous gallery item" disabled={media.length < 2}><ChevronLeft size={20} /></button><span>{(activeIndex ?? 0) + 1} / {media.length}</span><button type="button" className="icon-button" onClick={() => move(1)} aria-label="Next gallery item" disabled={media.length < 2}><ChevronRight size={20} /></button><button type="button" className="icon-button" onClick={close} aria-label="Close gallery"><X size={18} /></button></div></div> : null}</Dialog></section>;
}

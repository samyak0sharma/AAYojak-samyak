import { ExternalLink, MapPinned } from 'lucide-react';

export function EventMap({ venueName, address, latitude, longitude }: { venueName: string; address: string; latitude?: number | null; longitude?: number | null }) {
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';
  const mapUrl = hasCoordinates ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${venueName}, ${address}`)}`;
  const embedUrl = hasCoordinates ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude! - 0.012},${latitude! - 0.009},${longitude! + 0.012},${latitude! + 0.009}&layer=mapnik&marker=${latitude},${longitude}` : undefined;
  return <section className="detail-section location-section" aria-labelledby="location-heading"><div className="detail-section-heading"><h2 id="location-heading">Location</h2><a className="text-link" href={mapUrl} target="_blank" rel="noreferrer">Open map <ExternalLink size={14} /></a></div><div className="location-summary"><MapPinned size={19} /><div><strong>{venueName}</strong><span>{address}</span></div></div>{embedUrl ? <iframe className="event-map" title={`Map showing ${venueName}`} src={embedUrl} loading="lazy" /> : <div className="map-fallback"><MapPinned size={18} /><p>Map coordinates are not available yet. Use the address above to find this venue.</p></div>}</section>;
}

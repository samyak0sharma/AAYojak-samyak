import { motion, useReducedMotion } from 'framer-motion';
import type { EventSummary } from '../../api/events';
import { EventCard } from './EventCard';

export function EventGrid({ events, list = false }: { events: EventSummary[]; list?: boolean }) {
  const reduceMotion = useReducedMotion();
  return <div className={list ? 'event-grid event-list' : 'event-grid'}>{events.map((event, index) => <motion.div key={event.id} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: Math.min(index * 0.035, 0.2) }}><EventCard event={event} compact={list} /></motion.div>)}</div>;
}

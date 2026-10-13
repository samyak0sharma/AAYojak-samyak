import { useState } from 'react';
import { Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEventReview } from '../../api/reviews';
import { Button, Input } from '../ui';

export function ReviewForm({ eventId }: { eventId: string }) {
  const client = useQueryClient(); const [rating, setRating] = useState(5); const [comment, setComment] = useState(''); const [message, setMessage] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: () => createEventReview(eventId, { rating, comment }), onSuccess: () => { setComment(''); setMessage('Review submitted for moderation.'); void client.invalidateQueries({ queryKey: ['event-reviews', eventId] }); }, onError: (error) => setMessage(error instanceof Error ? error.message : 'Review submission failed.') });
  return <form className="review-form" onSubmit={(event) => { event.preventDefault(); setMessage(null); mutation.mutate(); }}><label className="field"><span className="field-label">Rating</span><select className="input" value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><Input label="Your review" value={comment} onChange={(event) => setComment(event.target.value)} required minLength={3} maxLength={5000} placeholder="Share your experience" /><Button loading={mutation.isPending} disabled={!comment.trim()}>Submit review</Button>{message ? <small className="form-note"><Star size={13} /> {message}</small> : null}</form>;
}

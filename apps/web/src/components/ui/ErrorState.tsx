import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({ title = 'Something went off beat', description, onRetry }: { title?: string; description: string; onRetry?: () => void }) {
  return (
    <div className="state-card state-error" role="alert">
      <span className="state-icon"><AlertTriangle size={20} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw size={15} /> Try again</Button> : null}
    </div>
  );
}


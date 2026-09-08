import { useState, type ImgHTMLAttributes } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export function ImageWithFallback({ alt, className = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  if (failed || !props.src) {
    return <div className={`image-fallback ${className}`.trim()} role="img" aria-label={alt}><ImageIcon size={24} /></div>;
  }
  return <img {...props} alt={alt} className={className} onError={() => setFailed(true)} />;
}


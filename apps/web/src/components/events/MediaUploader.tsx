import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadMedia } from '../../api/uploads';
import { Button } from '../ui';

export function MediaUploader({ onUploaded }: { onUploaded: (media: { url: string; mediaType: 'IMAGE' | 'VIDEO' }) => void }) {
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const choose = async (file: File | undefined) => { if (!file) return; const limit = file.type.startsWith('video/') ? 50 : 10; if (file.size > limit * 1024 * 1024) { setError(`Choose a file smaller than ${limit} MB.`); if (input.current) input.current.value = ''; return; } setBusy(true); setError(null); try { onUploaded(await uploadMedia(file)); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'The media upload failed.'); } finally { setBusy(false); if (input.current) input.current.value = ''; } };
  return <div className="media-uploader"><input ref={input} hidden type="file" accept="image/*,video/*" onChange={(event) => void choose(event.target.files?.[0])} /><Button type="button" variant="outline" loading={busy} onClick={() => input.current?.click()}><Upload size={15} /> Upload media</Button>{error ? <span className="field-error">{error}</span> : <span className="form-note">Uploads are stored in your organizer media folder.</span>}</div>;
}

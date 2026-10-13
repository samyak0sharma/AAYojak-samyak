import { apiRequest } from './client';

interface UploadSignature { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; resourceType: 'image' | 'video' }
interface CloudinaryUploadResponse { secure_url: string; public_id: string; resource_type: 'image' | 'video' }

export async function uploadMedia(file: File) {
  const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
  const signature = await apiRequest<UploadSignature>('/uploads/sign', { method: 'POST', body: JSON.stringify({ resourceType }) });
  const form = new FormData(); form.append('file', file); form.append('api_key', signature.apiKey); form.append('timestamp', String(signature.timestamp)); form.append('signature', signature.signature); form.append('folder', signature.folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/${resourceType}/upload`, { method: 'POST', body: form });
  const payload = await response.json().catch(() => null) as CloudinaryUploadResponse | { error?: { message?: string } } | null;
  if (!response.ok || !payload || !('secure_url' in payload)) {
    const message = payload && 'error' in payload ? payload.error?.message : undefined;
    throw new Error(message ?? 'The media upload failed.');
  }
  return { url: payload.secure_url, publicId: payload.public_id, mediaType: payload.resource_type === 'video' ? 'VIDEO' as const : 'IMAGE' as const };
}

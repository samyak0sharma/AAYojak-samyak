import { createHash } from 'node:crypto';
import { AppError } from '../../lib/http.js';
import { env } from '../../config/env.js';

export function createUploadSignature(userId: string, input: { resourceType: 'image' | 'video' }) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) throw new AppError(503, 'MEDIA_PROVIDER_NOT_CONFIGURED', 'Media uploads are not configured on this server.');
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `aayojak/events/${userId}`;
  const params = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(`${params}${env.CLOUDINARY_API_SECRET}`).digest('hex');
  return { cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, timestamp, signature, folder, resourceType: input.resourceType };
}

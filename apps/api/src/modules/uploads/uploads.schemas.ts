import { z } from 'zod';

export const uploadSignatureSchema = z.object({
  resourceType: z.enum(['image', 'video']).default('image'),
});

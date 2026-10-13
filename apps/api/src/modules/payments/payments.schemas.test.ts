import { describe, expect, it } from 'vitest';
import { khaltiCallbackSchema, paymentProviderSchema, refundPaymentSchema } from './payments.schemas.js';

describe('payment request validation', () => {
  it('accepts supported providers and rejects arbitrary provider values', () => {
    expect(paymentProviderSchema.safeParse({ provider: 'KHALTI' }).success).toBe(true);
    expect(paymentProviderSchema.safeParse({ provider: 'CARD' }).success).toBe(false);
  });

  it('accepts provider callback query fields without trusting them as payment confirmation', () => {
    const result = khaltiCallbackSchema.safeParse({ pidx: 'pidx-123', purchase_order_id: 'BK-123', status: 'Completed' });
    expect(result.success).toBe(true);
  });

  it('validates full and partial refund requests', () => {
    expect(refundPaymentSchema.parse({ reason: 'Event cancelled' }).amount).toBeUndefined();
    expect(refundPaymentSchema.parse({ amount: '10.50', reason: 'Duplicate booking' }).amount).toBe(10.5);
    expect(refundPaymentSchema.safeParse({ amount: 0, reason: 'x' }).success).toBe(false);
  });
});

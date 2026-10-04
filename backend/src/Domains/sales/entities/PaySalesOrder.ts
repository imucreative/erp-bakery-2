import { isPaymentMethod, PaymentMethod } from '../paymentMethod';

/**
 * Domain Entity: PaySalesOrder — validates the pay payload (doc 51 §7.2).
 *
 * Shape:
 *   { payments: [{ method: PaymentMethod, amount: number > 0, referenceNo?: string }] }
 *
 * Validates structure + per-payment sanity. The Σ amount == grand_total check
 * and all stock deduction happen atomically in the repository pay transaction.
 */
export interface PaySalesOrderPayment {
  method: PaymentMethod;
  amount: number;
  referenceNo: string | null;
}

export class PaySalesOrder {
  public readonly payments: PaySalesOrderPayment[];

  constructor(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('PAY_SALES_ORDER.NOT_CONTAIN_NEEDED_PROPERTY');
    }
    const p = payload as Record<string, unknown>;

    if (!Array.isArray(p.payments) || p.payments.length === 0) {
      throw new Error('PAY_SALES_ORDER.PAYMENTS_REQUIRED');
    }

    this.payments = p.payments.map((raw) => {
      if (!raw || typeof raw !== 'object') {
        throw new Error('PAY_SALES_ORDER.PAYMENT_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      const pay = raw as Record<string, unknown>;

      if (!isPaymentMethod(pay.method)) {
        throw new Error('PAY_SALES_ORDER.INVALID_PAYMENT_METHOD');
      }
      if (
        pay.amount === undefined ||
        pay.amount === null ||
        typeof pay.amount !== 'number' ||
        !Number.isFinite(pay.amount)
      ) {
        throw new Error('PAY_SALES_ORDER.AMOUNT_NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      if (pay.amount <= 0) {
        throw new Error('PAY_SALES_ORDER.AMOUNT_MUST_BE_POSITIVE');
      }

      return {
        method: pay.method,
        amount: pay.amount,
        referenceNo: pay.referenceNo ? String(pay.referenceNo).trim() : null,
      };
    });
  }
}

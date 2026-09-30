/**
 * Domain Entity: PaymentTerm
 * Value object returned after reading a payment term record.
 */
export class PaymentTerm {
  public readonly id: string;
  public readonly companyId: string;
  public readonly code: string;
  public readonly name: string;
  public readonly dueDays: number;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    code: string;
    name: string;
    dueDays: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const { id, companyId, code, name, dueDays, isActive, createdAt, updatedAt } = payload;

    if (!id || !companyId || !code || !name) {
      throw new Error('PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    this.id = id;
    this.companyId = companyId;
    this.code = code;
    this.name = name;
    this.dueDays = dueDays;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

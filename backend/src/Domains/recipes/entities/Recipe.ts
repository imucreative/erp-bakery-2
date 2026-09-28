import { RecipeStatus } from '../recipeStatus';

export interface RecipeItem {
  id: string;
  ingredientProductId: string;
  qty: number;
  uomId: string;
  lossPercentage: number;
}

/**
 * Domain Entity: Recipe (read value object) — header + ingredient items.
 */
export class Recipe {
  public readonly id: string;
  public readonly companyId: string;
  public readonly recipeNumber: string;
  public readonly name: string;
  public readonly productId: string;
  public readonly version: number;
  public readonly yieldQty: number;
  public readonly yieldUomId: string;
  public readonly instructions: string | null;
  public readonly status: RecipeStatus;
  public readonly items: RecipeItem[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(payload: {
    id: string;
    companyId: string;
    recipeNumber: string;
    name: string;
    productId: string;
    version: number;
    yieldQty: number;
    yieldUomId: string;
    instructions: string | null;
    status: RecipeStatus;
    items: RecipeItem[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = payload.id;
    this.companyId = payload.companyId;
    this.recipeNumber = payload.recipeNumber;
    this.name = payload.name;
    this.productId = payload.productId;
    this.version = payload.version;
    this.yieldQty = payload.yieldQty;
    this.yieldUomId = payload.yieldUomId;
    this.instructions = payload.instructions;
    this.status = payload.status;
    this.items = payload.items;
    this.createdAt = payload.createdAt;
    this.updatedAt = payload.updatedAt;
  }
}

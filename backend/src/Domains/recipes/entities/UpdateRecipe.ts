import { CreateRecipe } from './CreateRecipe';

/**
 * Domain Entity: UpdateRecipe
 * Only a DRAFT recipe is editable; reuses CreateRecipe validation.
 * Status guard is enforced by the use case + repository.
 */
export class UpdateRecipe extends CreateRecipe {
  constructor(payload: unknown) {
    super(payload);
  }
}

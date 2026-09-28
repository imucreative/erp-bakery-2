import { CreateRecipeDto } from './create-recipe.dto';

/** UpdateRecipeDto — same shape as create; only DRAFT is editable. */
export class UpdateRecipeDto extends CreateRecipeDto {}

/**
 * useRecipeDraft — a tiny module-level, consume-once channel that carries a
 * prefill payload from "Duplikat ke Draft" (RecipeDetail, ARCHIVED recipe) into
 * the create form (RecipeForm, create mode).
 *
 * Why a shared composable instead of the route query/params:
 *  - The draft can be large (name + yield + instructions + an items[] array of
 *    ingredients). AGENTS.md forbids pushing large payloads through the URL, and
 *    the task explicitly asks to avoid it.
 *  - The repo manages shared UI state via composables (useSidebar/useRTL), so a
 *    module-level singleton ref is the idiomatic choice here — no new Pinia store
 *    or sessionStorage needed.
 *
 * Contract: `setDraft` stashes the payload, `consumeDraft` returns it ONCE and
 * clears it (so a later plain "Buat Resep" opens an empty form). `recipeNumber`,
 * `version`, and `status` are intentionally NOT part of the draft — a duplicated
 * recipe starts a fresh DRAFT v1 assigned by the backend.
 */

import { ref } from 'vue'

/** The subset of recipe data copied into a brand-new draft. */
export interface RecipeDraftPayload {
  name: string
  yieldQty: number
  yieldUomId: string
  instructions: string
  items: Array<{
    ingredientProductId: string
    qty: number
    uomId: string
    lossPercentage: number
  }>
}

// Module-level singleton: shared across the single in-app navigation from the
// archived detail view to the create form.
const pendingDraft = ref<RecipeDraftPayload | null>(null)

export function useRecipeDraft() {
  function setDraft(draft: RecipeDraftPayload): void {
    pendingDraft.value = draft
  }

  /** Return the pending draft once, then clear it. */
  function consumeDraft(): RecipeDraftPayload | null {
    const draft = pendingDraft.value
    pendingDraft.value = null
    return draft
  }

  return { setDraft, consumeDraft }
}

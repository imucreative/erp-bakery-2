/**
 * Company query hook (TanStack Query for Vue). Read-only profile module.
 *
 * Wraps the existing `authService.getCurrentCompany()` (GET /companies/me),
 * which returns the Company for the signed-in user and requires only auth — no
 * `company.read` permission. There is no company mutation endpoint by design,
 * so this module exposes reads only.
 *
 * Query key:
 *  - ['company', 'me'] → the current user's company profile
 *
 * `staleTime` is generous because company profile data changes rarely.
 */

import { useQuery } from '@tanstack/vue-query';
import { authService } from '@/services/auth.service';
import type { Company } from '@/types/api';

const COMPANY_STALE_TIME_MS = 5 * 60 * 1000;

export const companyKeys = {
  all: ['company'] as const,
  me: () => [...companyKeys.all, 'me'] as const,
};

/** Fetches the signed-in user's company profile. */
export function useCompanyQuery() {
  return useQuery<Company>({
    queryKey: companyKeys.me(),
    queryFn: () => authService.getCurrentCompany(),
    staleTime: COMPANY_STALE_TIME_MS,
  });
}

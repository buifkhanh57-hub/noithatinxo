'use client'

import { AvhShell } from './spa-shell'

/**
 * Tiny client bridge used by every real route's server page.tsx:
 * mounts the full storefront shell and forces the view that belongs
 * to the URL the customer landed on.
 *
 * Keep in sync with src/lib/view-routes.ts.
 */
export function AppShellForRoute({
  view,
  params,
}: {
  view: string
  params?: Record<string, string | undefined>
}) {
  return <AvhShell route={{ view, params }} />
}

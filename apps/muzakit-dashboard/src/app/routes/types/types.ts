import type { SidebarRouteMeta } from "@muzakit/ui";

export type LayoutType = "default" | "auth";

export interface RouteMeta extends SidebarRouteMeta {
  title?: string
  layout?: LayoutType
  requiresAuth?: boolean
  showInMenu?: boolean
  isRootRedirect?: boolean
  permissions?: readonly string[] | string[]
  authRedirect?: string
  filters?: { show?: string[] }
}

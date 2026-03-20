export type LayoutType = "default" | "auth";

export interface RouteMeta {
  title?: string
  layout?: LayoutType
  requiresAuth?: boolean
  showInMenu?: boolean
  menuTitle?: string
  menuIcon?: string
  menuBadge?: string
  menuOrder?: number
  isRootRedirect?: boolean
  permissions?: readonly string[] | string[]
  authRedirect?: string
}

export interface MenuItem {
  id: string
  label: string
  icon?: string
  badge?: string
  to?: string | { name: string }
  children?: MenuItem[]
  order?: number
  disabled?: boolean
}

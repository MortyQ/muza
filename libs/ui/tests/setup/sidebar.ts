import {
  computed,
  defineComponent,
  effectScope,
  ref,
  type Component,
  type ComputedRef,
  type EffectScope,
} from "vue";

import { mount, type MountingOptions, type VueWrapper } from "@vue/test-utils";
import { vi, type Mock } from "vitest";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
  type Router,
} from "vue-router";

import { SIDEBAR_STATE_KEY } from "../../src/components/navigation-sidebar/composables/injectionKeys";
import {
  buildSidebarState,
  type SidebarStateProvided,
} from "../../src/components/navigation-sidebar/composables/useSidebarState";
import { createSidebar } from "../../src/components/navigation-sidebar/createSidebar";
import type {
  SidebarNavItem,
  SidebarOptions,
} from "../../src/components/navigation-sidebar/types";

/**
 * Fixtures and a host for the navigation sidebar suite.
 *
 * Three of the sidebar's four units call `useRoute()`, which resolves through
 * `inject` — so `withScope()` from `scope.ts` is not enough for them: an
 * `effectScope` carries reactivity but no injection context, and `useRoute()`
 * inside one returns undefined. They need a component, and a real router
 * rather than a stub, because what is being asserted *is* the matching between
 * a route and an item's `to`.
 */

const RouteStub = defineComponent({ name: "RouteStub", template: "<div />" });

/**
 * The tree every sidebar spec works against: two roots, one of them two levels
 * deep, one leaf addressed by name instead of path, and one branch whose parent
 * is itself navigable. Written out rather than generated — an id that moved
 * between runs would make an active-path assertion meaningless.
 */
export function makeNavItems(): SidebarNavItem[] {
  return [
    { id: "home", label: "Home", icon: "lucide:home", to: "/" },
    {
      id: "catalog",
      label: "Catalog",
      icon: "lucide:package",
      to: "/catalog",
      children: [
        { id: "products", label: "Products", to: "/catalog/products" },
        {
          id: "media",
          label: "Media",
          children: [
            { id: "images", label: "Images", to: "/catalog/media/images" },
            { id: "videos", label: "Videos", to: { name: "videos" } },
          ],
        },
      ],
    },
    { id: "reports", label: "Reports", icon: "lucide:chart", children: [] },
    { id: "action", label: "Run import", onClick: () => {} },
  ];
}

/** Every path and name reachable from `makeNavItems()`, plus somewhere to go that is not. */
export const NAV_ROUTES: RouteRecordRaw[] = [
  { path: "/", name: "home", component: RouteStub },
  { path: "/catalog", name: "catalog", component: RouteStub },
  { path: "/catalog/products", name: "products", component: RouteStub },
  { path: "/catalog/media/images", name: "images", component: RouteStub },
  { path: "/catalog/media/videos", name: "videos", component: RouteStub },
  { path: "/elsewhere", name: "elsewhere", component: RouteStub },
  { path: "/:pathMatch(.*)*", name: "not-found", component: RouteStub },
];

export interface RouterHost<T> {
  result: T
  router: Router
  wrapper: VueWrapper
}

/**
 * Run a composable inside a component that has a router installed, and hand
 * back its return value along with the router, so a spec can drive navigation
 * and read the result across it.
 *
 * The host renders nothing. `unmount` is left to the caller for the same reason
 * `withScope` returns its scope: a spec that asserts across a route change must
 * keep the effects alive until it is done with them.
 */
export async function withRouter<T>(
  fn: () => T,
  initial = "/",
): Promise<RouterHost<T>> {
  let result!: T;

  const Host = defineComponent({
    name: "SidebarHost",
    setup() {
      result = fn();
      return () => null;
    },
  });

  const router = createRouter({ history: createMemoryHistory(), routes: NAV_ROUTES });
  await router.push(initial);
  await router.isReady();

  const wrapper = mount(Host, { global: { plugins: [router] } }) as VueWrapper;

  return { result, router, wrapper };
}

/** `ComputedRef<SidebarNavItem[]>` is what `useNavigation` takes; this spells it. */
export type NavItems = ComputedRef<SidebarNavItem[]>;

// ── Mounting a component that expects the sidebar's provide ──────────────────

export interface SidebarHarness {
  state: SidebarStateProvided
  /** Drives `isActive` / `isOnActivePath`; set it to an ancestor chain. */
  activePath: ReturnType<typeof ref<string[]>>
  prefetch: Mock
  scope: EffectScope
}

/**
 * The state a real `<NavigationSidebar>` provides, with the navigation half
 * under the test's control.
 *
 * The collapse/expand/mobile half is the genuine `buildSidebarState` over a
 * genuine `createSidebar` — a component asserting that a click expands a branch
 * should go through the same code the app does. The route-matching half is a
 * ref instead, because `useNavigation` already has its own spec: driving a
 * component's active state by pushing routes would re-test that matching
 * thirteen more times and make every one of these specs fail when it breaks.
 */
export function makeSidebarState(
  options: Partial<SidebarOptions> = {},
): SidebarHarness {
  const scope = effectScope();
  const activePath = ref<string[]>([]);
  const prefetch = vi.fn();

  const state = scope.run(() => {
    const base = buildSidebarState(createSidebar({
      items: makeNavItems(),
      ...options,
    }));

    return {
      ...base,
      activeItemId: computed(() => activePath.value.at(-1) ?? null),
      activePathIds: computed<ReadonlySet<string>>(() => new Set(activePath.value)),
      isActive: (id: string) => activePath.value.at(-1) === id,
      isOnActivePath: (id: string) => activePath.value.includes(id),
      onPrefetch: prefetch,
    } satisfies SidebarStateProvided;
  }) as SidebarStateProvided;

  return { state, activePath, prefetch, scope };
}

export interface SidebarMountResult<C extends Component> extends SidebarHarness {
  wrapper: VueWrapper
  router: Router
  component: C
}

/**
 * Mount a sidebar subcomponent with the router and the provide it expects.
 *
 * Every one of these components calls `useSidebarState()`, which throws outside
 * the tree — so there is no "bare" mount to fall back on, and a spec that
 * forgets the provide fails loudly rather than silently testing a stub.
 */
export async function mountInSidebar<C extends Component>(
  component: C,
  options: MountingOptions<Record<string, unknown>> & {
    harness?: SidebarHarness
    route?: string
  } = {},
): Promise<SidebarMountResult<C>> {
  const { harness = makeSidebarState(), route = "/", ...mountOptions } = options;

  const router = createRouter({ history: createMemoryHistory(), routes: NAV_ROUTES });
  await router.push(route);
  await router.isReady();

  const wrapper = mount(component, {
    ...mountOptions,
    global: {
      ...mountOptions.global,
      plugins: [...(mountOptions.global?.plugins ?? []), router],
      provide: {
        ...mountOptions.global?.provide,
        [SIDEBAR_STATE_KEY as symbol]: harness.state,
      },
    },
  }) as VueWrapper;

  return { ...harness, wrapper, router, component };
}

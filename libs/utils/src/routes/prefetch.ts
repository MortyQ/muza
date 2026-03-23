import type { Router, RouteLocationRaw } from "vue-router";

const prefetchedComponents = new Set();

export async function prefetchRoute(router: Router, to: RouteLocationRaw): Promise<void> {
  try {
    const resolved = router.resolve(to);

    const components = resolved.matched.flatMap(record =>
      Object.values(record.components || {}),
    );

    for (const component of components) {
      if (typeof component === "function") {
        if (!prefetchedComponents.has(component)) {
          (component as () => unknown)();
          prefetchedComponents.add(component);
        }
      }
    }
  }
  catch (error) {
    console.warn("[Prefetch] Failed to preload route:", error);
  }
}

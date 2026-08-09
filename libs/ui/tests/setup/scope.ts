import { effectScope, type EffectScope } from "vue";

/**
 * Run a composable outside a component.
 *
 * Most of the table's logic lives in composables that never touch the DOM, and
 * mounting a host component just to reach them would drag in a render cycle,
 * lifecycle hooks and stubs that have nothing to do with what is being asserted.
 * An `effectScope` gives the same reactive context for a fraction of the cost —
 * and, unlike a bare call, it collects the watchers so `stop()` can dispose them.
 *
 * The scope is returned alongside the result because a few composables register
 * `onScopeDispose` cleanup (`useLinkedTables` deregisters itself there), and a
 * test that never stops the scope would leak that registration into the next one.
 */
export function withScope<T>(fn: () => T): { result: T, scope: EffectScope } {
  const scope = effectScope();
  const result = scope.run(fn) as T;
  return { result, scope };
}

/**
 * `withScope` for the common case where the test only needs the return value and
 * wants the scope torn down as soon as the callback finishes.
 */
export async function inScope<T>(
  fn: () => T,
  use: (value: T) => void | Promise<void>,
): Promise<void> {
  const { result, scope } = withScope(fn);
  try {
    await use(result);
  }
  finally {
    scope.stop();
  }
}

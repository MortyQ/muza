<script lang="ts" setup>
import { computed } from "vue";

import { DateTime } from "luxon";

/**
 * A timestamp rendered the way a timestamp should be: a real `<time>` element
 * carrying the raw ISO string, the value shown in the reader's own zone, and the
 * UTC original one hover away.
 *
 * Deliberately not the `formatDate` helper from `@muzakit/utils`, which this
 * replaces at every call site that shows a *moment* rather than a calendar date.
 * That helper renders in UTC and returns `""` for a null value, so "never
 * happened" and "happened, but the field is empty" look identical — and an event
 * at 18:40 local reads as 15:40 with nothing on screen saying which zone that is.
 *
 * Apps whose date filters are UTC by contract will show rows near midnight a day
 * away from the range that returned them. The `title` is what settles that
 * argument, which is why it is always the UTC form and never a second local copy.
 */
const { value = null, format = "MM/dd/yyyy, h:mm a" } = defineProps<{
  /** An ISO 8601 string. `null` renders as an em dash — the absence is shown, not hidden. */
  value?: string | null
  /** A luxon format token string. The default is date + 12-hour time. */
  format?: string
}>();

const local = computed<DateTime | null>(() => {
  if (!value) return null;
  const parsed = DateTime.fromISO(value).toLocal();
  return parsed.isValid ? parsed : null;
});

// An unparseable string falls through to the em dash rather than being echoed
// back: in a table column it is a value the reader cannot act on either way, and
// the raw text stays in `datetime`.
const formatted = computed<string>(() => local.value?.toFormat(format) ?? "—");

const title = computed<string | undefined>(() => {
  if (!value) return undefined;
  const utc = DateTime.fromISO(value, { zone: "utc" });
  return utc.isValid ? `${utc.toFormat("yyyy-MM-dd HH:mm:ss")} UTC` : value;
});
</script>

<template>
  <time
    v-if="value"
    :datetime="value"
    :title
    class="v-date"
  >{{ formatted }}</time>
  <span
    v-else
    class="v-date__empty"
  >—</span>
</template>

<style lang="scss" scoped>
@use "../../styles/components/base/vdate.scss";
</style>

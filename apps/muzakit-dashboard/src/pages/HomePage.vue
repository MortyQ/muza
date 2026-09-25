<script lang="ts" setup>
import { ref } from "vue";

import {
  VButton,
  VButtonGroup,
  VCheckbox,
  VDrawer,
  VIcon,
  VInput,
  VModal,
  VSegmentedControl,
  VSelect,
  VSwitch,
  VTable,
  VTooltip,
  useModal,
  type Column,
  type SegmentOption,
  type SelectOption,
} from "@muzakit/ui";

// ── VButton showcase ────────────────────────────────────────────────────────
type ButtonVariant
  = | "primary" | "secondary" | "neutral" | "info"
    | "positive" | "warning" | "negative" | "link";

/** Every variant, with the one-line reason it exists. */
const BUTTON_VARIANTS: { variant: ButtonVariant, note: string }[] = [
  { variant: "primary", note: "the main action on a row" },
  { variant: "secondary", note: "the one filled tier" },
  { variant: "neutral", note: "quiet — toolbars, cancel" },
  { variant: "info", note: "informational accent" },
  { variant: "positive", note: "confirm, approve" },
  { variant: "warning", note: "reversible but risky" },
  { variant: "negative", note: "destructive" },
  { variant: "link", note: "inline, not a surface" },
];

/** The columns of the matrix: one state each, applied to every variant. */
const BUTTON_STATES = [
  { key: "text", label: "Text" },
  { key: "left", label: "Icon left" },
  { key: "right", label: "Icon right" },
  { key: "icon", label: "Icon only" },
  { key: "loading", label: "Loading" },
  { key: "disabled", label: "Disabled" },
] as const;

const BUTTON_SIZES = [
  { size: "sm", label: "sm · 28px" },
  { size: undefined, label: "default · 30px" },
  { size: "md", label: "md · 32px" },
  { size: "lg", label: "lg · 40px" },
] as const;

// Page-wide overrides, so every button on the showcase can be flipped at once
// and compared in one state instead of hunting for the matrix column.
const forceLoading = ref(false);
const forceDisabled = ref(false);

// A real async action: click and the button carries `loading` until the fake
// request settles, which is the case the prop is actually for.
const pendingAction = ref<string | null>(null);
const runAction = (id: string) => {
  pendingAction.value = id;
  setTimeout(() => {
    if (pendingAction.value === id) pendingAction.value = null;
  }, 1500);
};

// ── VSegmentedControl ───────────────────────────────────────────────────────
const granularity = ref<"DAY" | "WEEK" | "MONTH">("WEEK");

const granularityOptions: SegmentOption<"DAY" | "WEEK" | "MONTH">[] = [
  { label: "Day", value: "DAY", icon: "lucide:calendar", tooltip: "Group by day" },
  { label: "Week", value: "WEEK", icon: "lucide:calendar-range", tooltip: "Group by week" },
  { label: "Month", value: "MONTH", icon: "lucide:calendar-days", tooltip: "Group by month" },
];

// VCheckbox demos
const checkboxBool = ref(false);
const checkboxDisabled = ref(true);
const checkboxIndeterminate = ref(false);
const checkboxGroup = ref<string[]>(["apple"]);

// VSwitch demos
const switchBasic = ref(false);
const switchWithLabels = ref(true);
const switchWithIcons = ref(false);
const switchDisabled = ref(true);
const switchCustomColor = ref(true);

// VSelect demos
const selectSingle = ref<SelectOption | null>(null);
const selectMultiple = ref<SelectOption[]>([]);
const selectWithLabel = ref<SelectOption | null>(null);
const selectDisabled = ref<SelectOption | null>({ label: "Vue.js", value: "vue" });

const frameworkOptions: SelectOption[] = [
  { label: "Vue.js", value: "vue" },
  { label: "React", value: "react" },
  { label: "Angular", value: "angular" },
  { label: "Svelte", value: "svelte" },
  { label: "SolidJS", value: "solid" },
];

const countryOptions: SelectOption[] = [
  { label: "Ukraine 🇺🇦", value: "ua" },
  { label: "Germany 🇩🇪", value: "de" },
  { label: "France 🇫🇷", value: "fr" },
  { label: "Japan 🇯🇵", value: "jp" },
  { label: "Canada 🇨🇦", value: "ca" },
  { label: "Brazil 🇧🇷", value: "br" },
];

// VInput demos
const inputText = ref("");
const inputEmail = ref("");
const inputPassword = ref("");
const inputSearch = ref("");
const inputWithIcon = ref("");
const inputDisabled = ref("Disabled value");
const inputTextarea = ref("");

// VTable
const tableColumns: Column[] = [
  { key: "name", label: "Name", width: "350px", fixed: "left" },
  { key: "role", label: "Role", width: "350px" },
  { key: "status", label: "Status", width: "350px" },
  { key: "tasks", label: "Tasks", width: "350px", align: "right", format: { number: { type: "default" } } },
  { key: "salary", label: "Salary", width: "350px", align: "right", format: { currency: "USD" } },
  { key: "joined", label: "Joined", width: "350px", format: { date: "short" } },
];

const tableData = [
  { name: "Alice Johnson", role: "Frontend Engineer", status: "Active", tasks: 14, salary: 95000, joined: "2021-03-15" },
  { name: "Bob Martinez", role: "Backend Engineer", status: "Active", tasks: 9, salary: 102000, joined: "2020-07-01" },
  { name: "Clara Kim", role: "Product Designer", status: "On Leave", tasks: 3, salary: 88000, joined: "2022-01-20" },
  { name: "David Chen", role: "DevOps", status: "Active", tasks: 21, salary: 110000, joined: "2019-11-05" },
  { name: "Elena Vasquez", role: "QA Engineer", status: "Inactive", tasks: 0, salary: 78000, joined: "2023-02-28" },
  { name: "Frank O'Brien", role: "Tech Lead", status: "Active", tasks: 7, salary: 130000, joined: "2018-09-12" },
  { name: "Grace Lin", role: "Frontend Engineer", status: "Active", tasks: 11, salary: 96000, joined: "2022-06-10" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Alice Johnson", role: "Frontend Engineer", status: "Active", tasks: 14, salary: 95000, joined: "2021-03-15" },
  { name: "Bob Martinez", role: "Backend Engineer", status: "Active", tasks: 9, salary: 102000, joined: "2020-07-01" },
  { name: "Clara Kim", role: "Product Designer", status: "On Leave", tasks: 3, salary: 88000, joined: "2022-01-20" },
  { name: "David Chen", role: "DevOps", status: "Active", tasks: 21, salary: 110000, joined: "2019-11-05" },
  { name: "Elena Vasquez", role: "QA Engineer", status: "Inactive", tasks: 0, salary: 78000, joined: "2023-02-28" },
  { name: "Frank O'Brien", role: "Tech Lead", status: "Active", tasks: 7, salary: 130000, joined: "2018-09-12" },
  { name: "Grace Lin", role: "Frontend Engineer", status: "Active", tasks: 11, salary: 96000, joined: "2022-06-10" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Alice Johnson", role: "Frontend Engineer", status: "Active", tasks: 14, salary: 95000, joined: "2021-03-15" },
  { name: "Bob Martinez", role: "Backend Engineer", status: "Active", tasks: 9, salary: 102000, joined: "2020-07-01" },
  { name: "Clara Kim", role: "Product Designer", status: "On Leave", tasks: 3, salary: 88000, joined: "2022-01-20" },
  { name: "David Chen", role: "DevOps", status: "Active", tasks: 21, salary: 110000, joined: "2019-11-05" },
  { name: "Elena Vasquez", role: "QA Engineer", status: "Inactive", tasks: 0, salary: 78000, joined: "2023-02-28" },
  { name: "Frank O'Brien", role: "Tech Lead", status: "Active", tasks: 7, salary: 130000, joined: "2018-09-12" },
  { name: "Grace Lin", role: "Frontend Engineer", status: "Active", tasks: 11, salary: 96000, joined: "2022-06-10" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
  { name: "Hiro Tanaka", role: "Data Analyst", status: "Active", tasks: 5, salary: 92000, joined: "2021-08-30" },
];

// VDrawer & VModal
const drawer = useModal("demo-drawer");
const drawerLeft = useModal("demo-drawer-left");
const modal = useModal("demo-modal");
const modalConfirm = useModal("demo-modal-confirm");
const modalLoading = useModal("demo-modal-loading");
const isModalLoading = ref(false);

const handleConfirm = () => {
  isModalLoading.value = true;
  setTimeout(() => {
    isModalLoading.value = false;
    modalLoading.close();
  }, 2000);
};
</script>

<template>
  <div class="home-page">
    <h1 class="home-page__title">
      Component Demo
    </h1>

    <!-- VButton -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VButton
      </h2>

      <div class="home-page__row">
        <VSwitch
          v-model="forceLoading"
          true-label="All loading"
          false-label="All loading"
        />
        <VSwitch
          v-model="forceDisabled"
          true-label="All disabled"
          false-label="All disabled"
        />
      </div>

      <!-- Variants: the plain row, to read the palette at a glance -->
      <h3 class="home-page__subtitle">
        Variants
      </h3>
      <div class="home-page__row">
        <VButton
          v-for="{ variant } in BUTTON_VARIANTS"
          :key="variant"
          :disabled="forceDisabled"
          :loading="forceLoading"
          :text="variant"
          :variant
        />
      </div>

      <!-- Variant × state: every combination, one row per variant -->
      <h3 class="home-page__subtitle">
        Variant × state
      </h3>
      <div class="home-page__matrix">
        <span />
        <span
          v-for="state in BUTTON_STATES"
          :key="state.key"
          class="home-page__matrix-head"
        >{{ state.label }}</span>

        <template
          v-for="{ variant, note } in BUTTON_VARIANTS"
          :key="variant"
        >
          <span class="home-page__matrix-label">
            <strong>{{ variant }}</strong>
            <small>{{ note }}</small>
          </span>
          <span
            v-for="state in BUTTON_STATES"
            :key="state.key"
            class="home-page__matrix-cell"
          >
            <VButton
              v-if="state.key === 'right'"
              :disabled="forceDisabled"
              :loading="forceLoading"
              :variant
              text="Next"
            >
              <template #iconRight>
                <VIcon
                  :size="15"
                  icon="lucide:arrow-right"
                />
              </template>
            </VButton>
            <VButton
              v-else
              :aria-label="state.key === 'icon' ? `${variant} action` : undefined"
              :disabled="forceDisabled || state.key === 'disabled'"
              :icon="['left', 'icon', 'loading'].includes(state.key) ? 'lucide:plus' : undefined"
              :loading="forceLoading || state.key === 'loading'"
              :text="state.key === 'icon' ? '' : 'Create'"
              :variant
            />
          </span>
        </template>
      </div>

      <!-- Sizes: height is the only thing a size changes -->
      <h3 class="home-page__subtitle">
        Sizes — height only; padding and type belong to the chrome
      </h3>
      <div
        v-for="{ size, label } in BUTTON_SIZES"
        :key="label"
        class="home-page__row"
      >
        <span class="home-page__size-label">{{ label }}</span>
        <VButton
          :disabled="forceDisabled"
          :loading="forceLoading"
          :size
          text="Save"
        />
        <VButton
          :disabled="forceDisabled"
          :loading="forceLoading"
          :size
          icon="lucide:download"
          text="Export"
          variant="neutral"
        />
        <VButton
          :disabled="forceDisabled"
          :loading="forceLoading"
          :size
          aria-label="Settings"
          icon="lucide:settings"
          variant="neutral"
        />
        <VButton
          :disabled="forceDisabled"
          :loading="forceLoading"
          :size
          icon="lucide:trash-2"
          text="Delete"
          variant="negative"
        />
      </div>

      <!-- Loading on a real async action -->
      <h3 class="home-page__subtitle">
        Loading on a real action — click to run a 1.5s request
      </h3>
      <div class="home-page__row">
        <VButton
          :loading="pendingAction === 'save'"
          icon="lucide:save"
          text="Save changes"
          @click="runAction('save')"
        />
        <VButton
          :loading="pendingAction === 'sync'"
          icon="lucide:refresh-cw"
          text="Sync"
          variant="neutral"
          @click="runAction('sync')"
        />
        <VButton
          :loading="pendingAction === 'approve'"
          icon="lucide:check"
          text="Approve"
          variant="positive"
          @click="runAction('approve')"
        />
        <VButton
          :loading="pendingAction === 'remove'"
          icon="lucide:trash-2"
          text="Remove"
          variant="negative"
          @click="runAction('remove')"
        />
        <VButton
          :loading="pendingAction === 'refresh'"
          aria-label="Refresh"
          icon="lucide:rotate-cw"
          variant="neutral"
          @click="runAction('refresh')"
        />
      </div>

      <!-- As a router link -->
      <h3 class="home-page__subtitle">
        As a router link — pass <code>to</code>
      </h3>
      <div class="home-page__row">
        <VButton
          icon="lucide:layout-grid"
          text="Components demo"
          to="/components-demo"
          variant="neutral"
        />
        <VButton
          icon="lucide:table"
          text="Table demo"
          to="/table-demo"
          variant="info"
        />
        <VButton
          text="Read the docs"
          to="/components-demo"
          variant="link"
        />
        <VButton
          disabled
          icon="lucide:lock"
          text="Disabled link"
          to="/components-demo"
          variant="neutral"
        />
      </div>

      <!-- Groups -->
      <h3 class="home-page__subtitle">
        VButtonGroup — several separate actions, one track
      </h3>
      <div class="home-page__row">
        <VButtonGroup aria-label="Open in">
          <VButton
            icon="lucide:external-link"
            text="Seller Central"
            variant="neutral"
          />
          <VButton
            text="Slack"
            variant="neutral"
          />
          <VButton
            text="Jira"
            variant="neutral"
          />
        </VButtonGroup>

        <VButtonGroup aria-label="Text formatting">
          <VButton
            aria-label="Bold"
            icon="lucide:bold"
            variant="neutral"
          />
          <VButton
            aria-label="Italic"
            icon="lucide:italic"
            variant="neutral"
          />
          <VButton
            aria-label="Underline"
            icon="lucide:underline"
            variant="neutral"
          />
        </VButtonGroup>

        <VButtonGroup aria-label="Review">
          <VButton
            icon="lucide:check"
            text="Approve"
            variant="positive"
          />
          <VButton
            icon="lucide:clock"
            text="Defer"
            variant="warning"
          />
          <VButton
            icon="lucide:x"
            text="Reject"
            variant="negative"
          />
        </VButtonGroup>
      </div>

      <!-- The toolbar row: the reason the control scale exists -->
      <h3 class="home-page__subtitle">
        In a toolbar row — every control at one height
      </h3>
      <div class="home-page__toolbar">
        <!-- Wrapped, not classed: VInput is `inheritAttrs: false` and hands
             every attribute, `class` included, to its inner <input>, so a
             width set on the component lands on the field and never reaches
             the `width: 100%` wrapper around it. -->
        <div class="home-page__toolbar-search">
          <VInput
            v-model="inputSearch"
            icon="lucide:search"
            placeholder="Search…"
            type="search"
          />
        </div>
        <VSelect
          v-model="selectSingle"
          :options="frameworkOptions"
          class="home-page__toolbar-select"
          placeholder="Framework"
        />
        <VSegmentedControl
          v-model="granularity"
          :options="granularityOptions"
        />
        <span class="home-page__toolbar-spacer" />
        <VButtonGroup aria-label="View">
          <VButton
            aria-label="List view"
            icon="lucide:list"
            variant="neutral"
          />
          <VButton
            aria-label="Grid view"
            icon="lucide:layout-grid"
            variant="neutral"
          />
        </VButtonGroup>
        <VButton
          icon="lucide:download"
          text="Export"
          variant="neutral"
        />
        <VButton
          icon="lucide:plus"
          text="New report"
        />
      </div>
    </section>

    <!-- VSegmentedControl -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VSegmentedControl
      </h2>
      <div class="home-page__row">
        <VSegmentedControl
          v-model="granularity"
          :options="granularityOptions"
        />
      </div>
      <p class="home-page__caption">
        Selected: <strong>{{ granularity }}</strong> — hover a segment for its tooltip.
      </p>
    </section>

    <!-- VTooltip -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VTooltip
      </h2>
      <div class="home-page__row">
        <VTooltip
          placement="right"
          text="Tooltip on the right (default)"
        >
          <VButton
            text="Hover me → right"
            variant="neutral"
          />
        </VTooltip>
        <VTooltip
          placement="top"
          text="Tooltip on top"
        >
          <VButton
            text="Hover me → top"
            variant="neutral"
          />
        </VTooltip>
        <VTooltip
          :allow-html="true"
          placement="bottom"
          text="<b>HTML</b> tooltip with <em>markup</em>"
        >
          <VButton
            text="Hover me → html"
            variant="neutral"
          />
        </VTooltip>
      </div>
    </section>

    <!-- VCheckbox -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VCheckbox
      </h2>
      <div class="home-page__row">
        <VCheckbox
          v-model="checkboxBool"
          label="Default checkbox"
        />
        <VCheckbox
          v-model="checkboxBool"
          label="Same model (checked)"
        />
        <VCheckbox
          v-model="checkboxDisabled"
          disabled
          label="Disabled checked"
        />
        <VCheckbox
          :model-value="false"
          disabled
          label="Disabled unchecked"
        />
        <VCheckbox
          v-model="checkboxIndeterminate"
          :indeterminate="true"
          label="Indeterminate"
        />
      </div>
      <div class="home-page__row">
        <VCheckbox
          v-model="checkboxGroup"
          label="Apple"
          value="apple"
        />
        <VCheckbox
          v-model="checkboxGroup"
          label="Banana"
          value="banana"
        />
        <VCheckbox
          v-model="checkboxGroup"
          label="Cherry"
          value="cherry"
        />
      </div>
      <p class="home-page__caption">
        Bool: <strong>{{ checkboxBool }}
        </strong> · Group: <strong>{{ checkboxGroup.join(", ") || "none" }}</strong>
      </p>
    </section>

    <!-- VSwitch -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VSwitch
      </h2>
      <div class="home-page__row">
        <VSwitch v-model="switchBasic" />
        <VSwitch
          v-model="switchWithLabels"
          false-label="Notifications off"
          true-label="Notifications on"
        />
        <VSwitch
          v-model="switchWithIcons"
          false-icon="lucide:moon"
          false-label="Dark"
          true-icon="lucide:sun"
          true-label="Light"
        />
        <VSwitch
          v-model="switchDisabled"
          disabled
          true-label="Disabled on"
        />
        <VSwitch
          v-model="switchCustomColor"
          color="#16a34a"
          false-label="Custom color"
          true-label="Custom color"
        />
      </div>
      <p class="home-page__caption">
        Basic: <strong>{{ switchBasic }}
        </strong> · Labels: <strong>{{ switchWithLabels }}</strong> · Icons:
        <strong>{{ switchWithIcons }}</strong>
      </p>
    </section>

    <!-- VSelect -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VSelect
      </h2>

      <div class="home-page__select-grid">
        <!-- Single, no label -->
        <div>
          <VSelect
            v-model="selectSingle"
            :options="frameworkOptions"
            placeholder="Choose a framework..."
          />
        </div>

        <!-- Single with floating label -->
        <div>
          <VSelect
            v-model="selectWithLabel"
            :options="countryOptions"
            name="Country"
            placeholder="Search..."
          />
        </div>

        <!-- Multiple with floating label -->
        <div>
          <VSelect
            v-model="selectMultiple"
            :clear-on-select="false"
            :close-on-select="false"
            :multiple="true"
            :options="frameworkOptions"
            name="Frameworks"
            placeholder="Pick multiple..."
          />
        </div>

        <!-- Disabled with pre-selected value -->
        <div>
          <VSelect
            v-model="selectDisabled"
            :disabled="true"
            :options="frameworkOptions"
            name="Disabled"
          />
        </div>
      </div>

      <p class="home-page__caption">
        Single: <strong>{{ (selectSingle as SelectOption)?.label ?? "—" }}</strong>
        · Country: <strong>{{ (selectWithLabel as SelectOption)?.label ?? "—" }}</strong>
        · Multiple: <strong>{{ selectMultiple.map(o => o.label).join(", ") || "none" }}</strong>
      </p>
    </section>

    <!-- VInput -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VInput
      </h2>

      <div class="home-page__select-grid">
        <VInput
          v-model="inputText"
          name="Full name"
          placeholder="John Doe"
        />

        <VInput
          v-model="inputEmail"
          icon="lucide:mail"
          name="Email"
          placeholder="hello@example.com"
          type="email"
        />

        <VInput
          v-model="inputPassword"
          name="Password"
          placeholder="••••••••"
          type="password"
        />

        <VInput
          v-model="inputSearch"
          placeholder="Search anything..."
          type="search"
        />

        <VInput
          v-model="inputWithIcon"
          helper-text="Your public profile URL"
          icon="lucide:globe"
          name="Website"
          placeholder="https://muzakit.dev"
        />

        <VInput
          v-model="inputDisabled"
          disabled
          name="Read only"
        />

        <VInput
          v-model="inputTextarea"
          :rows="3"
          :textarea="true"
          name="Description"
          placeholder="Tell us about yourself..."
        />
      </div>
    </section>

    <!-- VDrawer -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VDrawer
      </h2>
      <div class="home-page__row">
        <VButton
          text="Open right drawer"
          @click="drawer.open()"
        />
        <VButton
          text="Open left drawer"
          variant="link"
          @click="drawerLeft.open()"
        />
      </div>

      <!-- Right drawer -->
      <VDrawer
        id="demo-drawer"
        title="Right Drawer"
        width="md"
      >
        <p style="color: var(--ui-foreground-secondary); font-size: 0.875rem; line-height: 1.6">
          This is the drawer content area. It scrolls independently from the backdrop.
          You can put forms, details, navigation — anything here.
        </p>
        <template #footer>
          <VButton
            text="Cancel"
            variant="link"
            @click="drawer.close()"
          />
          <VButton
            text="Save"
            @click="drawer.close()"
          />
        </template>
      </VDrawer>

      <!-- Left drawer -->
      <VDrawer
        id="demo-drawer-left"
        position="left"
        title="Left Drawer"
        width="sm"
      >
        <p style="color: var(--ui-foreground-secondary); font-size: 0.875rem; line-height: 1.6">
          A narrow left-side drawer — useful for navigation or filters.
        </p>
      </VDrawer>
    </section>

    <!-- VModal -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VModal
      </h2>
      <div class="home-page__row">
        <VButton
          text="Simple modal"
          @click="modal.open()"
        />
        <VButton
          text="Confirm dialog"
          variant="warning"
          @click="modalConfirm.open()"
        />
        <VButton
          text="Async confirm"
          variant="positive"
          @click="modalLoading.open()"
        />
      </div>

      <!-- Simple modal -->
      <VModal
        id="demo-modal"
        max-width="md"
        title="Simple Modal"
      >
        <p style="color: var(--ui-foreground-secondary); font-size: 0.875rem; line-height: 1.6">
          A basic modal with a title and close button. Click outside or press Escape to dismiss.
        </p>
      </VModal>

      <!-- Confirm dialog -->
      <VModal
        id="demo-modal-confirm"
        :footer-actions="{ confirmText: 'Delete',
                           confirmVariant: 'negative', cancelText: 'Keep it' }"
        max-width="sm"
        title="Delete item?"
        @confirm="modalConfirm.close()"
      >
        <p style="color: var(--ui-foreground-secondary); font-size: 0.875rem; line-height: 1.6">
          This action cannot be undone. Are you sure you want to permanently delete this item?
        </p>
      </VModal>

      <!-- Async with loading state -->
      <VModal
        id="demo-modal-loading"
        :footer-actions="{ confirmText: 'Save', cancelText: 'Discard' }"
        :loading="isModalLoading"
        max-width="sm"
        title="Save changes"
        @confirm="handleConfirm"
      >
        <p style="color: var(--ui-foreground-secondary); font-size: 0.875rem; line-height: 1.6">
          Click "Save" to simulate an async operation
          — the button will show a loading spinner for 2 seconds.
        </p>
      </VModal>
    </section>

    <!-- VTable -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VTable
      </h2>
      <VTable
        :columns="tableColumns"
        :data="tableData"
        :toolbar="{ enabled: true, title: 'Team Members', subtitle: 'All employees' }"
        :virtualized="false"
      />
    </section>
  </div>
</template>

<style scoped>
.home-page {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.home-page__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--ui-foreground);
}

.home-page__section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.home-page__section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ui-foreground-muted);
}

.home-page__row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.home-page__caption {
  font-size: var(--ui-text-base);
  color: var(--ui-foreground-secondary);
}

.home-page__subtitle {
  margin-top: var(--ui-space-md);
  font-size: var(--ui-text-sm);
  font-weight: 600;
  color: var(--ui-foreground-secondary);

  code {
    padding: 0 var(--ui-space-xs);
    border-radius: var(--ui-radius-xs);
    background: var(--ui-surface-sunken);
    font-size: var(--ui-text-xs);
  }
}

/* One row per variant, one column per state — the label column sized to its
   content and the rest sharing what is left. */
.home-page__matrix {
  display: grid;
  grid-template-columns: max-content repeat(6, minmax(0, 1fr));
  align-items: center;
  gap: var(--ui-space-md) var(--ui-space-lg);
  padding: var(--ui-space-lg);
  border: 1px solid var(--ui-border-subtle);
  border-radius: var(--ui-radius-xl);
  background: var(--ui-surface);
  overflow-x: auto;
}

.home-page__matrix-head {
  font-size: var(--ui-text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ui-foreground-muted);
}

.home-page__matrix-label {
  display: flex;
  flex-direction: column;
  padding-right: var(--ui-space-lg);

  strong {
    font-size: var(--ui-text-base);
    font-weight: 600;
    color: var(--ui-foreground);
  }

  small {
    font-size: var(--ui-text-xs);
    color: var(--ui-foreground-muted);
  }
}

.home-page__matrix-cell {
  display: flex;
  align-items: center;
}

.home-page__size-label {
  width: 7.5rem;
  font-size: var(--ui-text-sm);
  font-variant-numeric: tabular-nums;
  color: var(--ui-foreground-muted);
}

/* A real toolbar: one line, the search growing, the actions pushed right. */
.home-page__toolbar {
  display: flex;
  align-items: center;
  gap: var(--ui-space-md);
  padding: var(--ui-space-md);
  border: 1px solid var(--ui-border-subtle);
  border-radius: var(--ui-radius-xl);
  background: var(--ui-surface);
  flex-wrap: wrap;
}

.home-page__toolbar-search {
  flex: 0 0 14rem;
}

/* Scoped under the toolbar on purpose: VSelect sets `width: 100%` on its own
   root, and a single class here ties with that on specificity and loses on load
   order. */

.home-page__toolbar .home-page__toolbar-select {
  flex: 0 0 11rem;
  width: 11rem;
}

.home-page__toolbar-spacer {
  flex: 1;
}

.home-page__select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}
</style>

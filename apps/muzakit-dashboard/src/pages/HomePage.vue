<script lang="ts" setup>
import { ref } from "vue";

import {
  VCheckbox,
  VInput,
  VSelect,
  VSwitch,
  VToggleGroup,
  VTooltip,
  type SelectOption,
  type ToggleOption,
} from "@muzakit/ui";

const granularity = ref<"DAY" | "WEEK" | "MONTH">("WEEK");

const granularityOptions: ToggleOption<"DAY" | "WEEK" | "MONTH">[] = [
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
</script>

<template>
  <div class="home-page">
    <h1 class="home-page__title">
      Component Demo
    </h1>

    <!-- VToggleGroup -->
    <section class="home-page__section">
      <h2 class="home-page__section-title">
        VToggleGroup
      </h2>
      <div class="home-page__row">
        <VToggleGroup
          v-model="granularity"
          :options="granularityOptions"
          size="lg"
        />
      </div>
      <p class="home-page__caption">
        Selected: <strong>{{ granularity }}</strong>
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
          <button class="home-page__demo-btn">
            Hover me → right
          </button>
        </VTooltip>
        <VTooltip
          placement="top"
          text="Tooltip on top"
        >
          <button class="home-page__demo-btn">
            Hover me → top
          </button>
        </VTooltip>
        <VTooltip
          :allow-html="true"
          placement="bottom"
          text="<b>HTML</b> tooltip with <em>markup</em>"
        >
          <button class="home-page__demo-btn">
            Hover me → html
          </button>
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
  font-size: 0.875rem;
  color: var(--ui-foreground-secondary);
}

.home-page__select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}

.home-page__demo-btn {
  padding: 0.5rem 1rem;
  border-radius: var(--ui-radius);
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  color: var(--ui-foreground);
  font-size: 0.875rem;
  cursor: pointer;

  &:hover {
    background: var(--ui-surface-hover);
  }
}
</style>

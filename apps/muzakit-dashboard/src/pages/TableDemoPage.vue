<script lang="ts" setup>
import { computed, onUnmounted, ref, useTemplateRef, watch } from "vue";

import {
  DeltaIndicator,
  VButton,
  VTable,
  VTag,
  useLinkedTables,
  useToast,
  type Column,
  type ColumnPickerGroup,
  type ExpandableRow,
  type TableHighlightState,
} from "@muzakit/ui";

// ── Table 1: Column Setup + Sorting + Fixed columns ──────────────────────────

const salesColumns: Column<SalesRow>[] = [
  { key: "region", label: "Region", width: "140px", fixed: "left", sortable: true },
  { key: "product", label: "Product", width: "180px", sortable: true },
  { key: "category", label: "Category", width: "140px", sortable: true },
  { key: "units", label: "Units", width: "100px", align: "right", sortable: true, format: { number: { type: "default" } } },
  { key: "revenue", label: "Revenue", width: "140px", align: "right", sortable: true, format: { currency: "USD" } },
  {
    key: "margin",
    label: "Margin %",
    width: "110px",
    align: "right",
    sortable: true,
    format: { percentage: { decimals: 1 } },
  },
  { key: "growth", label: "Growth", width: "110px", align: "right", sortable: true, format: { percentage: { decimals: 1 } } },
  { key: "status", label: "Status", width: "120px", align: "center", sortable: true },
  { key: "channel", label: "Channel", width: "130px", sortable: true },
  { key: "manager", label: "Manager", width: "160px", fixed: "right", sortable: true },
];

// Row shapes are declared: an `ExpandableRow` reads undeclared fields as `unknown`.
interface SalesRow extends ExpandableRow {
  region: string
  product: string
  category: string
  units: number
  revenue: number
  margin: number
  growth: number
  status: string
  channel: string
  manager: string
}

const salesData: SalesRow[] = [
  {
    region: "North America",
    product: "Pro Plan",
    category: "SaaS",
    units: 1240,
    revenue: 186000,
    margin: 0.68,
    growth: 0.12,
    status: "Active",
    channel: "Direct",
    manager: "Sarah Kim",
  },
  {
    region: "Europe",
    product: "Enterprise",
    category: "SaaS",
    units: 530,
    revenue: 318000,
    margin: 0.72,
    growth: 0.08,
    status: "Active",
    channel: "Partner",
    manager: "Tom Müller",
  },
  {
    region: "Asia Pacific",
    product: "Starter Plan",
    category: "SaaS",
    units: 2800,
    revenue: 84000,
    margin: 0.55,
    growth: 0.24,
    status: "Active",
    channel: "Inbound",
    manager: "Yuki Tanaka",
  },
  {
    region: "North America",
    product: "Consulting",
    category: "Services",
    units: 48,
    revenue: 240000,
    margin: 0.40,
    growth: -0.03,
    status: "Active",
    channel: "Direct",
    manager: "Sarah Kim",
  },
  {
    region: "LATAM",
    product: "Pro Plan",
    category: "SaaS",
    units: 620,
    revenue: 93000,
    margin: 0.62,
    growth: 0.31,
    status: "Active",
    channel: "Inbound",
    manager: "Carlos Vega",
  },
  {
    region: "Europe",
    product: "Support Add-on",
    category: "Services",
    units: 210,
    revenue: 63000,
    margin: 0.80,
    growth: 0.05,
    status: "Active",
    channel: "Partner",
    manager: "Tom Müller",
  },
  {
    region: "Middle East",
    product: "Enterprise",
    category: "SaaS",
    units: 90,
    revenue: 54000,
    margin: 0.69,
    growth: 0.17,
    status: "Pilot",
    channel: "Direct",
    manager: "Amir Hassan",
  },
  {
    region: "Asia Pacific",
    product: "Enterprise",
    category: "SaaS",
    units: 310,
    revenue: 186000,
    margin: 0.71,
    growth: 0.19,
    status: "Active",
    channel: "Partner",
    manager: "Yuki Tanaka",
  },
  {
    region: "North America",
    product: "API Access",
    category: "Platform",
    units: 750,
    revenue: 112500,
    margin: 0.85,
    growth: 0.44,
    status: "Active",
    channel: "Self-serve",
    manager: "Sarah Kim",
  },
  {
    region: "Europe",
    product: "Starter Plan",
    category: "SaaS",
    units: 1100,
    revenue: 33000,
    margin: 0.50,
    growth: 0.06,
    status: "Active",
    channel: "Inbound",
    manager: "Tom Müller",
  },
  {
    region: "LATAM",
    product: "Consulting",
    category: "Services",
    units: 22,
    revenue: 110000,
    margin: 0.38,
    growth: -0.08,
    status: "Inactive",
    channel: "Direct",
    manager: "Carlos Vega",
  },
  {
    region: "Africa",
    product: "Starter Plan",
    category: "SaaS",
    units: 340,
    revenue: 10200,
    margin: 0.45,
    growth: 0.52,
    status: "Pilot",
    channel: "Inbound",
    manager: "Amir Hassan",
  },
];

const salesTotal: Record<string, unknown> = {
  region: "TOTAL",
  units: salesData.reduce((s, r) => s + r.units, 0),
  revenue: salesData.reduce((s, r) => s + r.revenue, 0),
  margin: salesData.reduce((s, r) => s + r.margin, 0) / salesData.length,
  growth: salesData.reduce((s, r) => s + r.growth, 0) / salesData.length,
};

const salesSort = ref([]);

// ── Table 4: highlight, fullscreen, column picker ────────────────────────────

const highlightState = ref<TableHighlightState | null>(null);

const pickerGroups: ColumnPickerGroup[] = [
  {
    key: "system",
    label: "System attributes",
    items: [
      { key: "region", label: "Region", icon: "sys" },
      { key: "product", label: "Product", icon: "text" },
      { key: "category", label: "Category", icon: "select" },
    ],
  },
  {
    key: "metrics",
    label: "Metrics",
    items: [
      { key: "units", label: "Units", icon: "number", sortable: true },
      { key: "revenue", label: "Revenue", icon: "number", sortable: true, format: { currency: "USD" } },
      { key: "margin", label: "Margin %", icon: "decimal", sortable: true, format: { percentage: { decimals: 1 } } },
    ],
  },
];

// ── Table 6: loading, refetch, page size, toolbar slots ─────────────────────
// Fake marketplace orders. The parent pages them itself through v-model:page and
// v-model:page-size, so the size changer and the request limit are one value.

type OrderStatus = "Live" | "Paused" | "Out of stock";

const ORDER_PRODUCTS = ["Trail Bottle", "Desk Lamp", "Yoga Mat", "Phone Stand", "Tote Bag", "Kettle"];
const ORDER_CHANNELS = ["Amazon", "TikTok Shop", "Walmart", "Target"];
const ORDER_STATUSES: OrderStatus[] = ["Live", "Live", "Live", "Paused", "Out of stock"];
const STATUS_TONE = { Live: "success", Paused: "warning", "Out of stock": "danger" } as const;

interface OrderRow extends ExpandableRow {
  id: number
  sku: string
  product: string
  channel: string
  units: number
  revenue: number
  delta: number
  status: OrderStatus
}

const makeOrders = (): OrderRow[] => Array.from({ length: 64 }, (_, i) => ({
  id: i + 1,
  sku: `SKU-${String(10240 + i * 7).padStart(5, "0")}`,
  product: ORDER_PRODUCTS[i % ORDER_PRODUCTS.length],
  channel: ORDER_CHANNELS[(i * 3) % ORDER_CHANNELS.length],
  units: 40 + ((i * 37) % 900),
  revenue: 1200 + ((i * 7919) % 48000),
  delta: (((i * 13) % 41) - 18) / 100,
  status: ORDER_STATUSES[(i * 5) % ORDER_STATUSES.length],
}));

const orderColumns: Column<OrderRow>[] = [
  { key: "sku", label: "SKU", width: "130px", fixed: "left" },
  { key: "product", label: "Product", width: "170px", sortable: true },
  { key: "channel", label: "Channel", width: "140px", sortable: true },
  { key: "units", label: "Units", width: "100px", align: "right", sortable: true, format: { number: { type: "default" } } },
  { key: "revenue", label: "Revenue", width: "140px", align: "right", sortable: true, format: { currency: "USD" } },
  { key: "delta", label: "vs last week", width: "130px", align: "right", sortable: true },
  { key: "status", label: "Status", width: "flex", align: "center" },
];

const orders = ref<OrderRow[]>(makeOrders());
const ordersLoading = ref(false);
const ordersPage = ref(1);
const ordersPageSize = ref(10);
const statusFilter = ref<OrderStatus | null>(null);

const filteredOrders = computed(() =>
  statusFilter.value ? orders.value.filter(o => o.status === statusFilter.value) : orders.value);

const pagedOrders = computed(() => {
  const start = (ordersPage.value - 1) * ordersPageSize.value;
  return filteredOrders.value.slice(start, start + ordersPageSize.value);
});

watch([statusFilter, ordersPageSize], () => {
  ordersPage.value = 1;
});

const timers = new Set<ReturnType<typeof setTimeout>>();
const later = (ms: number, fn: () => void) => {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
};
onUnmounted(() => timers.forEach(clearTimeout));

// Rows stay on screen: the table dims them under its overlay, then the new
// figures roll in.
const refetchOrders = () => {
  if (ordersLoading.value) return;
  ordersLoading.value = true;
  later(2000, () => {
    orders.value = orders.value.map(o => ({
      ...o,
      revenue: Math.round(o.revenue * (0.85 + Math.random() * 0.3)),
      delta: Math.round((Math.random() * 0.6 - 0.25) * 100) / 100,
    }));
    ordersLoading.value = false;
  });
};

// Nothing to keep on screen, so the table draws skeleton rows instead.
const reloadOrdersFromEmpty = () => {
  if (ordersLoading.value) return;
  orders.value = [];
  ordersLoading.value = true;
  later(2500, () => {
    orders.value = makeOrders();
    ordersLoading.value = false;
  });
};

const ordersTable = useTemplateRef<{ visibleColumns: ReadonlyArray<Column> }>("ordersTable");
const toast = useToast();
const showVisibleColumns = () => {
  const labels = ordersTable.value?.visibleColumns.map(c => c.label) ?? [];
  toast.success("Visible columns", labels.join(", "));
};

// ── Table 5: linked tables ───────────────────────────────────────────────────
// Both tables register under the same group id, so scrolling or pinning in one
// is mirrored in the other.
const linkA = useLinkedTables("demo-linked", ["demo-linked-b"]);
const linkB = useLinkedTables("demo-linked-b", ["demo-linked"]);

// ── Table 2: 2-level expand (Department → Employee) ──────────────────────────

const deptColumns: Column[] = [
  { key: "name", label: "Name / Department", width: "240px" },
  { key: "role", label: "Role", width: "180px" },
  { key: "location", label: "Location", width: "140px" },
  { key: "tasks", label: "Open Tasks", width: "110px", align: "right", format: { number: { type: "default" } } },
  { key: "salary", label: "Salary / Budget", width: "150px", align: "right", format: { currency: "USD" } },
  { key: "status", label: "Status", width: "120px", align: "center" },
];

const deptData: ExpandableRow[] = [
  {
    name: "Engineering", role: "Department", location: "Remote", tasks: 47, salary: 1820000, status: "Active",
    children: [
      {
        name: "Alice Johnson",
        role: "Frontend Engineer",
        location: "New York",
        tasks: 14,
        salary: 95000,
        status: "Active",
      },
      { name: "Bob Martinez", role: "Backend Engineer", location: "Remote", tasks: 9, salary: 102000, status: "Active" },
      { name: "David Chen", role: "DevOps", location: "San Francisco", tasks: 21, salary: 110000, status: "Active" },
      { name: "Frank O'Brien", role: "Tech Lead", location: "New York", tasks: 3, salary: 130000, status: "Active" },
    ],
  },
  {
    name: "Product", role: "Department", location: "Hybrid", tasks: 23, salary: 860000, status: "Active",
    children: [
      { name: "Clara Kim", role: "Product Designer", location: "Seoul", tasks: 3, salary: 88000, status: "On Leave" },
      { name: "Grace Lin", role: "Product Manager", location: "Remote", tasks: 11, salary: 115000, status: "Active" },
      { name: "Hiro Tanaka", role: "Data Analyst", location: "Tokyo", tasks: 5, salary: 92000, status: "Active" },
      { name: "Elena Vasquez", role: "UX Researcher", location: "Madrid", tasks: 4, salary: 78000, status: "Active" },
    ],
  },
  {
    name: "Sales", role: "Department", location: "Office", tasks: 62, salary: 1240000, status: "Active",
    children: [
      { name: "Marco Rossi", role: "Sales Executive", location: "Milan", tasks: 18, salary: 85000, status: "Active" },
      { name: "Anna Petrova", role: "Account Manager", location: "Berlin", tasks: 22, salary: 79000, status: "Active" },
      { name: "Tom Bradley", role: "Sales Manager", location: "London", tasks: 14, salary: 105000, status: "Active" },
      { name: "Lisa Park", role: "SDR", location: "Remote", tasks: 8, salary: 62000, status: "Inactive" },
    ],
  },
  {
    name: "Finance", role: "Department", location: "Office", tasks: 15, salary: 590000, status: "Active",
    children: [
      { name: "James Wilson", role: "CFO", location: "New York", tasks: 4, salary: 180000, status: "Active" },
      { name: "Mia Chen", role: "Controller", location: "New York", tasks: 7, salary: 115000, status: "Active" },
      { name: "Ethan Brown", role: "Analyst", location: "Remote", tasks: 4, salary: 72000, status: "Active" },
    ],
  },
];

// ── Table 3: 3-level expand (Company → Division → Team) ──────────────────────

const orgColumns: Column[] = [
  { key: "name", label: "Name", width: "220px" },
  { key: "type", label: "Type", width: "130px" },
  { key: "lead", label: "Lead", width: "160px" },
  { key: "headcount", label: "Headcount", width: "110px", align: "right", format: { number: { type: "default" } } },
  { key: "budget", label: "Budget", width: "150px", align: "right", format: { currency: "USD" } },
  { key: "projects", label: "Projects", width: "100px", align: "right", format: { number: {} } },
  { key: "health", label: "Health", width: "110px", align: "center" },
];

const orgData: ExpandableRow[] = [
  {
    name: "Acme Corp",
    type: "Company",
    lead: "CEO: John Hart",
    headcount: 420,
    budget: 24000000,
    projects: 38,
    health: "Healthy",
    children: [
      {
        name: "Technology Division",
        type: "Division",
        lead: "CTO: Sarah Kim",
        headcount: 180,
        budget: 11000000,
        projects: 18,
        health: "Healthy",
        children: [
          {
            name: "Platform Team",
            type: "Team",
            lead: "Frank O'Brien",
            headcount: 32,
            budget: 2800000,
            projects: 5,
            health: "Healthy",
          },
          {
            name: "Mobile Team",
            type: "Team",
            lead: "Grace Lin",
            headcount: 24,
            budget: 2100000,
            projects: 4,
            health: "At Risk",
          },
          {
            name: "Infrastructure",
            type: "Team",
            lead: "David Chen",
            headcount: 18,
            budget: 1900000,
            projects: 3,
            health: "Healthy",
          },
          {
            name: "Security",
            type: "Team",
            lead: "Alice Johnson",
            headcount: 12,
            budget: 1200000,
            projects: 2,
            health: "Healthy",
          },
        ],
      },
      {
        name: "Product Division",
        type: "Division",
        lead: "CPO: Clara Kim",
        headcount: 90,
        budget: 6500000,
        projects: 12,
        health: "Healthy",
        children: [
          {
            name: "Core Product",
            type: "Team",
            lead: "Hiro Tanaka",
            headcount: 28,
            budget: 2400000,
            projects: 4,
            health: "Healthy",
          },
          {
            name: "Growth",
            type: "Team",
            lead: "Elena Vasquez",
            headcount: 20,
            budget: 1600000,
            projects: 5,
            health: "Healthy",
          },
          {
            name: "Design System",
            type: "Team",
            lead: "Bob Martinez",
            headcount: 14,
            budget: 1100000,
            projects: 3,
            health: "At Risk",
          },
        ],
      },
      {
        name: "Go-to-Market Division",
        type: "Division",
        lead: "CMO: Marco Rossi",
        headcount: 150,
        budget: 6500000,
        projects: 8,
        health: "At Risk",
        children: [
          {
            name: "Marketing",
            type: "Team",
            lead: "Anna Petrova",
            headcount: 45,
            budget: 2200000,
            projects: 3,
            health: "Healthy",
          },
          {
            name: "Sales",
            type: "Team",
            lead: "Tom Bradley",
            headcount: 65,
            budget: 2800000,
            projects: 3,
            health: "At Risk",
          },
          {
            name: "Customer Success",
            type: "Team",
            lead: "Lisa Park",
            headcount: 40,
            budget: 1500000,
            projects: 2,
            health: "Healthy",
          },
        ],
      },
    ],
  },
];

const orgTotal: Record<string, unknown> = {
  name: "TOTAL",
  headcount: 420,
  budget: 24000000,
  projects: 38,
};
</script>

<template>
  <div class="table-demo-page">
    <!-- ── Table 1: Column Setup + Sort + Fixed ── -->
    <section class="table-demo-page__section">
      <h2 class="table-demo-page__title">
        Column Setup · Sort · Fixed columns
      </h2>
      <p class="table-demo-page__desc">
        Toolbar with column show/hide & reorder
        (drag-and-drop), multi-column sort, left-fixed Region and right-fixed Manager.
      </p>
      <VTable
        v-model:sort-state="salesSort"
        :columns="salesColumns"
        :data="salesData"
        :height="460"
        :sort="{ type: 'front', multiple: true }"
        :toolbar="{
          enabled: true,
          title: 'Sales Performance',
          subtitle: 'Q1 2026 · All regions',
          search: { placeholder: 'Search rows...' },
          actions: {
            refresh: true,
            resetSort: true,
            columnSetup: { key: 'demo_sales_cols', type: 'sessionStorage', allowReorder: true },
          },
        }"
        :total-row="salesTotal"
        :virtualized="false"
      />
    </section>

    <!-- ── Table 2: 2-level expand ── -->
    <section class="table-demo-page__section">
      <h2 class="table-demo-page__title">
        2-level Expand — Department → Employee
      </h2>
      <p class="table-demo-page__desc">
        Click a department row to expand its employees. Each child row is a regular data row.
      </p>
      <VTable
        :columns="deptColumns"
        :data="deptData"
        :height="520"
        :toolbar="{
          enabled: true,
          title: 'Org Chart (2 levels)',
          subtitle: 'Click a department to expand',
          actions: { refresh: false, resetSort: false },
        }"
        :virtualized="false"
        expand-mode="auto"
      />
    </section>

    <!-- ── Table 4: highlight + fullscreen + column picker ── -->
    <section class="table-demo-page__section">
      <h2 class="table-demo-page__title">
        Pinned cross · Fullscreen · Column picker
      </h2>
      <p class="table-demo-page__desc">
        Pin a row from its first cell and a column from its header to draw the cross.
        The expand button sits in the table's top-right corner; the picker button is
        left of the column-setup one in the toolbar.
      </p>
      <VTable
        v-model:highlight-state="highlightState"
        :columns="salesColumns"
        :data="salesData"
        :height="420"
        :toolbar="{
          enabled: true,
          title: 'Pinned cross',
          subtitle: 'Highlight, fullscreen and the column picker',
          actions: {
            columnSetup: { key: 'demo_hl_cols', type: 'sessionStorage' },
            columnPicker: { groups: pickerGroups, key: 'demo_hl_picker', type: 'sessionStorage' },
          },
        }"
        :virtualized="false"
        highlight
      />
      <p class="table-demo-page__desc">
        Pinned: <code>{{ highlightState?.row?.rowId ?? "—" }}</code> ·
        <code>{{ highlightState?.column?.columnKey ?? "—" }}</code> ·
        cell <code>{{ highlightState?.cell?.formattedValue ?? "—" }}</code>
      </p>
    </section>

    <!-- ── Table 6: loading, refetch, page size, toolbar slots ── -->
    <section class="table-demo-page__section">
      <h2 class="table-demo-page__title">
        Loading · Refetch · Page size · Toolbar slots
      </h2>
      <p class="table-demo-page__desc">
        “Refetch” keeps the rows under a dimmed overlay and rolls the new figures in;
        the toolbar’s refresh button does the same and spins until it finishes.
        “Reload from empty” shows the first-load skeleton. The page-size changer is
        bound with <code>v-model:page-size</code>; the status filter is the
        <code>toolbar-filters</code> slot and the list button is
        <code>toolbar-column-actions</code>, reading the exposed <code>visibleColumns</code>.
      </p>
      <div class="table-demo-page__controls">
        <VButton
          :disabled="ordersLoading"
          icon="lucide:refresh-cw"
          text="Refetch"
          variant="primary"
          @click="refetchOrders"
        />
        <VButton
          :disabled="ordersLoading"
          icon="lucide:database"
          text="Reload from empty"
          variant="secondary"
          @click="reloadOrdersFromEmpty"
        />
      </div>
      <VTable
        ref="ordersTable"
        v-model:page="ordersPage"
        v-model:page-size="ordersPageSize"
        :columns="orderColumns"
        :data="pagedOrders"
        :height="440"
        :loading="ordersLoading"
        :pagination="{ total: filteredOrders.length, pageSizeOptions: [10, 25, 50] }"
        :sort="{ type: 'front', multiple: false }"
        :toolbar="{
          enabled: true,
          title: 'Marketplace orders',
          subtitle: 'Demo data · 64 SKUs',
          actions: {
            refresh: { mode: 'custom', loading: ordersLoading },
            columnSetup: { key: 'demo_orders_cols', type: 'sessionStorage' },
          },
        }"
        :virtualized="false"
        highlight
        @toolbar:refresh="refetchOrders"
      >
        <template #toolbar-filters>
          <div class="table-demo-page__filters">
            <VButton
              :variant="statusFilter === null ? 'primary' : 'neutral'"
              text="All"
              @click="statusFilter = null"
            />
            <VButton
              v-for="status in (['Live', 'Paused', 'Out of stock'] as const)"
              :key="status"
              :text="status"
              :variant="statusFilter === status ? 'primary' : 'neutral'"
              @click="statusFilter = status"
            />
          </div>
        </template>
        <template #toolbar-column-actions>
          <VButton
            aria-label="Show visible columns"
            icon="lucide:list-checks"
            variant="neutral"
            @click="showVisibleColumns"
          />
        </template>
        <template #cell-delta="{ value }">
          <DeltaIndicator
            :format="{ percentage: { decimals: 0 } }"
            :value="Number(value)"
            show-zero
          />
        </template>
        <template #cell-status="{ row }">
          <VTag
            :color="STATUS_TONE[row.status]"
            :label="row.status"
            size="sm"
            variant="outline"
          />
        </template>
      </VTable>
    </section>

    <!-- ── Table 5: linked tables ── -->
    <section class="table-demo-page__section">
      <h2 class="table-demo-page__title">
        Linked tables
      </h2>
      <p class="table-demo-page__desc">
        Two tables in one group: scrolling either one scrolls the other, and a pin in
        one is mirrored in the other.
      </p>
      <VTable
        v-bind="linkA.link"
        :columns="salesColumns"
        :data="salesData"
        :height="240"
        :virtualized="false"
        highlight
      />
      <VTable
        v-bind="linkB.link"
        :columns="salesColumns"
        :data="salesData"
        :height="240"
        :virtualized="false"
        highlight
      />
    </section>

    <!-- ── Table 3: 3-level expand ── -->
    <section class="table-demo-page__section">
      <h2 class="table-demo-page__title">
        3-level Expand — Company → Division → Team
      </h2>
      <p class="table-demo-page__desc">
        Three levels of nesting. Expand Acme Corp to see divisions, then each division to see teams.
      </p>
      <VTable
        :columns="orgColumns"
        :data="orgData"
        :height="560"
        :toolbar="{
          enabled: true,
          title: 'Org Structure (3 levels)',
          subtitle: 'Company → Division → Team',
          actions: { refresh: false, resetSort: false },
        }"
        :total-row="orgTotal"
        :virtualized="false"
        expand-mode="auto"
      />
    </section>
  </div>
</template>

<style scoped>
.table-demo-page {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 2rem;
  max-width: 1400px;
}

.table-demo-page__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.table-demo-page__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-foreground);
  margin: 0;
}

.table-demo-page__controls,
.table-demo-page__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.table-demo-page__desc {
  font-size: 0.875rem;
  color: var(--ui-foreground-secondary);
  margin: 0;
  line-height: 1.5;
}
</style>

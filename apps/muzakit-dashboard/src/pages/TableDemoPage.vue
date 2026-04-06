<script lang="ts" setup>
import { ref } from "vue";

import { VTable, type Column, type ExpandableRow } from "@muzakit/ui";

// ── Table 1: Column Setup + Sorting + Fixed columns ──────────────────────────

const salesColumns: Column[] = [
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

const salesData: ExpandableRow[] = [
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
  units: salesData.reduce((s, r) => s + (r.units as number), 0),
  revenue: salesData.reduce((s, r) => s + (r.revenue as number), 0),
  margin: salesData.reduce((s, r) => s + (r.margin as number), 0) / salesData.length,
  growth: salesData.reduce((s, r) => s + (r.growth as number), 0) / salesData.length,
};

const salesSort = ref([]);

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

.table-demo-page__desc {
  font-size: 0.875rem;
  color: var(--ui-foreground-secondary);
  margin: 0;
  line-height: 1.5;
}
</style>

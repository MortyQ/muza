// Global component types live outside index.ts on purpose: declaring them
// alongside the component exports makes index.ts part of its own components'
// type-resolution graph, and the resulting cycle degrades inferred types to
// `any` (TS7022) in components that use globally registered children.

export {};

declare module "vue" {
  export interface GlobalComponents {
    NavigationSidebar: typeof import("./components/navigation-sidebar/NavigationSidebar.vue").default
    VAvatar: typeof import("./components/base/VAvatar.vue").default
    VButton: typeof import("./components/base/VButton.vue").default
    VIcon: typeof import("./components/base/VIcon.vue").default
    VTag: typeof import("./components/base/VTag.vue").default
    VThemeSwitcher: typeof import("./components/base/VThemeSwitcher.vue").default
    VInput: typeof import("./components/inputs/VInput.vue").default
    VDatepicker: typeof import("./components/inputs/VDatepicker.vue").default
    VCheckbox: typeof import("./components/inputs/VCheckbox.vue").default
    VSwitch: typeof import("./components/inputs/VSwitch.vue").default
    VSelect: typeof import("./components/inputs/VSelect.vue").default
    VSegmentedControl: typeof import("./components/inputs/VSegmentedControl.vue").default
    VToggleGroup: typeof import("./components/inputs/VToggleGroup.vue").default
    VTooltip: typeof import("./components/overlay/VTooltip.vue").default
    VDrawer: typeof import("./components/overlay/VDrawer.vue").default
    VModal: typeof import("./components/overlay/VModal.vue").default
    VTab: typeof import("./components/layout/VTab.vue").default
    VCard: typeof import("./components/layout/VCard.vue").default
    VAnimatedBackground: typeof import("./components/layout/VAnimatedBackground.vue").default
    VFloating: typeof import("./components/overlay/VFloating.vue").default
    VToaster: typeof import("./components/feedback/VToaster.vue").default
    VLoader: typeof import("./components/feedback/VLoader.vue").default
    VProgressBar: typeof import("./components/feedback/VProgressBar.vue").default
    VTablePagination: typeof import("./components/table/components/TablePagination.vue").default
    TableTitleBlock: typeof import("./components/table/components/TableTitleBlock.vue").default
    TableEmptyState: typeof import("./components/table/components/TableEmptyState.vue").default
    TablePeriodSelect: typeof import("./components/table/components/TablePeriodSelect.vue").default
    DeltaValue: typeof import("./components/table/components/DeltaValue.vue").default
    DeltaIndicator: typeof import("./components/table/components/DeltaIndicator.vue").default
    VAccordion: typeof import("./components/layout/VAccordion.vue").default
    VInfoNotice: typeof import("./components/layout/VInfoNotice.vue").default
    VScrollPanel: typeof import("./components/layout/VScrollPanel.vue").default
    VChip: typeof import("./components/base/VChip.vue").default
    DragNDrop: typeof import("./components/inputs/DragNDrop.vue").default
    VFileUpload: typeof import("./components/inputs/VFileUpload.vue").default
    VListEditor: typeof import("./components/inputs/VListEditor.vue").default
    NavigationGuardModal: typeof import("./components/overlay/NavigationGuardModal.vue").default
    VTable: typeof import("./components/table/VTable.vue").default
  }
}

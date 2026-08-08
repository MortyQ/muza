// Type-only: pulls in the `GlobalComponents` augmentation without making
// index.ts part of its own components' type-resolution graph.
import type {} from "./global-components";

import "./styles/tokens.css";

export { default as VAvatar } from "./components/base/VAvatar.vue";
export { default as VButton } from "./components/base/VButton.vue";
export {
  default as VChip, type ChipVariant, type ChipColor, type ChipSize,
} from "./components/base/VChip.vue";
export { default as VIcon } from "./components/base/VIcon.vue";
export { default as VTag, type TagVariant, type TagColor, type TagSize } from "./components/base/VTag.vue";
export { default as VThemeSwitcher, type ThemeOption } from "./components/base/VThemeSwitcher.vue";
export { default as VInput } from "./components/inputs/VInput.vue";
export { default as DragNDrop } from "./components/inputs/DragNDrop.vue";
export { default as VFileUpload } from "./components/inputs/VFileUpload.vue";
export { default as VListEditor } from "./components/inputs/VListEditor.vue";
export {
  listEditorToTextList,
  textListToListEditorItems,
  type ListEditorItem,
} from "./components/inputs/VListEditor.utils";
export { default as VDatepicker } from "./components/inputs/VDatepicker.vue";
export { default as VCheckbox, type CheckboxValue, type CheckboxModelValue } from "./components/inputs/VCheckbox.vue";
export { default as VSwitch } from "./components/inputs/VSwitch.vue";
export { default as VSelect } from "./components/inputs/VSelect.vue";
export { default as VSegmentedControl, type SegmentOption } from "./components/inputs/VSegmentedControl.vue";
export { default as VToggleGroup, type ToggleOption } from "./components/inputs/VToggleGroup.vue";
export { default as VTooltip } from "./components/overlay/VTooltip.vue";
export { default as VDrawer } from "./components/overlay/VDrawer.vue";
export { default as VModal } from "./components/overlay/VModal.vue";
export {
  default as NavigationGuardModal, type NavigationGuardModalProps,
} from "./components/overlay/NavigationGuardModal.vue";
export { default as VTab } from "./components/layout/VTab.vue";
export {
  default as VAccordion, type AccordionItem, type AccordionVariant,
} from "./components/layout/VAccordion.vue";
export {
  default as VInfoNotice, type NoticeTone, type NoticeFeature,
} from "./components/layout/VInfoNotice.vue";
export { default as VScrollPanel } from "./components/layout/VScrollPanel.vue";
export {
  default as VCard, type CardSize, type CardVariant, type CardRadius, type CardPadding,
} from "./components/layout/VCard.vue";
export { default as VAnimatedBackground } from "./components/layout/VAnimatedBackground.vue";
export { default as VFloating } from "./components/overlay/VFloating.vue";
export { default as VToaster } from "./components/feedback/VToaster.vue";
export { default as VLoader } from "./components/feedback/VLoader.vue";
export { default as VProgressBar } from "./components/feedback/VProgressBar.vue";
export { default as VTable } from "./components/table/VTable.vue";
export type { Column, SortItem, PaginationConfig, ToolbarConfig, ExpandableRow } from "./components/table/types/index";
export type { TableProps } from "./components/table/types/props";

export { useToast } from "./composables/useToast";
export { useModal } from "./composables/useModal";
export { useModalRegisterer, type Modal } from "./composables/useModalRegister";
export {
  useNavigationGuard,
  type UseNavigationGuardOptions,
  type UseNavigationGuardReturn,
} from "./composables/useNavigationGuard";

export type { FieldValidation } from "./types/validation";
export type { SelectOption } from "./types/select";
export {
  isSameModelValue,
  type VModelValue,
  type SelectValue,
  type SingleSelectValue,
  type MultipleSelectValue,
  type ValueComparator,
  type VModelSelectProps,
} from "./types/vmodel";

// ── Navigation Sidebar ──────────────────────────────────────────────────────
export {
  NavigationSidebar,
  createSidebar,
  useSidebarState,
  useNavigation,
  buildMenuTree,
} from "./components/navigation-sidebar";
export type {
  SidebarNavItem,
  SidebarOptions,
  SidebarInstance,
  SidebarRouteMeta,
  FlatMenuItem,
} from "./components/navigation-sidebar";

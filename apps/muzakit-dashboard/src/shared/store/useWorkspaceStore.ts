import { computed, ref } from "vue";

import { defineStore } from "pinia";

export interface WorkspaceMode {
  id: string
  label: string
  description: string
}

// Mock: there is no workspace endpoint yet, so the modes and the switch latency
// are both stand-ins for what the API will return.
const MODES: ReadonlyArray<WorkspaceMode> = [
  { id: "personal", label: "Personal", description: "Only you" },
  { id: "team", label: "Team", description: "Shared with your team" },
  { id: "organization", label: "Organization", description: "Every team and billing" },
];

const SWITCH_DELAY_MS = 600;

export const useWorkspaceStore = defineStore("workspace", () => {
  const modes = ref<ReadonlyArray<WorkspaceMode>>(MODES);
  const activeModeId = ref<string>(MODES[0].id);
  const switching = ref(false);

  const activeMode = computed<WorkspaceMode>(
    () => modes.value.find(m => m.id === activeModeId.value) ?? modes.value[0],
  );

  const activeIndex = computed(() => modes.value.indexOf(activeMode.value));

  async function switchMode(id: string): Promise<void> {
    if (id === activeModeId.value || switching.value) return;

    switching.value = true;
    try {
      await new Promise(resolve => setTimeout(resolve, SWITCH_DELAY_MS));
      activeModeId.value = id;
    }
    finally {
      switching.value = false;
    }
  }

  return { modes, activeModeId, switching, activeMode, activeIndex, switchMode };
});

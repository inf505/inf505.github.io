// frontend/components/LoadingSpinner.js

import { useUiStore } from "../stores/useUiStore.js";

export default {
  name: "LoadingSpinner",
  setup() {
    const uiStore = useUiStore();
    return { uiStore };
  },
  template: `
    <div v-if="uiStore.isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  `,
};

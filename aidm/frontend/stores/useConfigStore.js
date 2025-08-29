// frontend/stores/useConfigStore.js
import { defineStore } from "pinia";

// [REFACTORED] Namespaced key to prevent localStorage collisions.
const API_KEY_STORAGE_KEY = "aidm_geminiApiKey";

export const useConfigStore = defineStore("config", {
  state: () => ({
    apiKey: "",
  }),

  getters: {
    hasApiKey: (state) => !!state.apiKey,
  },

  actions: {
    initialize() {
      // [REFACTORED] Use namespaced key.
      this.apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || "";
      console.log(
        "[ConfigStore] Initialized. API key loaded from localStorage."
      );
    },

    setApiKey(newKey) {
      const trimmedKey = newKey.trim();
      this.apiKey = trimmedKey;
      if (trimmedKey) {
        // [REFACTORED] Use namespaced key.
        localStorage.setItem(API_KEY_STORAGE_KEY, trimmedKey);
      } else {
        // [REFACTORED] Use namespaced key.
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    },
  },
});

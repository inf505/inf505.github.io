// frontend/stores/useConfigStore.js
import { defineStore } from "pinia";

export const useConfigStore = defineStore("config", {
  state: () => ({
    apiKey: "",
  }),

  getters: {
    hasApiKey: (state) => !!state.apiKey,
  },

  actions: {
    initialize() {
      this.apiKey = localStorage.getItem("geminiApiKey") || "";
      console.log(
        "[ConfigStore] Initialized. API key loaded from localStorage."
      );
    },

    setApiKey(newKey) {
      const trimmedKey = newKey.trim();
      this.apiKey = trimmedKey;
      if (trimmedKey) {
        localStorage.setItem("geminiApiKey", trimmedKey);
      } else {
        localStorage.removeItem("geminiApiKey");
      }
    },
  },
});

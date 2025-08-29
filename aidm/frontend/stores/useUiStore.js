// frontend/stores/useUiStore.js
import { defineStore } from "pinia";

export const useUiStore = defineStore("ui", {
  state: () => ({
    loadingTask: null,
    errorMessage: "",
    isRateLimited: false, // <-- NEW
    rateLimitSeconds: 0, // <-- NEW
    rateLimitTimerId: null, // <-- NEW
    showDebugPanel: localStorage.getItem("showDebugPanel") === "true",
    showForgetButton: false,
    notifications: [],
    popover: {
      isVisible: false,
      title: "",
      description: "",
      contextItem: null,
      target: null,
    },
    isSidebarOpen: false,
    isSettingsModalOpen: false,
  }),
  actions: {
    startRateLimitCountdown(seconds) {
      if (this.rateLimitTimerId) {
        clearInterval(this.rateLimitTimerId);
      }

      this.isRateLimited = true;
      this.errorMessage = ""; // Explicitly clear any generic error
      this.rateLimitSeconds = seconds;

      this.rateLimitTimerId = setInterval(() => {
        this.rateLimitSeconds -= 1;
        if (this.rateLimitSeconds <= 0) {
          clearInterval(this.rateLimitTimerId);
          this.rateLimitTimerId = null;
          this.isRateLimited = false;
          // The success notification that was here has been removed.
        }
      }, 1000);
    },

    openSettingsModal() {
      this.isSettingsModalOpen = true;
    },
    closeSettingsModal() {
      this.isSettingsModalOpen = false;
    },

    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen;
    },
    closeSidebar() {
      this.isSidebarOpen = false;
    },

    setLoadingTask(taskName) {
      this.loadingTask = taskName;
      this.errorMessage = "";
      this.showForgetButton = false;
    },
    clearLoadingTask() {
      this.loadingTask = null;
    },
    setError(message) {
      this.errorMessage = message;
      this.loadingTask = null;
      if (message && message.includes("safety filter")) {
        this.showForgetButton = true;
      }
    },
    clearError() {
      this.errorMessage = "";
    },
    setUiPreferences(prefs) {
      if (typeof prefs.showDebugPanel !== "undefined") {
        this.showDebugPanel = prefs.showDebugPanel;
        localStorage.setItem("showDebugPanel", this.showDebugPanel.toString());
      }
    },
    addNotification({ message, type = "info", duration = 5000 }) {
      const id = Date.now() + Math.random();
      this.notifications.push({ id, message, type });

      setTimeout(() => {
        this.removeNotification(id);
      }, duration);
    },
    removeNotification(id) {
      const index = this.notifications.findIndex((n) => n.id === id);
      if (index !== -1) {
        this.notifications.splice(index, 1);
      }
    },
    showInfoPopover({ title, description, contextItem = null, target = null }) {
      const isSameTarget = this.popover.target === target;
      const wasVisible = this.popover.isVisible;

      if (wasVisible) {
        this.hideInfoPopover();
      }

      if (wasVisible && isSameTarget) {
        return;
      }

      this.popover.isVisible = true;
      this.popover.title = title;
      this.popover.description = description;
      this.popover.contextItem = contextItem;
      this.popover.target = target;
    },
    hideInfoPopover() {
      this.popover.isVisible = false;
      this.popover.title = "";
      this.popover.description = "";
      this.popover.contextItem = null;
      this.popover.target = null;
    },
  },
});

// frontend/stores/useUiStore.js
import { defineStore } from "pinia";

export const useUiStore = defineStore("ui", {
  state: () => ({
    loadingTask: null,
    errorMessage: "",
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
    isRateLimited: false,
    rateLimitCooldown: 0,
    rateLimitIntervalId: null,
    isSettingsOpen: false,
    pendingAction: null,
    postReloadMessage: null,
  }),
  actions: {
    // --- NEW: Pending Action Workflow ---
    setPendingAction(action) {
      if (typeof action === "function") {
        this.pendingAction = action;
      }
    },
    executePendingAction() {
      if (this.pendingAction) {
        console.log("[UI] Executing pending action after settings save.");
        this.pendingAction();
        this.pendingAction = null; // Clear the action after execution
      }
    },
    // --- END NEW ---

    openSettings() {
      this.isSettingsOpen = true;
    },

    closeSettings() {
      this.isSettingsOpen = false;
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
      if (typeof message !== "string") {
        console.error(
          `[useUiStore] setError called with invalid type: ${typeof message}. Using fallback message.`
        );
        this.errorMessage = "An unexpected client-side error occurred.";
        this.loadingTask = null;
        return;
      }

      this.errorMessage = message;
      this.loadingTask = null;
      if (message.includes("safety filter")) {
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
    startRateLimitCountdown(initialCooldownSeconds) {
      if (this.rateLimitIntervalId) {
        clearInterval(this.rateLimitIntervalId);
      }

      this.isRateLimited = true;
      this.rateLimitCooldown = initialCooldownSeconds;

      this.rateLimitIntervalId = setInterval(() => {
        this.rateLimitCooldown -= 1;
        if (this.rateLimitCooldown <= 0) {
          clearInterval(this.rateLimitIntervalId);
          this.rateLimitIntervalId = null;
          this.isRateLimited = false;
          this.rateLimitCooldown = 0;
          this.clearError();
          this.addNotification({
            message: "API is ready. You may proceed.",
            type: "success",
          });
        }
      }, 1000);
    },
  },
});

// frontend/components/ErrorMessage.js
import { useUiStore } from "../stores/useUiStore.js";

export default {
  name: "ErrorMessage",
  setup() {
    const uiStore = useUiStore();
    return { uiStore };
  },
  template: `
    <transition name="toast">
      <div v-if="uiStore.isRateLimited" class="notification-toast notification-toast--warning">
        <p>
          <strong>Rate limit reached.</strong> Please wait {{ uiStore.rateLimitSeconds }} seconds before trying again.
        </p>
      </div>
      <div v-else-if="uiStore.errorMessage" class="notification-toast notification-toast--error">
        <p>{{ uiStore.errorMessage }}</p>
        <button @click="uiStore.clearError()" class="btn-close-toast" aria-label="Dismiss Error">×</button>
      </div>
    </transition>
  `,
};

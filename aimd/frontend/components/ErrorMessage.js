// frontend/components/ErrorMessage.js
import { useUiStore } from "../stores/useUiStore.js";

export default {
  name: "ErrorMessage",
  setup() {
    const uiStore = useUiStore();
    return { uiStore };
  },
  template: `
    <div v-if="uiStore.errorMessage" class="notification-container" role="alert">
      <transition name="toast">
        <div v-if="uiStore.errorMessage" class="notification-toast notification-toast--error">
          
          <!-- Case 1: Display Rate Limit Countdown -->
          <div v-if="uiStore.isRateLimited" class="rate-limit-message">
            <div class="spinner-tiny"></div>
            <p>
              API rate limit exceeded. Please wait 
              <strong>{{ uiStore.rateLimitCooldown }}s</strong>.
            </p>
          </div>

          <!-- Case 2: Display Generic Error -->
          <p v-else>{{ uiStore.errorMessage }}</p>

          <button 
            v-if="!uiStore.isRateLimited" 
            @click="uiStore.clearError()" 
            class="btn-close-toast" 
            aria-label="Dismiss Error"
          >×</button>
        </div>
      </transition>
    </div>
  `,
};

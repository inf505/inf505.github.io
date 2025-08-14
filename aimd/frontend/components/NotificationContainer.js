// frontend/components/NotificationContainer.js

import { onMounted } from "vue";
import { useUiStore } from "/stores/useUiStore.js";

export default {
  name: "NotificationContainer",
  setup() {
    const uiStore = useUiStore();

    // This hook runs after the component is mounted to the DOM.
    onMounted(() => {
      // Check if a special message was queued after a page reload.
      if (uiStore.postReloadMessage) {
        // If so, add it to the regular notification array to be displayed.
        uiStore.addNotification(uiStore.postReloadMessage);
        // Clear the queued message so it doesn't show again.
        uiStore.postReloadMessage = null;
      }
    });

    return { uiStore };
  },
  template: `
        <div class="notification-container">
            <transition-group name="toast" tag="div">
                <div v-for="notification in uiStore.notifications" 
                     :key="notification.id"
                     class="notification-toast"
                     :class="'notification-toast--' + notification.type">
                    <p>{{ notification.message }}</p>
                </div>
            </transition-group>
        </div>
    `,
};

// frontend/components/NotificationContainer.js

import { useUiStore } from "../stores/useUiStore.js";

export default {
  name: "NotificationContainer",
  setup() {
    const uiStore = useUiStore();
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

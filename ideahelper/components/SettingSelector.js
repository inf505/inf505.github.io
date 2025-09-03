// components/SettingSelector.js
import { useStoryStore } from "../store/useStoryStore.js";

export const SettingSelector = {
  setup() {
    const store = useStoryStore();

    return {
      store,
    };
  },
  template: `
    <div class="card-grid">
      <div 
        v-for="setting in store.settings" 
        :key="setting.name" 
        class="card"
        @click="store.selectSetting(setting)"
        tabindex="0"
        @keydown.enter.prevent="store.selectSetting(setting)"
        @keydown.space.prevent="store.selectSetting(setting)"
      >
        <h3 class="card-title">{{ setting.name }}</h3>
        <p class="card-description">{{ setting.description }}</p>
      </div>
    </div>
  `,
};

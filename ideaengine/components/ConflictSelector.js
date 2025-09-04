// components/ConflictSelector.js
import { useStoryStore } from "../store/useStoryStore.js";

export const ConflictSelector = {
  setup() {
    const store = useStoryStore();

    return {
      store,
    };
  },
  template: `
    <div class="card-grid">
      <div 
        v-for="(conflict, index) in store.conflicts" 
        :key="index" 
        class="card"
        @click="store.selectConflict(conflict)"
        tabindex="0"
        @keydown.enter.prevent="store.selectConflict(conflict)"
        @keydown.space.prevent="store.selectConflict(conflict)"
      >
        <!-- The description is the primary text here -->
        <p class="card-description main-description">{{ conflict.description }}</p>
        <div class="card-footer">
          <span class="card-tag">{{ conflict.type }}</span>
        </div>
      </div>
    </div>
  `,
};

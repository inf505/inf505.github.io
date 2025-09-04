// components/ProtagonistSelector.js
import { useStoryStore } from "../store/useStoryStore.js";

export const ProtagonistSelector = {
  setup() {
    const store = useStoryStore();

    return {
      store,
    };
  },
  template: `
    <div class="card-grid">
      <div 
        v-for="protagonist in store.protagonists" 
        :key="protagonist.archetype" 
        class="card"
        @click="store.selectProtagonist(protagonist)"
        tabindex="0"
        @keydown.enter.prevent="store.selectProtagonist(protagonist)"
        @keydown.space.prevent="store.selectProtagonist(protagonist)"
      >
        <h3 class="card-title">{{ protagonist.archetype }}</h3>
        <div class="card-details">
          <p><strong>Motivation:</strong> {{ protagonist.motivation }}</p>
          <p><strong>Flaw:</strong> {{ protagonist.flaw }}</p>
        </div>
      </div>
    </div>
  `,
};

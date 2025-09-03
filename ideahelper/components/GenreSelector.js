// components/GenreSelector.js
import { useStoryStore } from "../store/useStoryStore.js";

export const GenreSelector = {
  setup() {
    const store = useStoryStore();

    // No need for storeToRefs here if we only access store/actions in the template
    return {
      store,
    };
  },
  template: `
    <div class="card-grid">
      <div 
        v-for="genre in store.genres" 
        :key="genre.name" 
        class="card"
        @click="store.selectGenre(genre)"
        tabindex="0"
        @keydown.enter.prevent="store.selectGenre(genre)"
        @keydown.space.prevent="store.selectGenre(genre)"
      >
        <h3 class="card-title">{{ genre.name }}</h3>
        <p class="card-description">{{ genre.description }}</p>
      </div>
    </div>
  `,
};

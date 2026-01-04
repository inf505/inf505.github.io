// frontend/components/ClassSelection.js

import { useCharacterCreationStore } from "../stores/useCharacterCreationStore.js";
import { useGameStore } from "../stores/useGameStore.js";

export default {
  name: "ClassSelection",
  setup() {
    const creationStore = useCharacterCreationStore();
    const gameStore = useGameStore();

    const handleSelectClass = async (classData) => {
      gameStore.setGameState("archetype-selection");
      await creationStore.selectClass(classData);
    };

    return {
      creationStore,
      handleSelectClass,
    };
  },

  template: `
    <div class="class-selection">
      
      <!-- REMOVED name input container -->

      <div v-if="creationStore.classes && creationStore.classes.length > 0" class="class-selection__grid">
        <div 
          v-for="classItem in creationStore.classes" 
          :key="classItem.name"
          class="class-selection__card"
          @click="handleSelectClass(classItem)"
          :style="{ '--bg-image-url': 'url(https://inf505.github.io/aidm/frontend/images/' + classItem.name.toLowerCase() + '.png)' }"
        >
          <div class="class-selection__text-content">
            <div>
              <h3 class="class-card__title">{{ classItem.name }}</h3>
              <p v-if="classItem.description" class="class-card__description">
                {{ classItem.description }}
              </p>
            </div>
            <span class="btn btn-primary class-card__button">Select Path</span>
          </div>
        </div>
      </div>
      
      <div v-else>
        <p class="help-text">No character classes available. This may indicate a server issue.</p>
      </div>
    </div>
  `,
};

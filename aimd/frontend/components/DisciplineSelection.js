// frontend/components/DisciplineSelection.js
import { computed } from "vue";
import { useCharacterCreationStore } from "../stores/useCharacterCreationStore.js";
import { useGameStore } from "../stores/useGameStore.js";

export default {
  name: "DisciplineSelection",
  setup() {
    const creationStore = useCharacterCreationStore();
    const gameStore = useGameStore();

    const handleSelectDiscipline = async (disciplineData) => {
      await creationStore.selectDiscipline(disciplineData);
    };

    // This computed property creates a robust two-way binding with the store.
    const characterName = computed({
      get: () => creationStore.characterName,
      set: (value) => creationStore.setCharacterName(value),
    });

    return {
      creationStore,
      handleSelectDiscipline,
      characterName, // Expose the computed property to the template
    };
  },

  template: `
    <div class="discipline-selection">
      
      <div class="character-name-input-container">
        <label for="characterNameInput" class="form-label">Doctor's Name</label>
        <input 
            type="text" 
            id="characterNameInput" 
            class="form-input" 
            placeholder="Enter a name (e.g., Dr. Smith) or leave blank" 
            v-model="characterName"
            @keydown.enter.prevent
        >
      </div>

      <div v-if="creationStore.disciplines && creationStore.disciplines.length > 0" class="discipline-selection__grid">
        <div 
          v-for="disciplineItem in creationStore.disciplines" 
          :key="disciplineItem.name"
          class="discipline-selection__card"
          @click="handleSelectDiscipline(disciplineItem)"


  :style="{ 
    backgroundImage: 'url(https://inf505.github.io/aimd/frontend/images/' + disciplineItem.image + '.png)',
    backgroundSize: '90px auto',
    backgroundPosition: 'left 15px',
    backgroundRepeat: 'no-repeat'
  }"
          
        >
          <div class="discipline-selection__text-content">
            <div>
              <h3 class="discipline-card__title">{{ disciplineItem.name }}</h3>
              <p v-if="disciplineItem.description" class="discipline-card__description">
                {{ disciplineItem.description }}
              </p>
            </div>
            <span class="btn btn-primary discipline-card__button">Choose Discipline</span>
          </div>
        </div>
      </div>
      
      <div v-else>
        <p class="help-text">No medical disciplines available. This may indicate a server issue.</p>
      </div>
    </div>
  `,
};

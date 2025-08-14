// frontend/components/SpecializationSelection.js
import { useCharacterCreationStore } from "../stores/useCharacterCreationStore.js";

export default {
  name: "SpecializationSelection",
  setup() {
    const creationStore = useCharacterCreationStore();

    const handleSelectSpecialization = async (specialization) => {
      creationStore.selectSpecialization(specialization);
      // This will now proceed to the case selection screen
      await creationStore.finalizeCharacter();
    };

    return {
      creationStore,
      handleSelectSpecialization,
    };
  },

  template: `
    <div class="specialization-selection">
      <h2>Select Your Specialization</h2>
      
      <div class="character-name-input-container">
          <label for="characterNameInputSpecialization" class="form-label">Doctor's Name</label>
          <input 
              type="text" 
              id="characterNameInputSpecialization" 
              class="form-input" 
              placeholder="Confirm name or leave blank" 
              v-model="creationStore.characterName"
              @keydown.enter.prevent
          >
      </div>

      <p class="help-text">
        Your specialization defines your starting stats, unique trait, and core equipment. This choice solidifies your professional identity and capabilities.
      </p>
      
      <div v-if="creationStore.specializations && creationStore.specializations.length > 0" class="specialization-selection__list">
        <div v-for="specialization in creationStore.specializations" :key="specialization.specialization" class="specialization-selection__card">
          <div class="specialization-card__header">
            <h3 class="specialization-card__title">{{ specialization.specialization }}</h3>
            <button @click="handleSelectSpecialization(specialization)" class="btn btn-primary">Select</button>
          </div>
          <p class="specialization-card__description">{{ specialization.description }}</p>

          <div v-if="specialization.professional_boundaries" class="specialization-card__boundaries">
            <strong>Professional Scope:</strong>
            <p>{{ specialization.professional_boundaries }}</p>
          </div>

          <div v-if="specialization.ratings" class="specialization-card__ratings">
            <div class="rating-item rating-item--stars">
              <strong class="rating-label">Complexity</strong>
              <div class="rating-value--stars">
                <span v-for="n in 5" :key="n" class="star" :class="{ 'filled': n <= specialization.ratings.complexity }">★</span>
              </div>
            </div>
            <div class="rating-item">
              <strong class="rating-label">Pace</strong>
              <span class="rating-tag">{{ specialization.ratings.pace }}</span>
            </div>
            <div class="rating-item">
              <strong class="rating-label">Approach</strong>
              <span class="rating-tag">{{ specialization.ratings.approach }}</span>
            </div>
            <div class="rating-item">
              <strong class="rating-label">Stress Profile</strong>
              <span class="rating-tag">{{ specialization.ratings.stress_profile }}</span>
            </div>
          </div>
          
          <div class="specialization-card__footer">
            <div v-if="specialization.items && specialization.items.length > 0" class="specialization-card__items">
              <strong>Reference Material:</strong>
              <ul>
                <li 
                  v-for="item in specialization.items" 
                  :key="item.name" 
                  :title="item.description"
                >
                  {{ item.name }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div v-else>
         <p class="help-text">No specializations are available for the {{ creationStore.selectedDiscipline?.name || 'selected' }} discipline. Please check the backend data.</p>
      </div>
    </div>
  `,
};

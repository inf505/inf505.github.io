// main.js
import { createApp, onMounted, computed } from "vue";
import { createPinia, storeToRefs } from "pinia";
import { useStoryStore } from "./store/useStoryStore.js";
import { GenreSelector } from "./components/GenreSelector.js";
import { ProtagonistSelector } from "./components/ProtagonistSelector.js";
import { ConflictSelector } from "./components/ConflictSelector.js";
import { SettingSelector } from "./components/SettingSelector.js";
import { SettingsModal } from "./components/SettingsModal.js";

const pinia = createPinia();

const App = {
  components: {
    GenreSelector,
    ProtagonistSelector,
    ConflictSelector,
    SettingSelector,
    SettingsModal,
  },
  setup() {
    const store = useStoryStore();
    const {
      loading,
      error,
      currentStep,
      isGenerating,
      generatedOutline,
      generationError,
    } = storeToRefs(store);

    onMounted(() => {
      store.fetchAllData();
    });

    const currentStepTitle = computed(() => {
      switch (currentStep.value) {
        case "genre":
          return "Choose a Genre";
        case "protagonist":
          return "Choose a Protagonist";
        case "conflict":
          return "Choose a Central Conflict";
        case "setting":
          return "Choose a Setting";
        case "outline":
          return "Generation Workspace";
        default:
          return "Welcome";
      }
    });

    return {
      store, // Expose the whole store for v-model
      loading,
      error,
      currentStep,
      currentStepTitle,
      isGenerating,
      generatedOutline,
      generationError,
    };
  },
  template: `
    <settings-modal></settings-modal>
    <header>
      <h1>Idea Helper</h1>
      <button @click="store.toggleSettingsModal()" class="btn-settings" aria-label="Settings">⚙️</button>
    </header>
    <main>
      <div v-if="loading" class="loading-state">
        <p>Loading creative elements...</p>
      </div>
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
      </div>
      <div v-else class="wizard-container">
        <div class="wizard-header">
          <h2>{{ currentStepTitle }}</h2>
          <button 
            v-if="['genre', 'protagonist', 'conflict', 'setting'].includes(currentStep)"
            @click="store.reShuffle()"
            class="btn-shuffle"
          >
            Shuffle Choices
          </button>
        </div>

        <genre-selector v-if="currentStep === 'genre'"></genre-selector>
        <protagonist-selector v-else-if="currentStep === 'protagonist'"></protagonist-selector>
        <conflict-selector v-else-if="currentStep === 'conflict'"></conflict-selector>
        <setting-selector v-else-if="currentStep === 'setting'"></setting-selector>
        
        <!-- Generation Workspace Implementation -->
        <div v-else-if="currentStep === 'outline'" class="workspace-container">
          
          <!-- Panel 1: Prompt Editor -->
          <div class="prompt-editor-panel">
            <h3>Your Blueprint (Editable)</h3>
            <div class="structure-selector">
              <label 
                v-for="structure in store.structures" 
                :key="structure.name"
                class="structure-option"
                :class="{ selected: store.selectedStructure.name === structure.name }"
              >
                <input 
                  type="radio" 
                  name="structure"
                  :checked="store.selectedStructure.name === structure.name"
                  @change="store.selectStructure(structure)"
                >
                <div class="structure-info">
                  <strong>{{ structure.name }}</strong>
                  <span>{{ structure.description }}</span>
                </div>
              </label>
            </div>
            <textarea v-model="store.editablePrompt" class="prompt-textarea"></textarea>
          </div>

          <!-- Panel 2: Generation Result -->
          <div class="generation-result-panel">
            <h3>AI Generated Outline</h3>
            <div class="generation-result">
              <div v-if="isGenerating" class="loading-spinner"></div>
              <div v-else-if="generationError" class="error-state generation-error">{{ generationError }}</div>
              <div v-else-if="generatedOutline" class="outline-content">{{ generatedOutline }}</div>
              <div v-else class="prompt-preview">
                <p>Your blueprint is ready. Edit it above, then click Generate.</p>
              </div>
            </div>
          </div>

          <!-- Central Action Bar -->
          <div class="workspace-actions">
            <button @click="store.generateOutline()" :disabled="isGenerating" class="btn-primary btn-generate">
              {{ isGenerating ? 'Generating...' : '✨ Generate Outline' }}
            </button>
            <button @click="store.reset()" :disabled="isGenerating" class="btn-secondary">Start Over</button>
          </div>
        </div>
      </div>
    </main>
  `,
};

const app = createApp(App);
app.use(pinia);
app.mount("#app");

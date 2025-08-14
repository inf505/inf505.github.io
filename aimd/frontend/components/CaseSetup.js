// frontend/components/CaseSetup.js
import { ref, computed, onMounted } from "vue";
import { useCharacterCreationStore } from "/stores/useCharacterCreationStore.js";
import { useGameStore } from "/stores/useGameStore.js";
import { useUiStore } from "/stores/useUiStore.js";
import LoadingSpinner from "/components/LoadingSpinner.js";

export default {
  name: "CaseSetup",
  components: {
    LoadingSpinner,
  },
  setup() {
    const creationStore = useCharacterCreationStore();
    const gameStore = useGameStore();
    const uiStore = useUiStore();
    const seedText = ref("");
    const isGeneratingCase = computed(
      () => uiStore.loadingTask === "case-generation"
    );
    const isStartingSession = computed(
      () => uiStore.loadingTask === "session-start"
    );
    const hasUserTheme = computed(() => seedText.value.trim() !== "");
    const getAICase = () => {
      seedText.value = "";
      gameStore.generateCase();
    };
    const chooseCase = () => {
      gameStore.startGameSession();
    };
    const formatCaseText = (text) => {
      if (!text) return "";
      text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
      text = text.replace(/\n/g, "<br>");
      return text;
    };
    const inputPlaceholder = computed(
      () => gameStore.case?.theme || "e.g., A patient with sudden weakness..."
    );
    onMounted(() => {
      if (!gameStore.case && !uiStore.loadingTask) {
        getAICase();
      }
    });
    return {
      gameStore,
      uiStore,
      seedText,
      getAICase,
      chooseCase,
      formatCaseText,
      inputPlaceholder,
      isGeneratingCase,
      isStartingSession,
      hasUserTheme,
    };
  },

  template: `
    <div class="case-setup-container"> 
      <div>
        <h2>Choose Patient Case</h2>
        
        <div class="case-seed-input-wrapper">
          <div class="case-seed-input">
            <label for="case-seed">Optional: Provide a theme</label>
            <input id="case-seed" type="text" v-model="seedText" :placeholder="inputPlaceholder" @keyup.enter="hasUserTheme ? gameStore.generateCase(seedText) : getAICase()" :disabled="!!uiStore.loadingTask" />
          </div>
        </div>

        <div class="case-list">

          <div v-if="isGeneratingCase || isStartingSession" class="case-card-skeleton">
            <div class="skeleton-line title"></div><div class="skeleton-line hook"></div>
            <div class="skeleton-line"></div><div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>

          <div v-else-if="gameStore.case" class="case-card">
            <h3>{{ gameStore.case.title }}</h3>
            <blockquote class="case-hook">{{ gameStore.case.hook }}</blockquote>
            <p class="case-background" v-html="formatCaseText(gameStore.case.background)"></p>
          </div>

          <div v-else-if="uiStore.error" class="case-list">
            <p class="help-text">{{ uiStore.error }}</p>
          </div>

        </div>

        <div class="case-refresh-container">

          <button @click="gameStore.generateCase(seedText)" class="btn" :disabled="!hasUserTheme || !!uiStore.loadingTask">
            <span>Generate with My Theme</span>
          </button>
          
          <button @click="getAICase" class="btn btn-secondary" :class="{ 'is-loading': isGeneratingCase && !hasUserTheme }" :disabled="!!uiStore.loadingTask">
            <LoadingSpinner v-if="isGeneratingCase && !hasUserTheme" />
            <span>📋</span>
            <span>Suggest a New Case</span>
          </button>
          
          <button @click="chooseCase" class="btn btn-primary" :class="{ 'is-loading': isStartingSession }" :disabled="!gameStore.case || !!uiStore.loadingTask">
            <LoadingSpinner v-if="isStartingSession" />
            <span>Begin Assessment</span>
          </button>

        </div>

      </div>
    </div>
  `,
};

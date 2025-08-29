// frontend/components/QuestSetup.js
import { ref, computed, onMounted } from "vue";
import { useCharacterCreationStore } from "../stores/useCharacterCreationStore.js";
import { useGameStore } from "../stores/useGameStore.js";
import { useUiStore } from "../stores/useUiStore.js";
import LoadingSpinner from "./LoadingSpinner.js";

export default {
  name: "QuestSetup",
  components: {
    LoadingSpinner,
  },
  setup() {
    const creationStore = useCharacterCreationStore();
    const gameStore = useGameStore();
    const uiStore = useUiStore();
    const seedText = ref("");
    const isGeneratingQuest = computed(
      () => uiStore.loadingTask === "quest-generation"
    );
    const isStartingSession = computed(
      () => uiStore.loadingTask === "session-start"
    );
    const hasUserTheme = computed(() => seedText.value.trim() !== "");

    // MODIFIED: This function now passes the required character context.
    const getAIQuest = () => {
      seedText.value = "";
      gameStore.generateQuest(creationStore.finalizedCharacter);
    };

    const chooseQuest = () => {
      gameStore.startGameSession();
    };
    const formatQuestText = (text) => {
      if (!text) return "";
      text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
      text = text.replace(/\n/g, "<br>");
      return text;
    };
    const inputPlaceholder = computed(
      () => gameStore.quest?.theme || "e.g., a haunted shipwreck..."
    );
    onMounted(() => {
      if (!gameStore.quest && !uiStore.loadingTask) {
        getAIQuest();
      }
    });
    return {
      creationStore, // ADDED: Expose to template
      gameStore,
      uiStore,
      seedText,
      getAIQuest,
      chooseQuest,
      formatQuestText,
      inputPlaceholder,
      isGeneratingQuest,
      isStartingSession,
      hasUserTheme,
    };
  },

  template: `
    <div class="quest-setup-container"> 
      <div>
        <h2>Choose Quest Scenario</h2>
        
        <div class="quest-seed-input-wrapper">
          <div class="quest-seed-input">
            <label for="quest-seed">Optional: Provide a theme</label>
            <!-- MODIFIED: The keyup event now correctly passes the character context. -->
            <input id="quest-seed" type="text" v-model="seedText" :placeholder="inputPlaceholder" @keyup.enter="hasUserTheme ? gameStore.generateQuest(creationStore.finalizedCharacter, seedText) : getAIQuest()" :disabled="!!uiStore.loadingTask" />
          </div>
        </div>

        <div class="quest-list">

          <div v-if="isGeneratingQuest || isStartingSession" class="quest-card-skeleton">
            <div class="skeleton-line title"></div><div class="skeleton-line hook"></div>
            <div class="skeleton-line"></div><div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>

          <div v-else-if="gameStore.quest" class="quest-card">
            <h3>{{ gameStore.quest.title }}</h3>
            <blockquote class="quest-hook">{{ gameStore.quest.hook }}</blockquote>
            <p class="quest-background" v-html="formatQuestText(gameStore.quest.background)"></p>
          </div>

          <div v-else-if="uiStore.error" class="quest-list">
            <p class="help-text">{{ uiStore.error }}</p>
          </div>

        </div>

        <div class="quest-refresh-container">

          <button @click="gameStore.generateQuest(creationStore.finalizedCharacter, seedText)" class="btn" :disabled="!hasUserTheme || !!uiStore.loadingTask">
            <span>Generate with My Theme</span>
          </button>
          
          <button @click="getAIQuest" class="btn btn-secondary" :class="{ 'is-loading': isGeneratingQuest && !hasUserTheme }" :disabled="!!uiStore.loadingTask">
            <LoadingSpinner v-if="isGeneratingQuest && !hasUserTheme" />
            <span>🪄</span>
            <span>Suggest for Me</span>
          </button>
          
          <button @click="chooseQuest" class="btn btn-primary" :class="{ 'is-loading': isStartingSession }" :disabled="!gameStore.quest || !!uiStore.loadingTask">
            <LoadingSpinner v-if="isStartingSession" />
            <span>Begin Adventure</span>
          </button>

        </div>

      </div>
    </div>
  `,
};

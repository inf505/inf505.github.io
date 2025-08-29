// frontend/components/Settings.js
import { ref, computed } from "vue";
import { useGameStore } from "/stores/useGameStore.js";
import { useConfigStore } from "/stores/useConfigStore.js";
import { useUiStore } from "/stores/useUiStore.js";

export default {
  name: "Settings",
  emits: ["settings-saved"],
  setup(props, { emit }) {
    const gameStore = useGameStore();
    const configStore = useConfigStore();

    // --- [NEW] State for tab management ---
    const activeTab = ref("general");

    const localApiKey = ref(configStore.apiKey);
    const localModelName = ref(gameStore.modelName);
    const localQuestModelName = ref(gameStore.questModelName);
    const localThemeModelName = ref(gameStore.themeModelName); // <-- ADDED
    const localTemperature = ref(gameStore.temperature);
    const localDiceBoost = ref(gameStore.diceBoost);

    const isDebugMode = computed(() => gameStore.isDebugMode);
    const hasApiKey = computed(() => !!localApiKey.value.trim());

    const saveSettings = () => {
      useUiStore().clearError();
      configStore.setApiKey(localApiKey.value);

      gameStore.saveSettings({
        modelName: localModelName.value,
        questModelName: localQuestModelName.value,
        themeModelName: localThemeModelName.value, // <-- ADDED
        temperature: parseFloat(localTemperature.value),
        diceBoost: parseInt(localDiceBoost.value),
      });

      emit("settings-saved");
    };

    return {
      activeTab, // <-- EXPOSED
      localApiKey,
      localModelName,
      localQuestModelName,
      localThemeModelName, // <-- ADDED
      localTemperature,
      localDiceBoost,
      isDebugMode,
      hasApiKey,
      saveSettings,
      gameStore,
    };
  },
  template: `
    <div class="settings-content">
      <h2>Settings</h2>
      
      <div v-if="!hasApiKey" class="banner banner-warning">
        An API key is required to play.
      </div>

      <!-- [NEW] Tab Navigation -->
      <div class="settings-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">General</button>
        <button class="tab-btn" :class="{ active: activeTab === 'models' }" @click="activeTab = 'models'">Models</button>
      </div>

      <!-- [NEW] General Tab Pane -->
      <div v-if="activeTab === 'general'" class="tab-pane">
        <div class="form-group">
          <label for="apiKey">Google Gemini API Key</label>
          <input id="apiKey" type="password" v-model="localApiKey" placeholder="Enter your API Key">
          <p class="help-text">
            Your key is saved in your browser and never stored on our servers.
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
              Get your API Key from Google AI Studio.
            </a>
          </p>
        </div>

        <div v-if="isDebugMode" class="form-group">
          <label for="diceBoost">Dice Roll Boost (Favor): +{{ localDiceBoost }}</label>
          <input 
            id="diceBoost" 
            type="range" 
            min="0" 
            max="10" 
            step="1" 
            v-model.number="localDiceBoost"
          >
          <p class="help-text">Adds a bonus to every d20 roll you make.</p>
        </div>

        <div class="form-group">
          <label for="temperature">DM Creativity (Temperature): {{ Number(localTemperature).toFixed(1) }}</label>
          <input 
            id="temperature" 
            type="range" 
            min="0" 
            max="2" 
            step="0.1" 
            v-model.number="localTemperature"
          >
          <p class="help-text">0.0 = predictable | 1.0 = creative | 2.0 = experimental</p>
        </div>

        <div class="form-group">
          <label for="favorableWinds">Favorable Winds</label>
          <input type="checkbox" id="favorableWinds" v-model="gameStore.isFavorableWinds">
          <p class="help-text">
            Enable a +4 bonus on all d20 rolls, reducing the chance of failure. (Recommended)
          </p>
        </div>
      </div>

      <!-- [NEW] Models Tab Pane -->
      <div v-if="activeTab === 'models'" class="tab-pane">
        <div class="form-group">
          <label for="modelName">Game Turn Model</label>
          <input id="modelName" type="text" v-model="localModelName" placeholder="e.g., gemma-3-27b-it">
          <p class="help-text">Controls the main game narrator. Valid models: gemma-3-27b-it, gemini-2.5-flash, gemini-2.5-flash-lite</p>
        </div>

        <div class="form-group">
          <label for="questModelName">Quest Generation Model</label>
          <input id="questModelName" type="text" v-model="localQuestModelName" placeholder="e.g., gemini-2.5-pro">
          <p class="help-text">Controls the AI that designs your quests. Valid models: gemma-3-27b-it, gemini-2.5-flash, gemini-2.5-flash-lite</p>
        </div>

        <div class="form-group">
          <label for="themeModelName">Quest Theme Model</label>
          <input id="themeModelName" type="text" v-model="localThemeModelName" placeholder="e.g., gemini-2.5-flash">
          <p class="help-text">Controls the AI that generates quest themes. A fast model is recommended. Valid models: gemma-3-27b-it, gemini-2.5-flash, gemini-2.5-flash-lite</p>
        </div>
      </div>
      
      <div class="settings-actions">
        <button class="btn btn-primary" @click="saveSettings" :disabled="!hasApiKey">Save</button>
      </div>
    </div>
  `,
};

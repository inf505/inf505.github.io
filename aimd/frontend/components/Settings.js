// frontend/components/Settings.js
import { ref, computed } from "vue";
import { useGameStore } from "/stores/useGameStore.js";

export default {
  name: "Settings",
  emits: ["settings-saved"],
  setup(props, { emit }) {
    const gameStore = useGameStore();

    const activeTab = ref("general");

    const localApiKey = ref(gameStore.apiKey);
    const localModels = ref(JSON.parse(JSON.stringify(gameStore.models)));
    const localTemperature = ref(gameStore.temperature);
    const localApiTimeout = ref(gameStore.apiTimeout);
    const localIsTutorEnabled = ref(gameStore.isTutorEnabled);
    const localShowSituationSummary = ref(gameStore.showSituationSummary);
    const localIsSuggestionShuffleEnabled = ref(
      gameStore.isSuggestionShuffleEnabled
    );
    const localIsFocusEnabled = ref(gameStore.isFocusEnabled);

    const isDebugMode = computed(() => gameStore.isDebugMode);
    const reputation = computed(() => gameStore.character?.currency ?? 0);
    const isShuffleDisabled = computed(() => reputation.value <= 100);

    const saveSettings = () => {
      emit("settings-saved", {
        apiKey: localApiKey.value,
        models: localModels.value,
        temperature: parseFloat(localTemperature.value),
        apiTimeout: parseInt(localApiTimeout.value),
        isTutorEnabled: localIsTutorEnabled.value,
        showSituationSummary: localShowSituationSummary.value,
        isSuggestionShuffleEnabled: localIsSuggestionShuffleEnabled.value,
        isFocusEnabled: localIsFocusEnabled.value,
      });
    };

    return {
      activeTab,
      localApiKey,
      localModels,
      localTemperature,
      localApiTimeout,
      localIsTutorEnabled,
      localShowSituationSummary,
      localIsSuggestionShuffleEnabled,
      localIsFocusEnabled,
      isDebugMode,
      isShuffleDisabled,
      reputation,
      saveSettings,
    };
  },
  template: `
    <div class="settings-content">
      <h2>Settings</h2>

      <div class="settings-tabs">
        <button 
          @click="activeTab = 'general'" 
          class="settings-tab-button" 
          :class="{ 'is-active': activeTab === 'general' }"
        >
          General
        </button>
        <button 
          @click="activeTab = 'ai'" 
          class="settings-tab-button" 
          :class="{ 'is-active': activeTab === 'ai' }"
        >
          AI Models
        </button>
      </div>

      <div class="settings-tab-panels">
        <div class="settings-tab-panel" :class="{ 'is-active': activeTab === 'general' }">
          <div class="form-group">
            <label for="apiKey">Google Gemini API Key</label>
            <input id="apiKey" type="password" v-model="localApiKey" placeholder="Enter your API Key">
            <p class="help-text">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                Get your API Key from Google AI Studio.
              </a> Your key is stored locally in your browser and is never sent anywhere else except to Google's API.
            </p>
          </div>

          <div class="form-group-row">
            <div class="form-group">
                <label for="temperature">Creativity (Temp)</label>
                <input 
                  id="temperature" 
                  type="number" 
                  min="0" 
                  max="2" 
                  step="0.1" 
                  v-model.number="localTemperature"
                >
            </div>
            <div class="form-group">
                <label for="apiTimeout">Timeout (s)</label>
                <input 
                    id="apiTimeout" 
                    type="number" 
                    min="5" 
                    max="120" 
                    step="5" 
                    v-model.number="localApiTimeout"
                >
            </div>
          </div>
          <p class="help-text form-group-row-help">
            Creativity (0.0=deterministic, 2.0=max random). Timeout is how long to wait for the AI.
          </p>

          <div class="form-group">
            <label class="form-label-checkbox" for="isFocusEnabled">
              <input id="isFocusEnabled" type="checkbox" v-model="localIsFocusEnabled">
              <span>Focus Efforts (Removes Critical Fails)</span>
            </label>
            <p class="help-text">A strategic option to remove critical failures at the cost of your character's Composure & Stamina.</p>
          </div>

          <div class="form-group">
            <label class="form-label-checkbox" for="isTutorEnabled">
              <input id="isTutorEnabled" type="checkbox" v-model="localIsTutorEnabled">
              <span>Enable AI Assistant</span>
            </label>
            <p class="help-text">Adds a "Consult AI Assistant" button to the chat input to get AI-driven advice on your next move.</p>
          </div>

          <div class="form-group">
            <label class="form-label-checkbox" for="showSituationSummary">
              <input id="showSituationSummary" type="checkbox" v-model="localShowSituationSummary">
              <span>Show Situation Summary</span>
            </label>
            <p class="help-text">At the end of each turn, show a concise one-sentence summary of the current clinical situation.</p>
          </div>

          <div class="form-group">
            <label 
              class="form-label-checkbox"
              :class="{ 'is-disabled': isShuffleDisabled }"
              for="isSuggestionShuffleEnabled"
            >
              <input 
                id="isSuggestionShuffleEnabled" 
                type="checkbox" 
                v-model="localIsSuggestionShuffleEnabled"
                :disabled="isShuffleDisabled"
              >
              <span>Enable Shuffled Suggestions</span>
            </label>
            <p class="help-text">
                Increases difficulty by randomizing the order of suggestions each turn.
                <span v-if="isShuffleDisabled">Requires Reputation > 100 to enable. (Current: {{ reputation }})</span>
            </p>
          </div>
        </div>

        <div class="settings-tab-panel" :class="{ 'is-active': activeTab === 'ai' }">
          <div class="model-settings-group">
            <div class="form-group">
              <label for="modelCaseGen">Case Generation Model</label>
              <input id="modelCaseGen" type="text" v-model="localModels.caseGeneration" placeholder="e.g., gemma-3-27b-it">
              <p class="help-text">For high-quality, creative case generation. Slower, more expensive models are best here. <br>Examples: gemini-2.5-flash, gemma-3-27b-it</p>
            </div>
            <div class="form-group">
              <label for="modelGameplay">Core Gameplay Model</label>
              <input id="modelGameplay" type="text" v-model="localModels.gameplay" placeholder="e.g., gemini-2.5-flash">
              <p class="help-text">For fast, turn-by-turn narration and responses. Faster, cheaper models are best here. <br>Examples: gemini-2.5-flash, gemini-2.5-flash-lite, gemma-3-27b-it</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="settings-actions">
        <button class="btn btn-primary" @click="saveSettings">Save</button>
      </div>
    </div>
  `,
};

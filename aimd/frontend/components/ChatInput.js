// frontend/components/ChatInput.js
import { ref, computed } from "vue";
import { useGameStore } from "../stores/useGameStore.js";
import { useUiStore } from "../stores/useUiStore.js";

export default {
  name: "ChatInput",

  setup() {
    const gameStore = useGameStore();
    const uiStore = useUiStore();
    const userInput = ref("");

    const inputPlaceholder = computed(() => {
      if (gameStore.session?.state.isGameOver)
        return "The simulation has ended.";
      if (
        uiStore.loadingTask === "clinical-tutor-consult" ||
        uiStore.loadingTask === "game-turn"
      )
        return "Awaiting patient response...";
      if (gameStore.isDiceRolling) return "Rolling skill check...";
      if (gameStore.activeBoost > 0)
        return `Your action? (+${gameStore.activeBoost} boost) | Use 📱 to ask a question to your AI assistant`;
      return "Enter your action, or use the 📱 button to ask your AI assistant";
    });

    const isInputDisabled = computed(() => {
      return gameStore.isInputDisabled;
    });

    const isSendButtonDisabled = computed(() => {
      if (isInputDisabled.value) return true;
      return userInput.value.length === 0;
    });

    const sendMessage = () => {
      const textToSend = userInput.value.trim();
      if (isInputDisabled.value || !textToSend) return;

      gameStore.runGameTurn(textToSend);
      userInput.value = "";
    };

    const handleTutorClick = () => {
      if (isInputDisabled.value) return;
      const textToSend = userInput.value.trim();

      gameStore.getClinicalAdvice(textToSend);
      userInput.value = "";
    };

    const onForgetClick = () => {
      gameStore.forceRegenerate();
    };

    const getSuggestionIcon = (suggestionType) => {
      switch (suggestionType) {
        case "high_stakes":
          return "⚠️";
        case "corrupt":
          return "💸";
        case "evil":
          return "😈";
        default:
          return "";
      }
    };

    return {
      userInput,
      gameStore,
      uiStore,
      inputPlaceholder,
      isInputDisabled,
      isSendButtonDisabled,
      sendMessage,
      onForgetClick,
      handleTutorClick,
      getSuggestionIcon,
    };
  },
  template: `
    <div class="chat-input-area">
      <!-- New Rate Limit Overlay -->
      <div v-if="uiStore.isRateLimited" class="rate-limit-overlay">
        <div class="spinner-small"></div>
        <p>
          Rate limit exceeded. Please wait 
          <strong>{{ uiStore.rateLimitCooldown }}s</strong> 
          before trying again.
        </p>
      </div>

      <!-- Existing Input Controls -->
      <div v-else>
        <div v-if="uiStore.showForgetButton" class="forget-turn-container">
          <p>The AI seems to be stuck. You can try to regenerate its last response.</p>
          <button @click="onForgetClick" class="btn btn-secondary">
            Retry Last Turn
          </button>
        </div>

        <div 
          v-if="gameStore.session?.state.currentSuggestions && gameStore.session.state.currentSuggestions.length > 0" 
          class="suggestion-chips-in-chat"
        >
          <button 
            v-for="suggestion in gameStore.session.state.currentSuggestions" 
            :key="suggestion.text"
            @click="gameStore.runGameTurn(suggestion)"
            :title="suggestion.rationale"
          >
            <span v-if="suggestion.type !== 'standard'" class="suggestion-icon">
              {{ getSuggestionIcon(suggestion.type) }}
            </span>
            {{ suggestion.text }}
          </button>
        </div>

        <form @submit.prevent="sendMessage" class="main-input-bar">
          <span class="input-icon" :class="{ 'boost-active': gameStore.activeBoost > 0 }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.9998C17.5228 21.9998 22 17.5227 22 11.9998C22 6.4769 17.5228 1.99982 12 1.99982C6.47715 1.99982 2 6.4769 2 11.9998C2 17.5227 6.47715 21.9998 12 21.9998Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10"/>
              <path d="M15.5 12.4998H8.5M12 15.9998V8.99976" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          
          <input 
            type="text" 
            v-model="userInput" 
            :placeholder="inputPlaceholder" 
            :disabled="isInputDisabled"
            ref="mainInput"
            @keydown.enter.prevent="sendMessage"
          />

          <button
            v-if="gameStore.isTutorEnabled"
            type="button"
            @click="handleTutorClick"
            class="btn btn-tutor"
            title="Ask AI Assistant (or get a hint if input is empty)"
          >
            📱
          </button>
          
          <button type="submit" class="send-btn" :disabled="isSendButtonDisabled">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  `,
};

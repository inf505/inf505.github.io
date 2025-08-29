// frontend/components/ChatInput.js
import { ref, computed } from "vue";
import { useGameStore } from "/stores/useGameStore.js";
import { useUiStore } from "/stores/useUiStore.js";

export default {
  name: "ChatInput",

  setup() {
    const gameStore = useGameStore();
    const uiStore = useUiStore();
    const userInput = ref("");

    const inputPlaceholder = computed(() => {
      if (gameStore.session?.state.isGameOver)
        return "The adventure has ended.";
      if (uiStore.isLoading && !gameStore.isDiceRolling)
        return "Awaiting the DM's response...";
      if (gameStore.isDiceRolling) return "Rolling the dice...";
      if (gameStore.activeBoost > 0) return `What do you do?`; // (+${gameStore.activeBoost} boost is active)
      return "What do you do next?";
    });

    const isInputDisabled = computed(() => {
      return !gameStore.isPlayerTurn || gameStore.session?.state.isGameOver;
    });

    const sendMessage = () => {
      const textToSend = userInput.value.trim();
      if (!textToSend || isInputDisabled.value) return;

      gameStore.runGameTurn(textToSend);
      userInput.value = "";
    };

    const onForgetClick = () => {
      gameStore.forceRegenerate();
    };

    return {
      userInput,
      gameStore,
      uiStore,
      inputPlaceholder,
      isInputDisabled,
      sendMessage,
      onForgetClick,
    };
  },
  template: `
    <div class="chat-input-area">
      <div v-if="uiStore.showForgetButton" class="forget-turn-container">
        <p>The AI seems to be stuck. You can try to regenerate its last response.</p>
        <button @click="onForgetClick" class="btn btn-secondary">
          Retry Last Turn
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
        
        <button type="submit" class="send-btn" :disabled="isInputDisabled || userInput.length === 0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  `,
};

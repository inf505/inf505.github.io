// frontend/components/ChatWindow.js
import { ref, computed, watch, nextTick } from "vue";
import { useGameStore } from "/stores/useGameStore.js";
import { useUiStore } from "/stores/useUiStore.js";
import D20Roll from "/components/D20Roll.js";

export default {
  name: "ChatWindow",
  components: {
    D20Roll,
  },
  setup() {
    const gameStore = useGameStore();
    const uiStore = useUiStore();

    const chatWindowEl = ref(null);

    const isAiThinking = computed(() => uiStore.loadingTask === "game-turn");

    const reversedHistory = computed(() => {
      return gameStore.formattedChatHistory.slice().reverse();
    });

    const scrollToTop = () => {
      nextTick(() => {
        if (chatWindowEl.value) {
          chatWindowEl.value.scrollTop = 0;
        }
      });
    };

    watch(() => gameStore.formattedChatHistory.length, scrollToTop);
    watch(isAiThinking, (newVal) => {
      if (newVal) {
        scrollToTop();
      }
    });

    return {
      chatWindowEl,
      reversedHistory,
      isAiThinking,
      gameStore,
    };
  },

  template: `
    <div class="chat-window-container">
      <div class="chat-window" ref="chatWindowEl">
        
        <div v-if="isAiThinking" class="message-container">
          <div class="message message-gm is-thinking">
            
            <div v-if="gameStore.pendingRollResult" class="message-d20-roll">
              <D20Roll 
                :result="gameStore.pendingRollResult" 
                :is-current-roll="true"
                :animate="true" 
              />
            </div>

            <span class="speaker">Narrator</span>
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <div v-for="(message, index) in reversedHistory" :key="message.speaker + index + message.text.length" class="message-container">
          
          <div v-if="message.type === 'chapter-break'" class="chapter-break">
            <h4 class="chapter-title" v-html="message.text"></h4>
          </div>

          <div v-else class="message" :class="['message-' + message.speaker.toLowerCase()]">
            
            <div v-if="message.d20Result && index === 0 && !isAiThinking" class="message-d20-roll">
              <D20Roll 
                :result="message.d20Result" 
                :is-current-roll="true" 
                :animate="false"
              />
            </div>

            <span class="speaker">{{ message.speaker === 'GM' ? 'Narrator' : message.speaker }}</span>
            <p class="text" v-html="message.text"></p>
            
            <div v-if="message.situation" class="message-situation">
              {{ message.situation }}
            </div>

          </div>
        </div>
        <div v-if="!reversedHistory.length && !isAiThinking" class="empty-chat-message">
          <h3>The mission begins.</h3>
          <p>The Game Master is waiting for your first move.</p>
        </div>
      </div>
    </div>
  `,
};

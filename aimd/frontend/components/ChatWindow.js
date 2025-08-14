// frontend/components/ChatWindow.js
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useGameStore } from "/stores/useGameStore.js";
import { useUiStore } from "/stores/useUiStore.js";
import D20Roll from "/components/SkillCheckDisplay.js";

export default {
  name: "ChatWindow",
  components: {
    D20Roll,
  },
  setup() {
    const gameStore = useGameStore();
    const uiStore = useUiStore();

    // --- Virtual Scroller State ---
    const scrollContainerRef = ref(null);
    const scrollTop = ref(0);
    const containerHeight = ref(0);
    const measuredHeights = ref(new Map());
    const estimatedMessageHeight = 70; // A reasonable guess for initial layout
    const buffer = 5; // Number of items to render above/below the viewport

    const activeThinker = computed(() => {
      const task = uiStore.loadingTask;
      if (task === "game-turn") return "Narrator";
      if (task === "clinical-tutor-consult") return "AI";
      return null;
    });

    const reversedHistory = computed(() => {
      return gameStore.formattedChatHistory
        .slice()
        .reverse()
        .map((msg, index) => ({ ...msg, originalIndex: index }));
    });

    const isDiceVisible = computed(() => {
      return gameStore.isDiceRolling || gameStore.diceRollDetails;
    });

    // --- Virtual Scroller Computed Properties ---
    const messagePositions = computed(() => {
      const positions = [];
      let currentTop = 0;
      for (let i = 0; i < reversedHistory.value.length; i++) {
        const height = measuredHeights.value.get(i) || estimatedMessageHeight;
        positions.push({ top: currentTop, bottom: currentTop + height });
        currentTop += height;
      }
      return positions;
    });

    const totalHeight = computed(() => {
      return messagePositions.value.length > 0
        ? messagePositions.value[messagePositions.value.length - 1].bottom
        : 0;
    });

    const startIndex = computed(() => {
      const start = messagePositions.value.findIndex(
        (pos) => pos.bottom >= scrollTop.value
      );
      return Math.max(0, start - buffer);
    });

    const endIndex = computed(() => {
      const end = messagePositions.value.findIndex(
        (pos) => pos.top >= scrollTop.value + containerHeight.value
      );
      const effectiveEnd = end === -1 ? reversedHistory.value.length : end;
      return Math.min(reversedHistory.value.length, effectiveEnd + buffer);
    });

    const visibleMessages = computed(() => {
      return reversedHistory.value.slice(startIndex.value, endIndex.value);
    });

    const paddingTop = computed(() => {
      return startIndex.value > 0
        ? messagePositions.value[startIndex.value].top
        : 0;
    });

    // --- Event Handlers & Lifecycle ---
    const handleScroll = () => {
      if (scrollContainerRef.value) {
        scrollTop.value = scrollContainerRef.value.scrollTop;
      }
    };

    const setMessageRef = (el, index) => {
      if (el && el.clientHeight > 0) {
        const currentHeight = measuredHeights.value.get(index);
        if (currentHeight !== el.clientHeight) {
          measuredHeights.value.set(index, el.clientHeight);
        }
      }
    };

    let resizeObserver;
    onMounted(() => {
      if (scrollContainerRef.value) {
        scrollContainerRef.value.addEventListener("scroll", handleScroll);
        resizeObserver = new ResizeObserver((entries) => {
          containerHeight.value = entries[0]?.contentRect.height || 0;
        });
        resizeObserver.observe(scrollContainerRef.value);
        containerHeight.value = scrollContainerRef.value.clientHeight;
      }
    });

    onUnmounted(() => {
      if (scrollContainerRef.value) {
        scrollContainerRef.value.removeEventListener("scroll", handleScroll);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    });

    watch(
      () => gameStore.formattedChatHistory.length,
      () => {
        // When new messages arrive, scroll to the top of the virtual list
        nextTick(() => {
          if (scrollContainerRef.value) {
            scrollContainerRef.value.scrollTop = 0;
            scrollTop.value = 0;
          }
        });
      },
      { flush: "post" }
    );

    watch(activeThinker, (newVal) => {
      if (newVal) {
        if (scrollContainerRef.value) {
          scrollContainerRef.value.scrollTop = 0;
          scrollTop.value = 0;
        }
      }
    });

    return {
      scrollContainerRef,
      visibleMessages,
      totalHeight,
      paddingTop,
      setMessageRef,
      activeThinker,
      gameStore,
      isDiceVisible,
    };
  },

  template: `
    <div class="chat-window-container" :class="{ 'dice-is-active': isDiceVisible }">
      <!-- Dice Roll Animation Area -->
      <div v-if="isDiceVisible" class="dice-roll-area">
        <div class="dice-roll-animation">
          <D20Roll
            v-if="gameStore.diceRollDetails"
            :is-rolling="gameStore.isDiceRolling"
            :result="gameStore.diceRollDetails.roll"
          />
          <div v-else class="dice-placeholder">
              <div class="d20-container is-animating">
                  <div class="d20-face">?</div>
              </div>
          </div>
        </div>

        <div v-if="gameStore.isDebugMode && gameStore.diceRollDetails" class="dice-roll-breakdown" :class="{ 'is-calculating': gameStore.isDiceRolling }">
          <span class="roll-part operator">+</span>
          <span class="roll-part roll-boost">{{ gameStore.diceRollDetails.boost }}</span>
          <span class="roll-part operator">=</span>
          <span class="roll-part roll-total">{{ gameStore.diceRollDetails.total }}</span>
        </div>
        <div v-else-if="gameStore.isDebugMode" class="dice-roll-breakdown is-calculating">
          <span class="roll-part">Rolling...</span>
        </div>
      </div>

      <!-- Chat Log with Virtual Scrolling -->
      <div class="chat-window" ref="scrollContainerRef">
        <div class="chat-window-sizer" :style="{ height: totalHeight + 'px' }">
          <div class="chat-window-content" :style="{ transform: 'translateY(' + paddingTop + 'px)' }">
            
            <div v-if="activeThinker" class="message-container">
              <div class="message is-thinking" :class="'message-' + activeThinker.toLowerCase()">
                <span class="speaker">{{ activeThinker }}</span>
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>

            <div 
              v-for="message in visibleMessages" 
              :key="message.originalIndex" 
              class="message-container"
              :ref="(el) => setMessageRef(el, message.originalIndex)"
            >
              <div class="message" :class="['message-' + message.speaker.toLowerCase()]">
                <span class="speaker">{{ message.speaker }}</span>
                <p class="text" v-html="message.text"></p>
              </div>
            </div>

            <div v-if="!visibleMessages.length && !activeThinker" class="empty-chat-message">
              <h3>The simulation begins.</h3>
              <p>The simulation is awaiting your first action.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
};

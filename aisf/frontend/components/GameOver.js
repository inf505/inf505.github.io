// frontend/components/GameOver.js
import { computed } from "vue";
import { useGameStore } from "../stores/useGameStore.js";

const GameOver = {
  setup() {
    const gameStore = useGameStore();

    const finalNarrative = computed(() => gameStore.formattedFinalNarrative);

    const startNewGame = () => {
      gameStore.resetGame();
    };

    return {
      finalNarrative,
      startNewGame,
    };
  },
  template: `
    <div class="game-over-container">
      <div class="game-over-content">
        <h1 class="game-over__title">Your Story Ends</h1>
        <p class="game-over__narrative" v-html="finalNarrative"></p>
        <button class="game-over__button" @click="startNewGame">
          Begin a New Legend
        </button>
      </div>
    </div>
  `,
};

export default GameOver;

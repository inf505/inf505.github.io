// frontend/components/QuestComplete.js
import { ref, onMounted } from "vue";
import { useGameStore } from "../stores/useGameStore.js";
import { makeApiRequest } from "../utils/api.js";
import LoadingSpinner from "./LoadingSpinner.js";
import ErrorMessage from "./ErrorMessage.js";

export default {
  name: "QuestComplete",
  components: {
    LoadingSpinner,
    ErrorMessage,
  },
  setup() {
    const gameStore = useGameStore();

    const journalEntry = ref("");
    const isLoading = ref(true);
    const error = ref(null);

    const generateJournal = async () => {
      isLoading.value = true;
      error.value = null;
      try {
        const payload = { sessionId: gameStore.session.sessionId };
        const response = await makeApiRequest("/api/journal/generate", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (response.journalEntry) {
          // Format the journal entry, detecting headers (##) and paragraphs.
          const lines = response.journalEntry
            .split("\n")
            .filter((line) => line.trim() !== "");
          journalEntry.value = lines
            .map((line) => {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith("## ")) {
                // This is a title.
                return `<h3>${trimmedLine.substring(3)}</h3>`;
              }
              // This is a standard paragraph.
              return `<p>${trimmedLine}</p>`;
            })
            .join("");
        } else {
          throw new Error("Received an empty journal entry from the server.");
        }
      } catch (err) {
        console.error("Failed to generate journal entry:", err);
        error.value =
          "The historian seems to have lost their notes. Could not generate a journal entry for this adventure.";
      } finally {
        isLoading.value = false;
      }
    };

    // Automatically generate the journal when the component is mounted
    onMounted(() => {
      if (gameStore.session?.sessionId) {
        generateJournal();
      } else {
        error.value =
          "Could not generate a journal because the session was lost. Please start a new quest.";
        isLoading.value = false;
      }
    });

    const handleContinue = () => {
      gameStore.prepareForNewQuest();
    };

    const handleNewCharacter = () => {
      gameStore.resetGame();
    };

    return {
      isLoading,
      error,
      journalEntry,
      handleContinue,
      handleNewCharacter,
    };
  },
  template: `
    <div class="quest-complete-container">
      <h2>Quest Complete!</h2>

      <div class="journal-content">
        <div v-if="isLoading" class="loading-container">
          <LoadingSpinner />
          <p>The historian is chronicling your adventure...</p>
        </div>
        <ErrorMessage v-else-if="error" :message="error" />
        <div v-else v-html="journalEntry" class="journal-text"></div>
      </div>
      
      
      <p class="final-message">Your legend grows...</p>

      <div class="quest-complete-actions">
        <button @click="handleContinue" class="btn btn-primary">Continue Your Legend</button>
        <button @click="handleNewCharacter" class="btn btn-secondary">Start a New Character</button>
      </div>
    </div>
  `,
};

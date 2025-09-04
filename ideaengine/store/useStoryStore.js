// store/useStoryStore.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export const useStoryStore = defineStore("story", () => {
  // STATE: API Generation Lifecycle
  const isGenerating = ref(false);
  const generatedOutline = ref("");
  const generationError = ref("");
  const editablePrompt = ref(""); // For user edits

  // STATE: Settings and API configuration
  const isSettingsOpen = ref(false);
  const apiKey = ref("");
  const apiModel = ref("gemma-3-27b-it");
  const validModels = [
    "gemma-3-27b-it",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ];

  // STATE: Raw data loaded from JSON files
  const genres = ref([]);
  const protagonists = ref([]);
  const conflicts = ref([]);
  const settings = ref([]);
  const structures = ref([]);

  // STATE: UI and wizard progress
  const loading = ref(true);
  const error = ref(null);
  const currentStep = ref("genre");

  // STATE: User selections
  const selectedGenre = ref(null);
  const selectedProtagonist = ref(null);
  const selectedConflict = ref(null);
  const selectedSetting = ref(null);
  const selectedStructure = ref(null);

  // INTERNAL ACTION: Shuffle all data arrays
  function shuffleAllData() {
    shuffleArray(genres.value);
    shuffleArray(protagonists.value);
    shuffleArray(conflicts.value);
    shuffleArray(settings.value);
  }

  // ACTION: Exposes shuffling functionality to the UI
  function reShuffle() {
    shuffleAllData();
  }

  // ACTIONS: Settings Management
  function toggleSettingsModal() {
    isSettingsOpen.value = !isSettingsOpen.value;
  }

  function saveSettings({ newApiKey, newApiModel }) {
    apiKey.value = newApiKey;
    apiModel.value = newApiModel;
    localStorage.setItem(
      "idea-helper-settings",
      JSON.stringify({
        apiKey: newApiKey,
        apiModel: newApiModel,
      })
    );
    toggleSettingsModal();
  }

  function loadSettings() {
    const saved = localStorage.getItem("idea-helper-settings");
    if (saved) {
      const settings = JSON.parse(saved);
      apiKey.value = settings.apiKey || "";
      if (validModels.includes(settings.apiModel)) {
        apiModel.value = settings.apiModel;
      }
    }
  }

  // ACTION: Fetch all data from the JSON files on startup
  async function fetchAllData() {
    loadSettings();
    try {
      const [g, p, c, s, st] = await Promise.all([
        fetch("./data/genres.json"),
        fetch("./data/protagonists.json"),
        fetch("./data/conflicts.json"),
        fetch("./data/settings.json"),
        fetch("./data/structures.json"),
      ]);

      if (!g.ok || !p.ok || !c.ok || !s.ok || !st.ok) {
        throw new Error("Network response was not ok.");
      }

      genres.value = await g.json();
      protagonists.value = await p.json();
      conflicts.value = await c.json();
      settings.value = await s.json();
      structures.value = await st.json();

      if (structures.value.length > 0) {
        selectedStructure.value = structures.value[0];
      }

      shuffleAllData();
      error.value = null;
    } catch (e) {
      console.error("Failed to fetch story data:", e);
      error.value =
        "Could not load story elements. Please try refreshing the page.";
    } finally {
      loading.value = false;
    }
  }

  const finalPrompt = computed(() => {
    if (
      selectedGenre.value &&
      selectedProtagonist.value &&
      selectedConflict.value &&
      selectedSetting.value &&
      selectedStructure.value
    ) {
      return `
Generate a detailed story outline based on the following elements:

**Genre:** ${selectedGenre.value.name}
*(${selectedGenre.value.description})*

**Protagonist:** ${selectedProtagonist.value.archetype}
- **Motivation:** ${selectedProtagonist.value.motivation}
- **Flaw:** ${selectedProtagonist.value.flaw}

**Central Conflict:** ${selectedConflict.value.description}
*(${selectedConflict.value.type})*

**Setting:** ${selectedSetting.value.name}
*(${selectedSetting.value.description})*

---

**Outline Structure: ${selectedStructure.value.name}**
${selectedStructure.value.prompt_text}
      `.trim();
    }
    return "";
  });

  // ACTIONS: Handle user selections and advance the wizard state
  function selectGenre(genre) {
    selectedGenre.value = genre;
    currentStep.value = "protagonist";
  }

  function selectProtagonist(protagonist) {
    selectedProtagonist.value = protagonist;
    currentStep.value = "conflict";
  }

  function selectConflict(conflict) {
    selectedConflict.value = conflict;
    currentStep.value = "setting";
  }

  function selectSetting(setting) {
    selectedSetting.value = setting;
    currentStep.value = "outline";
    editablePrompt.value = finalPrompt.value;
  }

  function selectStructure(structure) {
    selectedStructure.value = structure;
    editablePrompt.value = finalPrompt.value;
  }

  // ACTION: The core AI interaction with robust error handling
  async function generateOutline() {
    if (!apiKey.value) {
      generationError.value =
        "API Key is missing. Please add your key in the settings (⚙️).";
      return;
    }

    isGenerating.value = true;
    generatedOutline.value = "";
    generationError.value = "";

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel.value}:generateContent?key=${apiKey.value}`;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: editablePrompt.value }] }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg =
          data?.error?.message || "An unknown API error occurred.";
        throw new Error(`API Error (${response.status}): ${errorMsg}`);
      }

      if (data.candidates && data.candidates.length > 0) {
        if (data.candidates[0].finishReason === "SAFETY") {
          throw new Error(
            "Generation failed because the prompt or response was flagged by safety filters. Please adjust your prompt."
          );
        }
        generatedOutline.value = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error(
          "The API returned an empty response. Please try again."
        );
      }
    } catch (err) {
      console.error("API Error:", err);
      generationError.value = err.message;
    } finally {
      isGenerating.value = false;
    }
  }

  // ACTION: Reset the wizard to the beginning for a new session
  function reset() {
    currentStep.value = "genre";
    selectedGenre.value = null;
    selectedProtagonist.value = null;
    selectedConflict.value = null;
    selectedSetting.value = null;

    if (structures.value.length > 0) {
      selectedStructure.value = structures.value[0];
    }

    generatedOutline.value = "";
    generationError.value = "";
    editablePrompt.value = "";
    shuffleAllData();
  }

  return {
    isGenerating,
    generatedOutline,
    generationError,
    editablePrompt,
    generateOutline,
    isSettingsOpen,
    apiKey,
    apiModel,
    validModels,
    toggleSettingsModal,
    saveSettings,
    genres,
    protagonists,
    conflicts,
    settings,
    structures,
    loading,
    error,
    currentStep,
    selectedGenre,
    selectedProtagonist,
    selectedConflict,
    selectedSetting,
    selectedStructure,
    fetchAllData,
    reShuffle,
    selectGenre,
    selectProtagonist,
    selectConflict,
    selectSetting,
    selectStructure,
    reset,
    finalPrompt,
  };
});

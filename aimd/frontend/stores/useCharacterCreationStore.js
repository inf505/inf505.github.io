// frontend/stores/useCharacterCreationStore.js
import { defineStore } from "pinia";
import { useUiStore } from "./useUiStore.js";
import { useGameStore } from "./useGameStore.js";
import { API_BASE_URL } from "../config.js";

export const useCharacterCreationStore = defineStore("characterCreation", {
  state: () => ({
    disciplines: [],
    selectedDiscipline: null,
    specializations: [],
    selectedSpecialization: null,
    finalizedCharacter: null,
    characterName: "",
  }),
  actions: {
    setCharacterName(name) {
      this.characterName = name;
    },

    resetDisciplineSelection() {
      const gameStore = useGameStore();
      this.selectedDiscipline = null;
      this.specializations = [];
      this.selectedSpecialization = null;
      this.finalizedCharacter = null;
      this.characterName = "";
      gameStore.setGameState("discipline-selection");
    },

    async fetchDisciplines() {
      const uiStore = useUiStore();
      const gameStore = useGameStore();

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/character/disciplines`
        );
        if (!response.ok)
          throw new Error("Failed to fetch character disciplines.");

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid discipline data format from server.");
        }

        this.disciplines = data.map((d) => ({
          name: d.discipline,
          description: d.description,
          image: d.image,
        }));
        gameStore.setGameState("discipline-selection");
      } catch (error) {
        uiStore.setError(error.message);
      }
    },

    async selectDiscipline(disciplineData) {
      const uiStore = useUiStore();
      const gameStore = useGameStore();
      uiStore.setLoadingTask("specialization-load");

      this.selectedDiscipline = disciplineData;
      this.selectedSpecialization = null;

      gameStore.setGameState("specialization-selection");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/character/discipline-data/${disciplineData.name}`
        );
        if (!response.ok)
          throw new Error(
            `Could not load specializations for ${disciplineData.name}.`
          );

        const detailedDisciplineData = await response.json();
        this.specializations = detailedDisciplineData.specializations;

        // REMOVED: No longer creating an intermediate character object here.
        this.finalizedCharacter = null;
      } catch (error) {
        uiStore.setError(error.message);
        gameStore.setGameState("discipline-selection");
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    selectSpecialization(specialization) {
      // SIMPLIFIED: Only store the selection. Do not build a character object yet.
      this.selectedSpecialization = specialization;
    },

    async finalizeCharacter() {
      if (!this.selectedSpecialization || !this.selectedDiscipline) return;

      const uiStore = useUiStore();
      const gameStore = useGameStore();
      uiStore.setLoadingTask("character-finalize");

      const characterDataForServer = {
        discipline: this.selectedDiscipline,
        specialization: this.selectedSpecialization,
        name: this.characterName.trim(),
      };

      try {
        const response = await fetch(`${API_BASE_URL}/api/character/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            disciplineName: characterDataForServer.discipline.name,
            specializationName:
              characterDataForServer.specialization.specialization,
            characterName: characterDataForServer.name,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to finalize character.");
        }
        const finalizedStubFromServer = await response.json();

        this.finalizedCharacter = finalizedStubFromServer;
        console.log(
          "%c[NAME_DEBUG] 2. Character finalized on client. `finalizedCharacter` object is now:",
          "color: #90EE90",
          JSON.parse(JSON.stringify(this.finalizedCharacter))
        );

        gameStore.setGameState("case-selection");
        console.log(
          "%c[NAME_DEBUG] 3. Game state changed to 'case-selection'.",
          "color: #90EE90"
        );
      } catch (error) {
        uiStore.setError(error.message);
      } finally {
        uiStore.clearLoadingTask();
      }
    },
  },
});

// frontend/stores/useCharacterCreationStore.js
import { defineStore } from "pinia";
import { useUiStore } from "/stores/useUiStore.js";
import { useGameStore } from "/stores/useGameStore.js";

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

        // ARCHITECTURAL FIX: Create the character stub *after* fetching the detailed data
        // which contains the authoritative starting stats.
        this.finalizedCharacter = {
          name: "...",
          discipline: disciplineData.name,
          description: disciplineData.description,
          specialization: "",
          trait: "",
          stats: {},
          health: detailedDisciplineData.startingHealth,
          maxHealth: detailedDisciplineData.startingHealth,
          inventory: [],
          energy: detailedDisciplineData.startingEnergy,
          maxEnergy: detailedDisciplineData.startingEnergy,
        };
      } catch (error) {
        uiStore.setError(error.message);
        gameStore.setGameState("discipline-selection");
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    selectSpecialization(specialization) {
      this.selectedSpecialization = specialization;
      this.finalizedCharacter = {
        ...this.finalizedCharacter,
        specialization: specialization.specialization,
        trait: specialization.trait,
        description: specialization.description,
        stats: { ...specialization.stats },
        inventory: specialization.items.map((item) => ({
          ...item,
          isNew: true,
        })),
      };
    },

    async finalizeCharacter() {
      if (!this.selectedSpecialization) return;

      const uiStore = useUiStore();
      const gameStore = useGameStore();
      uiStore.setLoadingTask("character-finalize");

      try {
        const response = await fetch(`${API_BASE_URL}/api/character/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            disciplineName: this.selectedDiscipline.name,
            specializationName: this.selectedSpecialization.specialization,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to finalize character.");
        }
        const finalizedStub = await response.json();

        const finalName =
          this.characterName.trim() !== ""
            ? this.characterName.trim()
            : finalizedStub.generatedName;

        this.finalizedCharacter = {
          ...finalizedStub,
          name: finalName,
        };

        gameStore.setGameState("case-selection");
      } catch (error) {
        uiStore.setError(error.message);
      } finally {
        uiStore.clearLoadingTask();
      }
    },
  },
});

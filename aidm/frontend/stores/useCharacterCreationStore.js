// frontend/stores/useCharacterCreationStore.js
import { defineStore } from "pinia";
import { useUiStore } from "./useUiStore.js";
import { makeApiRequest } from "../utils/api.js";

export const useCharacterCreationStore = defineStore("characterCreation", {
  state: () => ({
    classes: [],
    selectedClass: null,
    archetypes: [],
    selectedArchetype: null,
    finalizedCharacter: null,
  }),
  actions: {
    async resetClassSelection() {
      const { useGameStore } = await import("./useGameStore.js");
      const gameStore = useGameStore();

      this.selectedClass = null;
      this.archetypes = [];
      this.selectedArchetype = null;
      this.finalizedCharacter = null;
      gameStore.setGameState("class-selection");
    },

    async fetchClasses() {
      const uiStore = useUiStore();
      const { useGameStore } = await import("./useGameStore.js");
      const gameStore = useGameStore();

      try {
        const data = await makeApiRequest("/api/character/classes");

        if (!Array.isArray(data)) {
          throw new Error("Invalid class data format from server.");
        }

        const transformedClasses = data.map((c) => ({
          name: c.class,
          description: c.description,
          image: c.image,
          startingEnergy: c.startingEnergy || 0,
          startingHealth: c.startingHealth || 100,
        }));

        this.classes = transformedClasses;
        gameStore.setGameState("class-selection");
      } catch (error) {
        uiStore.setError(error.message);
      }
    },

    async selectClass(classData) {
      const uiStore = useUiStore();
      const { useGameStore } = await import("./useGameStore.js");
      const gameStore = useGameStore();
      gameStore.resetSeenThemes();
      uiStore.setLoadingTask("archetype-load");

      this.selectedClass = classData;
      this.selectedArchetype = null;

      gameStore.setGameState("archetype-selection");
      try {
        const detailedClassData = await makeApiRequest(
          `/api/character/class-data/${classData.name}`
        );

        this.archetypes = detailedClassData.archetypes;

        this.finalizedCharacter = {
          name: "...",
          class: classData.name,
          description: classData.description,
          archetype: "",
          trait: "",
          stats: {},
          health: this.selectedClass.startingHealth,
          maxHealth: this.selectedClass.startingHealth,
          inventory: [],
          energy: this.selectedClass.startingEnergy,
          maxEnergy: this.selectedClass.startingEnergy,
        };
      } catch (error) {
        uiStore.setError(error.message);
        gameStore.setGameState("class-selection");
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    async selectArchetype(archetype) {
      const { useGameStore } = await import("./useGameStore.js");
      const gameStore = useGameStore();

      // --- THIS LINE WAS THE SECOND ERROR. IT IS NOW RESTORED. ---
      gameStore.resetSeenThemes();

      this.selectedArchetype = archetype;
      this.finalizedCharacter = {
        ...this.finalizedCharacter,
        archetype: archetype.archetype,
        trait: archetype.trait,
        description: archetype.description,
        stats: { ...archetype.stats },
        inventory: archetype.items.map((item) => ({ ...item, isNew: true })),
      };
    },

    async finalizeCharacter() {
      if (!this.selectedArchetype) return;

      const uiStore = useUiStore();
      const { useGameStore } = await import("./useGameStore.js");
      const gameStore = useGameStore();
      uiStore.setLoadingTask("character-finalize");

      try {
        const finalizedStub = await makeApiRequest("/api/character/finalize", {
          method: "POST",
          body: JSON.stringify({
            className: this.selectedClass.name,
            archetypeName: this.selectedArchetype.archetype,
          }),
        });

        this.finalizedCharacter = {
          ...finalizedStub,
          name: finalizedStub.generatedName,
        };

        gameStore.setGameState("quest-selection");
      } catch (error) {
        uiStore.setError(error.message);
      } finally {
        uiStore.clearLoadingTask();
      }
    },
  },
});

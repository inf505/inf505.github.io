// frontend/stores/useGameStore.js
import { defineStore } from "pinia";
import { useUiStore } from "./useUiStore.js";
import { useCharacterCreationStore } from "./useCharacterCreationStore.js";
import { formatNarrative } from "../utils/formatters.js";
import { makeApiRequest } from "../utils/api.js";

const GAME_STATE_STORAGE_KEY = "ai-dm-v2-game-state";

export const useGameStore = defineStore("game", {
  state: () => ({
    isStateHydrated: false,
    gameState: "initializing",
    quest: null,
    seenThemes: [],
    isPlayerTurn: true,
    session: null,
    modelName: localStorage.getItem("geminiModelName") || "gemma-3-27b-it",
    questModelName:
      localStorage.getItem("geminiQuestModelName") || "gemini-2.5-flash",
    themeModelName:
      localStorage.getItem("geminiThemeModelName") || "gemini-2.5-flash-lite",
    temperature: parseFloat(localStorage.getItem("geminiTemperature")) || 1.0,
    diceBoost: parseInt(localStorage.getItem("diceBoost")) || 0,
    oneTimeBoost: 0,
    isFavorableWinds: true,
    isDebugMode: false,
    energyConstants: { maxEnergy: 100 },
    questCompletionMessage: null,
    pendingRollResult: null,
    isGameOver: false, // <-- NEW
    finalNarrative: null, // <-- NEW
  }),

  getters: {
    formattedChatHistory: (state) => {
      if (!state.session?.state?.history) return [];
      return state.session.state.history
        .map((entry) => {
          const rawText = (entry?.parts?.[0]?.text ?? "").trim();
          if (!rawText) return null;

          const type = entry.type || null;
          let speaker;

          if (entry.role === "user") {
            speaker = "You";
          } else if (entry.role === "system") {
            speaker = "System"; // Identify our chapter break
          } else {
            speaker = "GM";
          }

          const text = formatNarrative(rawText);
          const situation = entry.situation || null;
          const d20Result = entry.d20Result || null;

          return { speaker, text, situation, d20Result, type };
        })
        .filter((entry) => entry && entry.text);
    },
    character: (state) => {
      return state.session?.state?.character || null;
    },
    entities: (state) => state.session?.state?.entities || [],
    worldState: (state) => state.session?.state?.worldState || {},
    activeBoost(state) {
      let totalBoost = 0;
      if (this.isFavorableWinds) {
        totalBoost += 4;
      }
      if (this.isDebugMode) {
        totalBoost += this.diceBoost + this.oneTimeBoost;
      }
      return totalBoost;
    },
    formattedQuestCompletionMessage: (state) => {
      if (!state.questCompletionMessage) return "";
      return formatNarrative(state.questCompletionMessage);
    },
    isGameActive: (state) =>
      state.session !== null &&
      ["adventuring", "quest-complete", "shopping"].includes(state.gameState),

    activeQuestGoal: (state) => state.quest?.overallGoal || null,
    maxHealth: (state) => state.character?.maxHealth || 100,
    maxEnergy: (state) => state.character?.maxEnergy || 100,

    activeMerchant: (state) => state.session?.state?.activeMerchant || null,

    // NEW Getter for the final narrative
    formattedFinalNarrative: (state) => {
      if (!state.finalNarrative) return "";
      return formatNarrative(state.finalNarrative);
    },
  },

  actions: {
    initializeDebugMode() {
      const params = new URLSearchParams(window.location.search);
      if (params.get("debug") === "1") {
        this.isDebugMode = true;
        console.log(
          "%c[DEBUG] Debug Mode Activated via URL parameter.",
          "color: #e74c3c; font-weight: bold;"
        );
      }
    },

    async hydrateState() {
      const uiStore = useUiStore();
      const creationStore = useCharacterCreationStore();

      this.initializeDebugMode();

      const savedStateJSON = localStorage.getItem(GAME_STATE_STORAGE_KEY);

      if (savedStateJSON) {
        try {
          const savedState = JSON.parse(savedStateJSON);
          savedState.isFavorableWinds = savedState.isFavorableWinds ?? true;
          this.$patch(savedState);
          console.log(
            `[HYDRATION] Successfully rehydrated state from localStorage for session [${
              this.session?.sessionId || "N/A"
            }].`
          );

          if (this.isGameActive) {
            await this.fetchGameConstants();
          } else {
            await creationStore.fetchClasses();
          }
        } catch (error) {
          console.error("☠️ Failed to parse saved state, resetting.", error);
          this.resetGame(false);
          await creationStore.fetchClasses();
        }
      } else {
        uiStore.setLoadingTask("initializing");
        await creationStore.fetchClasses();
        uiStore.clearLoadingTask();
      }

      this.$subscribe((mutation, state) => {
        if (state.session?.sessionId) {
          localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(state));
        } else {
          localStorage.removeItem(GAME_STATE_STORAGE_KEY);
        }
      });

      this.isStateHydrated = true;
      console.log("State hydration complete. Opening the application gate.");
    },

    async rehydrateSession() {
      if (!this.session?.sessionId || !this.session?.state) {
        console.error(
          "[REHYDRATE] Attempted to rehydrate without a valid session object."
        );
        return;
      }

      console.log(
        `[REHYDRATE] Server session lost. Re-hydrating session [${this.session.sessionId}]...`
      );

      try {
        const rehydrationPayload = {
          sessionId: this.session.sessionId,
          state: this.session.state,
        };

        await makeApiRequest("/api/session", {
          method: "POST",
          body: JSON.stringify(rehydrationPayload),
        });

        console.log(
          `[REHYDRATE] Session [${this.session.sessionId}] successfully re-synced with server.`
        );
      } catch (error) {
        useUiStore().setError(`Failed to restore session: ${error.message}`);
        throw error;
      }
    },

    async runGameTurn(playerInput, forceComplete = false) {
      const uiStore = useUiStore();
      uiStore.showForgetButton = false;
      this.isPlayerTurn = false;
      this.pendingRollResult = null; // Clear previous result

      try {
        const preGenPayload = {
          sessionId: this.session.sessionId,
          userInput: playerInput,
          accessibilityBoost: this.isFavorableWinds ? 4 : 0,
          debugBoost: this.isDebugMode ? this.diceBoost + this.oneTimeBoost : 0,
        };

        const preGenData = await makeApiRequest("/api/pre-generate", {
          method: "POST",
          body: JSON.stringify(preGenPayload),
        });

        this.pendingRollResult = preGenData.roll;

        uiStore.setLoadingTask("game-turn");

        const data = await makeApiRequest("/api/generate", {
          method: "POST",
          body: JSON.stringify({
            sessionId: this.session.sessionId,
            forceComplete: forceComplete,
          }),
        });

        if (data.events && data.events.includes("SHIP_UPGRADED")) {
          const newShip = data.newState.character.ship;
          if (newShip && newShip.name && newShip.class) {
            uiStore.addNotification({
              message: `SHIP UPGRADED! You have acquired the ${newShip.class}-class "${newShip.name}".`,
              type: "success",
              duration: 8000,
            });
          }
        }

        if (
          data.newState?.currentSuggestions &&
          Array.isArray(data.newState.currentSuggestions)
        ) {
          const suggestionCleanerRegex =
            /\s*\((Golden Path|Narrative Path|Path of Risk)\)/g;
          data.newState.currentSuggestions =
            data.newState.currentSuggestions.map((suggestion) =>
              suggestion.replace(suggestionCleanerRegex, "").trim()
            );
        }

        this.session.state = data.newState;

        if (data.gameOver === true) {
          this.isGameOver = true;
          this.finalNarrative =
            data.finalNarrative || "Your adventure has come to an end.";
          this.gameState = "game-over";
        } else if (data.action === "quest_complete") {
          this.gameState = "quest-complete";
          const history = data.newState?.history || [];
          const lastMessage = history[history.length - 1];
          this.questCompletionMessage =
            lastMessage?.parts?.[0]?.text || "The quest has concluded.";
        } else if (data.action === "enter_shopping") {
          this.gameState = "shopping";
        } else {
          this.gameState = this.session.state.gameState || "adventuring";
        }
      } catch (error) {
        if (
          error.message !== "SESSION_REHYDRATED" &&
          error.message !== "RATE_LIMIT_ACTIVE"
        ) {
          uiStore.setError(error.message);
        }
      } finally {
        this.pendingRollResult = null;
        uiStore.clearLoadingTask();
        this.oneTimeBoost = 0;
        this.isPlayerTurn = true;
      }
    },

    resetGame(shouldReload = true) {
      this.gameState = "initializing";
      this.quest = null;
      this.session = null;
      this.questCompletionMessage = null;
      this.isPlayerTurn = true;
      this.energyConstants = { maxEnergy: 100 };
      this.isGameOver = false; // <-- NEW
      this.finalNarrative = null; // <-- NEW
      localStorage.removeItem(GAME_STATE_STORAGE_KEY);
      console.log("🔥 System override: Session and local storage purged.");
      if (shouldReload) {
        const url = new URL(window.location);
        url.searchParams.delete("debug");
        window.history.replaceState({}, document.title, url);
        window.location.reload();
      }
    },

    saveSettings(newSettings) {
      this.modelName = newSettings.modelName.trim();
      this.questModelName = newSettings.questModelName.trim();
      this.themeModelName = newSettings.themeModelName.trim();
      this.temperature = newSettings.temperature;
      this.diceBoost = newSettings.diceBoost;

      localStorage.setItem("geminiModelName", this.modelName);
      localStorage.setItem("geminiQuestModelName", this.questModelName);
      localStorage.setItem("geminiThemeModelName", this.themeModelName);
      localStorage.setItem("geminiTemperature", this.temperature.toString());
      localStorage.setItem("diceBoost", this.diceBoost.toString());

      if (this.session?.sessionId) {
        makeApiRequest("/api/session", {
          method: "POST",
          body: JSON.stringify({
            sessionId: this.session.sessionId,
            modelName: this.modelName,
            temperature: this.temperature,
          }),
        }).catch((err) => {
          if (
            err.message !== "SESSION_REHYDRATED" &&
            err.message !== "RATE_LIMIT_ACTIVE"
          ) {
            useUiStore().setError(
              `Failed to update session settings: ${err.message}`
            );
          }
        });
      }
    },

    useItem(item) {
      if (!item || !item.name) {
        console.error("[useItem] Invalid item object passed.", item);
        return;
      }
      if (this.gameState === "quest-complete" || !this.isPlayerTurn) {
        console.warn(
          `[useItem] Action blocked. Game State: ${this.gameState}, isPlayerTurn: ${this.isPlayerTurn}`
        );
        return;
      }

      const actionText = `I use the ${item.name}.`;
      console.log(
        `[useItem] Triggering game turn with action: "${actionText}"`
      );
      this.runGameTurn(actionText);
    },

    async fetchGameConstants() {
      try {
        if (!this.session?.state?.character?.maxEnergy) {
          const energyResponse = await fetch("/api/data/energy-constants");
          if (!energyResponse.ok) {
            console.warn("Failed to load energy constants, using default.");
          } else {
            this.energyConstants = await energyResponse.json();
            if (this.session?.state?.character) {
              this.session.state.character.maxEnergy =
                this.session.state.character.maxEnergy ||
                this.energyConstants.maxEnergy;
            }
          }
        }
      } catch (error) {
        useUiStore().setError(error.message);
      }
    },

    debug_forceCompleteQuest() {
      if (!this.isDebugMode) {
        console.warn("Attempted to call debug function outside of debug mode.");
        return;
      }
      console.log(
        "%c[DEBUG] Forcing quest completion.",
        "color: #e74c3c; font-weight: bold;"
      );
      if (this.session && this.session.state && this.session.state.quest) {
        this.session.state.quest.isComplete = true;
        this.questCompletionMessage =
          "Quest forcibly completed via debug action.\\n\\nThis is where the final narrative text from the Dungeon Master would appear, wrapping up the story and detailing the outcome of your adventure.";
        this.isPlayerTurn = false;
        this.gameState = "quest-complete";
      } else {
        useUiStore().setError(
          "Cannot force complete quest: no active session or quest."
        );
      }
    },

    async debug_forceGoalAchievement() {
      if (!this.isDebugMode) {
        console.warn("Attempted to call debug function outside of debug mode.");
        return;
      }
      if (this.gameState === "quest-complete" || !this.isPlayerTurn) {
        console.warn(
          `[DEBUG] Force Goal Achievement blocked. Game State: ${this.gameState}, isPlayerTurn: ${this.isPlayerTurn}`
        );
        return;
      }

      console.log(
        "%c[DEBUG] Forcing AI-driven quest completion via goal achievement.",
        "color: #8e44ad; font-weight: bold;"
      );
      await this.runGameTurn("", true);
    },

    async debug_setHealth(newHealth) {
      if (!this.isDebugMode) return;
      const uiStore = useUiStore();
      uiStore.setLoadingTask("debug-health-change");
      try {
        const data = await makeApiRequest("/api/debug/set-health", {
          method: "POST",
          body: JSON.stringify({
            sessionId: this.session.sessionId,
            newHealth: newHealth,
          }),
        });
        this.session.state = data.newState;
        uiStore.addNotification({
          message: `Health set to: ${newHealth}/${this.maxHealth}`,
          type: "info",
        });
      } catch (error) {
        if (
          error.message !== "SESSION_REHYDRATED" &&
          error.message !== "RATE_LIMIT_ACTIVE"
        ) {
          uiStore.setError(error.message);
        }
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    async debug_setEnergy(newEnergy) {
      if (!this.isDebugMode) return;
      const uiStore = useUiStore();
      uiStore.setLoadingTask("debug-energy-change");
      try {
        const data = await makeApiRequest("/api/debug/set-energy", {
          method: "POST",
          body: JSON.stringify({
            sessionId: this.session.sessionId,
            newEnergy: newEnergy,
          }),
        });
        this.session.state = data.newState;
        uiStore.addNotification({
          message: `Energy set to: ${newEnergy}/${this.maxEnergy}`,
          type: "info",
        });
      } catch (error) {
        if (
          error.message !== "SESSION_REHYDRATED" &&
          error.message !== "RATE_LIMIT_ACTIVE"
        ) {
          uiStore.setError(error.message);
        }
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    async debug_setCurrency(newCurrency) {
      if (!this.isDebugMode) return;
      const uiStore = useUiStore();
      uiStore.setLoadingTask("debug-currency-change");
      try {
        const data = await makeApiRequest("/api/debug/set-currency", {
          method: "POST",
          body: JSON.stringify({
            sessionId: this.session.sessionId,
            newCurrency: newCurrency,
          }),
        });
        this.session.state = data.newState;
        uiStore.addNotification({
          message: `Currency set to: ${newCurrency.toLocaleString()}`,
          type: "info",
        });
      } catch (error) {
        if (
          error.message !== "SESSION_REHYDRATED" &&
          error.message !== "RATE_LIMIT_ACTIVE"
        ) {
          uiStore.setError(error.message);
        }
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    setGameState(newState) {
      this.gameState = newState;
    },

    async generateQuest(characterContext, theme = "") {
      const uiStore = useUiStore();

      if (!characterContext) {
        uiStore.setError(
          "Cannot generate quest without a finalized character."
        );
        return;
      }

      this.quest = null;
      uiStore.clearError();
      uiStore.setLoadingTask("quest-generation");

      try {
        const requestBody = {
          characterContext: characterContext,
          seed: theme,
          themesToExclude: theme ? [] : this.seenThemes,
          worldState: this.session?.state?.worldState || {},
          modelName: this.questModelName,
          themeModelName: this.themeModelName,
        };

        const questData = await makeApiRequest("/api/quests", {
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        const newQuest = questData.quests[0];

        this.quest = {
          theme: questData.theme,
          ...newQuest,
        };

        if (!this.seenThemes.includes(questData.theme)) {
          this.seenThemes.push(questData.theme);
        }
      } catch (error) {
        if (
          error.message !== "SESSION_REHYDRATED" &&
          error.message !== "RATE_LIMIT_ACTIVE"
        ) {
          uiStore.setError(error.message);
        }
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    resetQuestState() {
      console.log("[useGameStore] Clearing active quest.");
      useUiStore().clearError();
      this.quest = null;
    },

    async prepareForNewQuest() {
      const uiStore = useUiStore();
      if (!this.session) {
        uiStore.setError(
          "Critical Error: Cannot prepare new quest without an active session."
        );
        this.setGameState("error");
        return;
      }

      const characterForNextQuest = JSON.parse(
        JSON.stringify(this.session.state.character)
      );

      uiStore.setLoadingTask("compacting world memories...");
      try {
        const data = await makeApiRequest("/api/worldstate/summarize", {
          method: "POST",
          body: JSON.stringify({ sessionId: this.session.sessionId }),
        });
        this.session.state = data.newState;

        this.session.state.character = characterForNextQuest;

        uiStore.addNotification({
          message: "World memories compacted for the next adventure.",
          type: "info",
        });
      } catch (error) {
        if (
          error.message !== "SESSION_REHYDRATED" &&
          error.message !== "RATE_LIMIT_ACTIVE"
        ) {
          console.warn("Error during world state compaction:", error.message);
          uiStore.addNotification({
            message: "An error occurred while compacting memories.",
            type: "warning",
          });
        }
      } finally {
        uiStore.clearLoadingTask();
      }

      console.log(
        "[State] Preparing for new quest. Deferring inventory and resource management to the backend."
      );

      this.setGameState("quest-selection");
      this.quest = null;
      this.questCompletionMessage = null;

      await this.generateQuest(characterForNextQuest);
    },

    async exitShopping() {
      if (this.gameState !== "shopping" || !this.isPlayerTurn) return;

      const uiStore = useUiStore();
      this.isPlayerTurn = false;
      uiStore.setLoadingTask("leaving-shop");
      uiStore.clearError();

      try {
        const data = await makeApiRequest("/api/merchants/transact", {
          method: "POST",
          body: JSON.stringify({
            sessionId: this.session.sessionId,
            action: "leave",
          }),
        });

        this.session.state = data.newState;
        this.gameState = this.session.state.gameState;

        console.log(
          "[State] Successfully exited shopping state via API. Resuming adventure."
        );
      } catch (error) {
        if (
          error.message !== "SESSION_REHYDRATED" &&
          error.message !== "RATE_LIMIT_ACTIVE"
        ) {
          uiStore.setError(error.message);
        }
      } finally {
        this.isPlayerTurn = true;
        uiStore.clearLoadingTask();
      }
    },

    async startGameSession() {
      const uiStore = useUiStore();
      const creationStore = useCharacterCreationStore();
      const characterForSession = creationStore.finalizedCharacter;

      const questForSession = { ...this.quest };

      if (!characterForSession || !questForSession) {
        uiStore.setError("Cannot start game without a character and a quest.");
        return;
      }

      const startingItem = questForSession.startingItem;
      if (startingItem) {
        const finalItem = {
          ...startingItem,
          category: "mission-item",
          isSignature: false,
          isQuestItem: true,
          isNew: true,
        };
        if (!characterForSession.inventory) {
          characterForSession.inventory = [];
        }
        const mutableCharacter = JSON.parse(
          JSON.stringify(characterForSession)
        );
        mutableCharacter.inventory.push(finalItem);

        console.log(
          `[Inventory] Bundled new quest item for session creation: "${finalItem.name}"`
        );
        delete questForSession.startingItem;

        this._startSessionApiCall(mutableCharacter, questForSession);
      } else {
        this._startSessionApiCall(characterForSession, questForSession);
      }
    },

    async _startSessionApiCall(character, quest) {
      const uiStore = useUiStore();
      uiStore.setLoadingTask("session-start");
      try {
        const sessionData = await makeApiRequest("/api/session", {
          method: "POST",
          body: JSON.stringify({
            modelName: this.modelName,
            temperature: this.temperature,
            character: character,
            quest: quest,
            sessionId: this.session?.sessionId || null,
          }),
        });

        this.session = {
          sessionId: sessionData.sessionId,
          state: sessionData.state,
        };
        this.isDebugMode = sessionData.isDebug || this.isDebugMode;
        this.quest = sessionData.state.quest;

        await this.fetchGameConstants();

        this.setGameState(this.session.state.gameState || "adventuring");
      } catch (error) {
        if (
          error.message !== "SESSION_REHYDRATED" &&
          error.message !== "RATE_LIMIT_ACTIVE"
        ) {
          uiStore.setError(error.message);
        }
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    forceRegenerate() {
      const uiStore = useUiStore();
      if (!this.session || this.session.state.history.length < 2) return;

      uiStore.showForgetButton = false;
      this.session.state.history.pop();
      const lastUserInputEntry = this.session.state.history.pop();

      if (lastUserInputEntry && lastUserInputEntry.role === "user") {
        const lastUserInput = lastUserInputEntry.parts[0].text;
        console.log(
          `Forgetting last AI response and re-running turn with input: "${lastUserInput}"`
        );
        this.runGameTurn(lastUserInput);
      } else {
        uiStore.setError("Could not determine the last action to retry.");
      }
    },

    resetSeenThemes() {
      if (this.seenThemes.length > 0) {
        console.log(
          "[useGameStore] Resetting seen themes for new character concept."
        );
        this.seenThemes = [];
      }
    },
  },
});

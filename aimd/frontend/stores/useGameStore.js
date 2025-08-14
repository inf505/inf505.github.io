// frontend/stores/useGameStore.js
import { defineStore } from "pinia";
import { useUiStore } from "/stores/useUiStore.js";
import { useCharacterCreationStore } from "/stores/useCharacterCreationStore.js";
import { formatNarrative } from "/utils/formatters.js";

const GAME_SESSION_KEY = "ai-md-saved-game";

export const useGameStore = defineStore("game", {
  state: () => ({
    isStateHydrated: false,
    gameState: "initializing",
    case: null,
    seenThemes: [],
    lastCaseLocation: null,
    isPlayerTurn: true,
    session: null,
    apiKey: localStorage.getItem("geminiApiKey") || "",
    models: (() => {
      const saved = localStorage.getItem("geminiModels");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (
            parsed &&
            typeof parsed.caseGeneration === "string" &&
            typeof parsed.gameplay === "string"
          ) {
            return parsed;
          }
        } catch (e) {
          console.warn(
            "Could not parse models from localStorage, using defaults."
          );
        }
      }
      return {
        caseGeneration: "gemini-2.5-flash",
        gameplay: "gemini-2.5-flash-lite",
      };
    })(),
    temperature: parseFloat(localStorage.getItem("geminiTemperature")) || 1.0,
    apiTimeout: parseInt(localStorage.getItem("apiTimeout")) || 30,
    isTutorEnabled: localStorage.getItem("isTutorEnabled") === "true", // Default: false
    isFocusEnabled: localStorage.getItem("isFocusEnabled") !== "false", // Default: true
    showSituationSummary:
      localStorage.getItem("showSituationSummary") === "true", // Default: false

    // Shuffled Suggestions feature
    isSuggestionShuffleEnabled:
      localStorage.getItem("isSuggestionShuffleEnabled") === "true",
    hasUnlockedShuffle: localStorage.getItem("hasUnlockedShuffle") === "true",

    isTutorModeActive: false,
    oneTimeBoost: 0,
    debug_currentSituation: null,
    isDebugMode: false,
    stats: [],
    energyConstants: { maxEnergy: 100 },
    caseCompletionMessage: null,
    isDiceRolling: false,
    diceRollDetails: null,
    caseSummary: null,
  }),

  getters: {
    difficultyTier(state) {
      const reputation = state.character?.currency || 0;
      if (reputation <= 100) return "Intern Level";
      if (reputation <= 250) return "Resident Level";
      if (reputation <= 1000) return "Attending Level";
      return "Consultant Level";
    },
    displayTier() {
      return this.difficultyTier.replace(" Level", "");
    },
    formattedChatHistory: (state) => {
      if (!state.session?.state?.history) return [];
      return state.session.state.history
        .map((entry) => {
          let rawText = (entry?.parts?.[0]?.text ?? "").trim();
          if (!rawText) return null;

          let speaker;
          if (entry.role === "user") {
            speaker = "You";
          } else if (entry.role === "tutor") {
            speaker = "AI";
          } else {
            speaker = "Narrator";
          }

          if (!state.showSituationSummary && speaker === "Narrator") {
            rawText = rawText
              .replace(/<p class="situation-summary">.*?<\/p>/s, "")
              .trim();
          }

          const text = formatNarrative(rawText);
          return { speaker, text };
        })
        .filter((entry) => entry && entry.text);
    },
    character: (state) => {
      if (state.session?.state?.character) {
        return state.session.state.character;
      }
      return useCharacterCreationStore().finalizedCharacter;
    },
    entities: (state) => state.session?.state?.entities || [],
    activeBoost(state) {
      return this.oneTimeBoost;
    },
    resolutionMessage: (state) => {
      if (!state.caseCompletionMessage) return "";
      return formatNarrative(state.caseCompletionMessage);
    },
    isGameActive: (state) =>
      state.session !== null &&
      ["adventuring", "case-complete", "game_over"].includes(state.gameState),
    activeCaseGoal(state) {
      return state.case?.overallGoal || null;
    },
    maxHealth: (state) => state.character?.maxHealth || 100,
    maxEnergy: (state) => state.character?.maxEnergy || 100,
    turnCount: (state) => state.session?.state?.turnCount || 0,
    caseSummaryData: (state) => state.session?.state?.caseSummary || null,
    debugOptimalActionText: (state) =>
      state.session?.state?.debugOptimalActionText || null,
    isInputDisabled(state) {
      const uiStore = useUiStore();
      if (uiStore.isRateLimited) return true;
      if (state.isDiceRolling) return true;
      if (!state.isPlayerTurn) return true;
      if (
        state.gameState === "case-complete" ||
        state.gameState === "game_over"
      )
        return true;
      return false;
    },
    inputPlaceholder(state) {
      if (state.isTutorModeActive) {
        return "Ask the Clinical Tutor a question or leave blank for a hint...";
      }
      if (!state.isPlayerTurn || state.isDiceRolling) {
        return "Awaiting outcome...";
      }
      if (state.session?.state?.currentSuggestions?.length > 0) {
        return "Choose your next action...";
      }
      return "Type your action...";
    },
  },

  actions: {
    _handleApiError(error, uiStore) {
      const SESSION_RELOAD_KEY = "sessionNotFoundReloadAttempted";

      // --- NEW: Handle Authentication Errors ---
      // This catches errors if the API key is missing or invalid on the server-side.
      if (error && error.isAuthError) {
        uiStore.setError(
          error.error || "An API Key is required. Please check your settings."
        );
        // NOTE: This calls an 'openSettings' action that we will add to useUiStore.
        // It will be responsible for making the settings modal visible.
        uiStore.openSettings();
        return; // Stop further generic error handling
      }
      // --- END NEW ---

      if (error?.error === "Session not found") {
        if (sessionStorage.getItem(SESSION_RELOAD_KEY)) {
          // We've already tried reloading once, so this is a persistent error.
          console.error(
            "Session not found error persisted after reload. Aborting."
          );
          sessionStorage.removeItem(SESSION_RELOAD_KEY); // Clean up the key
          uiStore.setError(
            "Your session could not be restored. Please start a new career to resolve this issue."
          );
          this.resetGame(false); // Reset state without reloading
          this.setGameState("discipline-selection");
          return;
        } else {
          // First time encountering this error, set the flag and reload.
          console.warn(
            "Session not found on server. Attempting a one-time page reload to recover."
          );

          sessionStorage.setItem(
            "session-recovery-notification",
            "Session restored. Please try your last action again."
          );

          sessionStorage.setItem(SESSION_RELOAD_KEY, "true");
          window.location.reload();
          return; // Stop further execution
        }
      }

      if (error && error.isRateLimitError) {
        console.warn(
          `[RATE_LIMIT] Client handling rate limit. Cooldown: ${error.retryDelay}ms`
        );
        const cooldownSeconds = Math.ceil((error.retryDelay || 60000) / 1000);
        uiStore.startRateLimitCountdown(cooldownSeconds);
        uiStore.setError(
          error.message || "API rate limit exceeded. Please wait."
        );
      } else {
        uiStore.setError(
          error.message || error.error || "An unknown network error occurred."
        );
      }
    },
    saveGameToLocalStorage() {
      if (this.session && this.session.state) {
        try {
          const stateToSave = {
            session: this.session,
          };
          localStorage.setItem(GAME_SESSION_KEY, JSON.stringify(stateToSave));
          console.log(
            `[PERSISTENCE] Game state saved to localStorage for session ${this.session.sessionId}.`
          );
        } catch (error) {
          console.error(
            "[PERSISTENCE] Failed to save game state to localStorage:",
            error
          );
        }
      }
    },
    async _fetchWithTimeout(resource, options = {}) {
      const timeout = this.apiTimeout * 1000;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(resource, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        if (error.name === "AbortError") {
          throw new Error(
            `The server took more than ${this.apiTimeout} seconds to respond. You can adjust this in Settings.`
          );
        }
        throw error;
      }
    },
    _getDifficultyTier() {
      const reputation = this.character?.currency || 0;
      if (reputation <= 100) return "Intern Level";
      if (reputation <= 250) return "Resident Level";
      if (reputation <= 1000) return "Attending Level";
      return "Consultant Level";
    },

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
      await this.fetchStats();

      const savedStateJSON = localStorage.getItem(GAME_SESSION_KEY);

      try {
        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          if (savedState.session && savedState.session.state) {
            console.log(
              `[PERSISTENCE] Found saved game. Rehydrating state from localStorage and server.`
            );
            this.session = savedState.session;
            this.case = this.session.state.case;
            this.gameState = this.session.state.gameState;

            this.apiKey =
              this.session.config?.apiKey ||
              localStorage.getItem("geminiApiKey") ||
              "";

            await this.rehydrateSessionOnServer(this.session.state);
          } else {
            await this.startFreshSession(uiStore, creationStore);
          }
        } else {
          await this.startFreshSession(uiStore, creationStore);
        }
      } catch (error) {
        console.error("☠️ Failed during hydration, resetting state.", error);

        const errorMessage =
          error.message ||
          error.error ||
          "An unknown error occurred during hydration.";
        uiStore.setError(errorMessage);

        localStorage.removeItem(GAME_SESSION_KEY);
        await this.startFreshSession(uiStore, creationStore);
      } finally {
        const recoveryMessage = sessionStorage.getItem(
          "session-recovery-notification"
        );
        if (recoveryMessage) {
          // Set the message in the store's dedicated property.
          uiStore.postReloadMessage = {
            message: recoveryMessage,
            type: "info",
            duration: 7000,
          };
          sessionStorage.removeItem("session-recovery-notification");
        }

        this.isStateHydrated = true;
        console.log("State hydration complete. Opening the application gate.");
      }
    },

    async runGameTurn(action, forceComplete = false, usedItemName = null) {
      const uiStore = useUiStore();
      uiStore.clearError();

      let userInput = "";
      let chosenSuggestionType = "standard";

      if (typeof action === "string") {
        userInput = action;
      } else if (typeof action === "object" && action.text) {
        userInput = action.text;
        chosenSuggestionType = action.type || "standard";
        if (chosenSuggestionType !== "standard") {
          console.log(
            `[ACTION] Player has chosen a special action of type: '${chosenSuggestionType}'`
          );
        }
      } else {
        uiStore.setError("Invalid action provided to runGameTurn.");
        return;
      }

      uiStore.showForgetButton = false;
      this.isPlayerTurn = false;
      this.diceRollDetails = null;
      this.isDiceRolling = true;

      try {
        const rollResponse = await this._fetchWithTimeout(
          "/api/generate/roll",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: this.session.sessionId,
              diceBoost: this.activeBoost,
              useFocus: this.isFocusEnabled,
            }),
          }
        );

        const rollData = await rollResponse.json();
        if (!rollResponse.ok) throw rollData;
        this.diceRollDetails = rollData;

        uiStore.setLoadingTask("game-turn");

        const body = {
          sessionId: this.session.sessionId,
          userInput: userInput,
          rollResult: rollData,
          forceComplete: forceComplete,
          usedItemName: usedItemName,
          shuffleSuggestions: this.isSuggestionShuffleEnabled,
          useFocus: this.isFocusEnabled,
          chosenSuggestionType: chosenSuggestionType,
        };

        const generateResponse = await this._fetchWithTimeout("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await generateResponse.json();
        if (!generateResponse.ok) throw data;

        uiStore.clearLoadingTask();
        if (
          data.newState?.currentSuggestions &&
          Array.isArray(data.newState.currentSuggestions)
        ) {
          data.newState.currentSuggestions =
            data.newState.currentSuggestions.filter(
              (s) => s && typeof s.text === "string"
            );
        }

        this.session.state = data.newState;
        this.case = data.newState.case;

        const currentReputation = this.character?.currency || 0;
        if (currentReputation > 100 && !this.hasUnlockedShuffle) {
          uiStore.addNotification({
            message:
              "Gameplay Feature Unlocked: 'Shuffled Suggestions' now available in Settings.",
            type: "success",
            duration: 7000,
          });
          this.hasUnlockedShuffle = true;
          localStorage.setItem("hasUnlockedShuffle", "true");
        }

        this.gameState = this.session.state.gameState || "adventuring";
        this.debug_currentSituation = data.newSituation || null;

        if (data.events && Array.isArray(data.events)) {
          data.events.forEach((event) => {
            let type = "info";
            if (event.type === "REPUTATION_DELTA") {
              type = event.value > 0 ? "success" : "warning";
            } else if (event.type === "HEALTH_DELTA") {
              type = event.value > 0 ? "success" : "error";
            } else if (event.type === "ENERGY_DELTA") {
              type = event.value > 0 ? "success" : "warning";
            }
            uiStore.addNotification({
              message: event.message,
              type: type,
            });
          });
        }

        this.saveGameToLocalStorage();
      } catch (error) {
        uiStore.clearLoadingTask();
        this._handleApiError(error, uiStore);
      } finally {
        this.oneTimeBoost = 0;
        this.isDiceRolling = false;
        this.isPlayerTurn = true;
      }
    },

    async fetchStats() {
      try {
        const response = await fetch("/api/data/stats");
        if (!response.ok) {
          console.warn(
            "Failed to load stat definitions, abbreviations may not work."
          );
          this.stats = [];
        } else {
          this.stats = await response.json();
        }
      } catch (error) {
        useUiStore().setError("Could not load core game data (stats).");
        this.stats = [];
      }
    },

    resetGame(shouldReload = true) {
      this.gameState = "initializing";
      this.case = null;
      this.session = null;
      this.debug_currentSituation = null;
      this.caseCompletionMessage = null;
      this.caseSummary = null;
      this.isPlayerTurn = true;
      this.lastCaseLocation = null;
      this.energyConstants = { maxEnergy: 100 };
      this.isDiceRolling = false;
      this.diceRollDetails = null;
      localStorage.removeItem(GAME_SESSION_KEY);
      console.log("🔥 Game session and storage have been reset.");
      if (shouldReload) {
        const url = new URL(window.location);
        url.searchParams.delete("debug");
        window.history.replaceState({}, document.title, url);
        window.location.reload();
      }
    },

    saveSettings(newSettings) {
      this.apiKey = newSettings.apiKey.trim();
      this.models = newSettings.models;
      this.temperature = newSettings.temperature;
      this.apiTimeout = newSettings.apiTimeout;
      this.isTutorEnabled = newSettings.isTutorEnabled;
      this.isFocusEnabled = newSettings.isFocusEnabled;
      this.showSituationSummary = newSettings.showSituationSummary;
      this.isSuggestionShuffleEnabled = newSettings.isSuggestionShuffleEnabled;
      if (this.models.caseGeneration) {
        this.models.caseGeneration = this.models.caseGeneration.trim();
      }
      if (this.models.gameplay) {
        this.models.gameplay = this.models.gameplay.trim();
      }

      localStorage.setItem("geminiApiKey", this.apiKey);
      localStorage.setItem("geminiModels", JSON.stringify(this.models));
      localStorage.removeItem("geminiModelName");
      localStorage.setItem("geminiTemperature", this.temperature.toString());
      localStorage.setItem("apiTimeout", this.apiTimeout.toString());
      localStorage.setItem("isTutorEnabled", this.isTutorEnabled.toString());
      localStorage.setItem("isFocusEnabled", this.isFocusEnabled.toString());
      localStorage.setItem(
        "showSituationSummary",
        this.showSituationSummary.toString()
      );
      localStorage.setItem(
        "isSuggestionShuffleEnabled",
        this.isSuggestionShuffleEnabled.toString()
      );

      if (this.session?.sessionId) {
        fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: this.session.sessionId,
            apiKey: this.apiKey,
            models: this.models,
            temperature: this.temperature,
          }),
        }).catch((err) =>
          console.warn("Failed to update session settings on server:", err)
        );
      }
    },

    useItem(item) {
      if (!item || !item.name) {
        console.error("[useItem] Invalid item object passed.", item);
        return;
      }
      if (this.isInputDisabled) {
        console.warn(`[useItem] Action blocked. Input is disabled.`);
        return;
      }

      const actionText = `I use ${item.name}.`;
      console.log(
        `[useItem] Triggering game turn with action: "${actionText}"`
      );
      this.runGameTurn(actionText, false, item.name);
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

    async forceCompleteCase() {
      const confirmation = window.confirm(
        "Are you sure you want to force this case to a conclusion? This action cannot be undone."
      );

      if (!confirmation) {
        return;
      }

      if (this.isInputDisabled) return;

      console.log(
        "%c[ACTION] Forcing AI-driven case completion via player action.",
        "color: #8e44ad; font-weight: bold;"
      );
      await this.runGameTurn("", true);
    },

    toggleTutorMode() {
      this.isTutorModeActive = !this.isTutorModeActive;
    },

    async getClinicalAdvice(userInput) {
      if (!this.isTutorEnabled || !this.isPlayerTurn) return;

      const uiStore = useUiStore();
      uiStore.clearError();
      this.isPlayerTurn = false;
      uiStore.setLoadingTask("clinical-tutor-consult");
      this.isTutorModeActive = false;

      try {
        const requestBody = {
          sessionId: this.session.sessionId,
          userInput: userInput,
        };

        const response = await this._fetchWithTimeout("/api/tutor/get-advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        if (!response.ok) throw data;

        if (!data || !data.newState) {
          throw new Error(
            "The server returned an invalid response for the tutor consultation."
          );
        }

        this.session.state = data.newState;
      } catch (error) {
        this._handleApiError(error, uiStore);
      } finally {
        this.isPlayerTurn = true;
        uiStore.clearLoadingTask();
      }
    },

    async debug_setHealth(newHealth) {
      if (!this.isDebugMode) return;
      const uiStore = useUiStore();
      uiStore.setLoadingTask("debug-health-change");
      try {
        const response = await this._fetchWithTimeout("/api/debug/set-health", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: this.session.sessionId,
            newHealth: newHealth,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw data;

        this.session.state = data.newState;
        uiStore.addNotification({
          message: `Health set to: ${newHealth}/${this.maxHealth}`,
          type: "info",
        });
      } catch (error) {
        this._handleApiError(error, uiStore);
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    async debug_setEnergy(newEnergy) {
      if (!this.isDebugMode) return;
      const uiStore = useUiStore();
      uiStore.setLoadingTask("debug-energy-change");
      try {
        const response = await this._fetchWithTimeout("/api/debug/set-energy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: this.session.sessionId,
            newEnergy: newEnergy,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw data;

        this.session.state = data.newState;
        uiStore.addNotification({
          message: `Energy set to: ${newEnergy}/${this.maxEnergy}`,
          type: "info",
        });
      } catch (error) {
        this._handleApiError(error, uiStore);
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    async debug_setReputation(newReputation) {
      if (!this.isDebugMode) return;
      const uiStore = useUiStore();
      uiStore.setLoadingTask("debug-reputation-change");
      try {
        const response = await this._fetchWithTimeout(
          "/api/debug/set-reputation",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: this.session.sessionId,
              newReputation: newReputation,
            }),
          }
        );
        const data = await response.json();
        if (!response.ok) throw data;

        this.session.state = data.newState;
        uiStore.addNotification({
          message: `Reputation set to: ${newReputation}`,
          type: "info",
        });
      } catch (error) {
        this._handleApiError(error, uiStore);
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    setGameState(newState) {
      this.gameState = newState;
    },

    async startFreshSession(uiStore, creationStore) {
      uiStore.setLoadingTask("initializing");
      await creationStore.fetchDisciplines();
      uiStore.clearLoadingTask();
      this.setGameState("discipline-selection");
    },

    async rehydrateSessionOnServer(loadedState) {
      const uiStore = useUiStore();
      uiStore.setLoadingTask("session-rehydrate");
      const response = await this._fetchWithTimeout("/api/session/rehydrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: loadedState,
          apiKey: this.apiKey,
          models: this.models,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to rehydrate session on server.");
      }

      this.session.sessionId = data.sessionId;
      this.isDebugMode = data.isDebug || this.isDebugMode;
      console.log(
        `[PERSISTENCE] Server rehydrated state. New session ID is ${data.sessionId}`
      );

      // On successful rehydration, clear the reload attempt flag.
      const SESSION_RELOAD_KEY = "sessionNotFoundReloadAttempted";
      if (sessionStorage.getItem(SESSION_RELOAD_KEY)) {
        console.log(
          "[RECOVERY] Session successfully recovered after reload. Clearing reload flag."
        );
        sessionStorage.removeItem(SESSION_RELOAD_KEY);
      }

      uiStore.clearLoadingTask();
    },

    async generateCase(theme = "") {
      const uiStore = useUiStore();
      uiStore.clearError();

      // --- Pre-flight check for API Key ---
      if (!this.apiKey) {
        uiStore.setError("A Gemini API Key is required to generate new cases.");

        // --- NEW: Register the interrupted action before opening settings ---
        console.log(
          "[WORKFLOW] API key missing. Registering 'generateCase' as a pending action."
        );
        uiStore.setPendingAction(() => this.generateCase(theme));

        uiStore.openSettings();
        return; // Stop execution.
      }
      // --- END ---

      const characterContext = this.character;

      if (!characterContext) {
        uiStore.setError("Cannot generate case without a finalized character.");
        return;
      }

      const difficultyTier = this._getDifficultyTier();
      console.log(
        `[Difficulty] Generating case with tier: "${difficultyTier}" (Reputation: ${
          characterContext.currency || 0
        })`
      );

      this.case = null;
      uiStore.setLoadingTask("case-generation");

      try {
        const requestBody = {
          apiKey: this.apiKey, // <-- Pass the client's key to the server.
          characterContext: characterContext,
          seed: theme,
          themesToExclude: theme ? [] : this.seenThemes,
          worldState: this.session?.state?.worldState || {},
          difficultyTier: difficultyTier,
          modelName: this.models.caseGeneration,
        };

        if (this.lastCaseLocation) {
          requestBody.forceLocation = this.lastCaseLocation;
        }

        const caseResponse = await this._fetchWithTimeout("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const caseData = await caseResponse.json();
        if (!caseResponse.ok) throw caseData;

        const newCase = caseData.cases[0];

        this.case = {
          theme: caseData.theme,
          ...newCase,
        };

        if (!this.seenThemes.includes(caseData.theme)) {
          this.seenThemes.push(caseData.theme);
        }
      } catch (error) {
        this._handleApiError(error, uiStore);
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    resetCaseState() {
      console.log("[useGameStore] Clearing active case.");
      useUiStore().clearError();
      this.case = null;
    },

    async prepareForNewCase() {
      const uiStore = useUiStore();
      if (!this.session) {
        uiStore.setError(
          "Critical Error: Cannot prepare new case without an active session."
        );
        this.setGameState("error");
        return;
      }

      if (this.session.state.character?.inventory) {
        const oldItemCount = this.session.state.character.inventory.length;
        this.session.state.character.inventory =
          this.session.state.character.inventory.filter(
            (item) => item.isSignature === true || item.isReward === true
          );
        const newItemCount = this.session.state.character.inventory.length;
        console.log(
          `[CLIENT_CLEANUP] Inventory cleaned for new case. Removed ${
            oldItemCount - newItemCount
          } non-permanent item(s).`
        );
      }

      if (this.session.state.entities) {
        this.session.state.entities = [];
        console.log("[CLIENT_CLEANUP] Cleared entities for new case.");
      }

      if (this.session.state.history) {
        this.session.state.history = [];
        console.log("[CLIENT_CLEANUP] Cleared chat history for new case.");
      }

      uiStore.setLoadingTask("compacting world memories...");
      try {
        const response = await this._fetchWithTimeout(
          "/api/worldstate/summarize",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: this.session.sessionId }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          console.warn(
            "Failed to compact world state, proceeding anyway.",
            data.error
          );
        } else {
          this.session.state.worldState = data.newState.worldState;

          uiStore.addNotification({
            message: "Case notes compacting",
            type: "info",
          });
        }
      } catch (error) {
        console.warn("Error during world state compaction:", error.message);
      } finally {
        uiStore.clearLoadingTask();
      }

      this.lastCaseLocation = null;
      this.setGameState("case-selection");
      this.case = null;
      this.caseCompletionMessage = null;
      this.caseSummary = null;
      this.saveGameToLocalStorage();

      await this.generateCase();
    },

    async startGameSession() {
      const uiStore = useUiStore();
      uiStore.clearError();

      const characterForSession = { ...this.character };
      const caseForSession = { ...this.case };

      if (!characterForSession || !caseForSession) {
        uiStore.setError("Cannot start game without a character and a case.");
        return;
      }

      const startingItem = caseForSession.startingItem;
      if (startingItem) {
        const finalItem = {
          name: startingItem.name,
          entries: [{ text: startingItem.description, turnAdded: 1 }],
          category: "Case Item",
          isSignature: false,
          isCaseItem: true,
          isNew: true,
        };
        if (!characterForSession.inventory) {
          characterForSession.inventory = [];
        }
        characterForSession.inventory.push(finalItem);
        console.log(
          `[Inventory] Bundled new case item for session creation: "${finalItem.name}"`
        );
      }

      uiStore.setLoadingTask("session-start");
      try {
        const response = await this._fetchWithTimeout("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: this.apiKey,
            models: this.models,
            temperature: this.temperature,
            character: characterForSession,
            case: caseForSession,
            sessionId: this.session?.sessionId || null,
          }),
        });
        const sessionData = await response.json();
        if (!response.ok) throw sessionData;

        this.session = {
          sessionId: sessionData.sessionId,
          state: sessionData.state,
        };
        this.isDebugMode = sessionData.isDebug || this.isDebugMode;
        this.debug_currentSituation = sessionData.initialSituation || null;
        this.case = sessionData.state.case;

        await this.fetchGameConstants();

        this.setGameState(this.session.state.gameState || "adventuring");
        this.saveGameToLocalStorage();
      } catch (error) {
        this._handleApiError(error, uiStore);
      } finally {
        uiStore.clearLoadingTask();
      }
    },

    forceRegenerate() {
      if (!this.session || this.session.state.history.length < 2) return;
      if (this.isInputDisabled) return;

      const uiStore = useUiStore();
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
  },
});

// frontend/components/App.js
import { computed, onMounted, ref, watch } from "vue";

import { useUiStore } from "../stores/useUiStore.js";
import { useCharacterCreationStore } from "../stores/useCharacterCreationStore.js";
import { useGameStore } from "../stores/useGameStore.js";

import NotificationContainer from "./NotificationContainer.js";
import SidebarDashboard from "./SidebarDashboard.js";
import CaseSetup from "./CaseSetup.js";
import MedicalSimChatWindow from "./ChatWindow.js";
import DisciplineSelection from "./DisciplineSelection.js";
import SpecializationSelection from "./SpecializationSelection.js";
import LoadingSpinner from "./LoadingSpinner.js";
import ErrorMessage from "./ErrorMessage.js";
import ChatInput from "./ChatInput.js";
import Settings from "./Settings.js";
import CaseComplete from "./CaseComplete.js";
import InfoPopover from "./InfoPopover.js";
import MobileStatusHud from "./MobileStatusHud.js";

import { locationThemes } from "../data/location_themes.js";

export default {
  name: "App",
  components: {
    SidebarDashboard,
    CaseSetup,
    MedicalSimChatWindow,
    DisciplineSelection,
    SpecializationSelection,
    LoadingSpinner,
    ErrorMessage,
    ChatInput,
    Settings,
    NotificationContainer,
    CaseComplete,
    InfoPopover,
    MobileStatusHud,
  },

  setup() {
    const uiStore = useUiStore();
    const creationStore = useCharacterCreationStore();
    const gameStore = useGameStore();

    const isSidebarCollapsed = ref(false);

    const isLoading = computed(() => uiStore.loadingTask === "game-turn");
    const isDebugMode = computed(() => gameStore.isDebugMode);
    const debugSituation = computed(() => gameStore.debug_currentSituation);
    const turnCount = computed(() => gameStore.turnCount);

    const patient = computed(() => {
      return (gameStore.entities || []).find((e) => e.role === "patient");
    });

    const patientStability = computed(() => {
      if (patient.value && patient.value.patientStability !== undefined) {
        return patient.value.patientStability;
      }
      return null;
    });

    const resolutionStatus = computed(() => {
      if (gameStore.gameState === "case-complete") return "success";
      if (
        gameStore.gameState === "case-failed" ||
        gameStore.gameState === "game_over"
      )
        return "failure";
      return null;
    });

    const isEndOfCase = computed(() => !!resolutionStatus.value);

    const resolutionMessage = computed(() => gameStore.resolutionMessage);

    const isBlockingLoad = computed(() => {
      const blockingTasks = [
        "initializing",
        "session-start",
        "specialization-load",
        "character-finalize",
      ];
      return blockingTasks.includes(uiStore.loadingTask);
    });
    const creationHeaderTitle = computed(() => {
      const state = gameStore.gameState;
      if (state === "discipline-selection") return "Choose Your Discipline";
      if (state === "specialization-selection")
        return "Select Your Specialization";
      if (state === "case-selection") return "Take New Case";
      return "Medical AI Diagnostician";
    });
    const headerTitle = computed(() => {
      const caseTitle = gameStore.case?.title;
      const locationName = gameStore.case?.location;
      if (caseTitle && locationName) {
        return `${caseTitle} @ ${locationName}`;
      }
      return caseTitle || "Medical AI Diagnostician";
    });
    const caseHookForTooltip = computed(() => gameStore.case?.hook || "");

    const hasActiveGoal = computed(() => !!gameStore.activeCaseGoal);

    const mainContentStyle = computed(() => {
      const location = gameStore.case?.location;
      if (!location) {
        return {};
      }
      const color = locationThemes[location.toLowerCase()];
      if (color) {
        return {
          backgroundColor: color,
        };
      }
      console.warn(
        `[App.js] No background color found for location: '${location}'`
      );
      return {};
    });

    const startNewGame = () => {
      gameStore.resetGame();
    };

    const findNewCase = () => {
      gameStore.prepareForNewCase();
    };

    const showCaseGoalPopover = (event) => {
      if (!gameStore.activeCaseGoal) return;
      uiStore.showInfoPopover({
        title: "Current Case Goal",
        description: gameStore.activeCaseGoal,
        target: event.currentTarget,
      });
    };

    const handleCreationHeaderClick = () => {
      const currentState = gameStore.gameState;
      if (currentState === "case-selection") {
        gameStore.resetCaseState();
        gameStore.setGameState("specialization-selection");
      } else if (currentState === "specialization-selection") {
        if (gameStore.session) {
          if (
            confirm(
              "Going back will end your current session and you will lose all progress. Are you sure?"
            )
          ) {
            gameStore.resetGame();
          }
        } else {
          creationStore.resetDisciplineSelection();
        }
      } else if (currentState === "discipline-selection") {
        creationStore.fetchDisciplines();
      }
    };

    const handleSettingsSave = (newSettings) => {
      gameStore.saveSettings(newSettings);
      uiStore.closeSettings();
      // Immediately execute the pending action after saving ---
      uiStore.executePendingAction();
    };

    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
    };

    onMounted(() => {
      gameStore.hydrateState();
    });

    // The eager 'watch' block that was here has been removed.

    return {
      uiStore,
      creationStore,
      gameStore,
      isSidebarCollapsed,
      creationHeaderTitle,
      headerTitle,
      toggleSidebar,
      startNewGame,
      handleSettingsSave,
      handleCreationHeaderClick,
      caseHookForTooltip,
      isBlockingLoad,
      isDebugMode,
      debugSituation,
      isLoading,
      isEndOfCase,
      findNewCase,
      resolutionMessage,
      mainContentStyle,
      hasActiveGoal,
      showCaseGoalPopover,
      resolutionStatus,
      turnCount,
      patientStability,
    };
  },

  template: `
    <div v-if="gameStore.isStateHydrated" id="app-container" :class="{ 'sidebar-is-collapsed': isSidebarCollapsed && gameStore.isGameActive }">
      <InfoPopover />
      <NotificationContainer />
      <ErrorMessage />
      <LoadingSpinner v-if="isBlockingLoad" />

      <div v-if="uiStore.isSettingsOpen" class="settings-overlay">
        <div class="settings-modal">
          <button @click="uiStore.closeSettings()" class="btn-close-modal" aria-label="Close Settings">×</button>
          <Settings @settings-saved="handleSettingsSave" />
        </div>
      </div>
      
      <transition name="fade" mode="out-in">
        
        <div v-if="['discipline-selection', 'specialization-selection', 'case-selection'].includes(gameStore.gameState)" class="creation-container" key="creation">
          <header 
            class="app-header creation-header"
            :class="{ 
              'is-clickable': ['specialization-selection', 'discipline-selection', 'case-selection'].includes(gameStore.gameState),
              'is-back-action': ['specialization-selection', 'case-selection'].includes(gameStore.gameState),
              'is-refresh-action': gameStore.gameState === 'discipline-selection'
            }"
            @click="handleCreationHeaderClick"
          >
            <h1>{{ creationHeaderTitle }}</h1>
            <button @click.stop="uiStore.openSettings()" class="btn" aria-label="Open Settings">⚙️</button>
          </header>
          <main class="creation-main">
            <div class="creation-sidebar">
              <SidebarDashboard :game-state="gameStore.gameState" />
            </div>
            <div class="creation-content" :style="mainContentStyle">
              <transition name="fade" mode="out-in">
                  <DisciplineSelection v-if="gameStore.gameState === 'discipline-selection'" key="discipline" />
                  <SpecializationSelection v-else-if="gameStore.gameState === 'specialization-selection'" key="specialization" />
                  <CaseSetup v-else-if="gameStore.gameState === 'case-selection'" key="case" />
              </transition>
            </div>
          </main>
        </div>
        
        <div v-else-if="['adventuring', 'case-complete', 'case-failed', 'game_over'].includes(gameStore.gameState)" class="game-container" key="game">
          
          <MobileStatusHud />

          <button @click="uiStore.toggleSidebar()" class="btn btn-icon mobile-menu-button" aria-label="Open Menu">
            ☰
          </button>

          <div v-if="uiStore.isSidebarOpen" class="sidebar-overlay" @click="uiStore.closeSidebar()"></div>

          <aside class="sidebar" :class="{ 'sidebar--collapsed': isSidebarCollapsed, 'sidebar-open': uiStore.isSidebarOpen }">
            <button @click="toggleSidebar" class="sidebar-toggle-btn" :aria-label="isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'">
              <span v-if="isSidebarCollapsed">»</span>
              <span v-else>«</span>
            </button>
            <div class="sidebar-content-wrapper">
              <SidebarDashboard :game-state="gameStore.gameState" />
            </div>
          </aside>
          <div class="main-content" :style="mainContentStyle">
            <header class="app-header">
              <div class="header-title-wrapper">
                <h1 
                  :title="caseHookForTooltip" 
                  @click="showCaseGoalPopover"
                  :class="{ 'is-clickable has-goal-indicator': hasActiveGoal }"
                >
                  {{ headerTitle }}
                </h1>
                <div class="header-status-line">
                  <span v-if="turnCount > 0" class="turn-counter">Turn: {{ turnCount }}</span> |
                  <span v-if="patientStability !== null" class="patient-stability-counter" title="Patient Stability">
                  Patient ❤️ {{ patientStability }}%
                  </span>
                </div>
              </div>
              <div class="header-actions">

                <button @click="uiStore.openSettings()" class="btn">⚙️</button>
                <button @click="startNewGame" class="btn btn-danger" title="Restart Session">↻</button>
                
                <button 
                  v-if="gameStore.gameState === 'adventuring'" 
                  @click="gameStore.forceCompleteCase()" 
                  class="btn btn-warning" 
                  title="Force the current case to a conclusion"
                >
                  🏆 
                </button>

              </div>
            </header>
            
            <main class="app-main">
              
              <MedicalSimChatWindow />

              <div class="chat-controls-container">
                <CaseComplete
                  v-if="isEndOfCase"
                  :status="resolutionStatus"
                  :completion-message="resolutionMessage" 
                  @find-new-case="findNewCase"
                  @new-character="startNewGame"
                />
              </div>
              
              <ChatInput v-if="!isEndOfCase && gameStore.gameState === 'adventuring'" />
            </main>
          </div>
        </div>

        <div v-else class="loading-overlay" key="initializing">
            <LoadingSpinner />
            <p>Initializing Simulation...</p>
        </div>
      </transition>
    </div>
    <div v-else class="loading-overlay" key="hydrating">
        <LoadingSpinner />
        <p>Loading Session...</p>
    </div>
  `,
};

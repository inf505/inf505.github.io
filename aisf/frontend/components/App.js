// frontend/components/App.js

import { computed, onMounted, ref } from "vue";
import { useUiStore } from "/stores/useUiStore.js";
import { useCharacterCreationStore } from "/stores/useCharacterCreationStore.js";
import { useGameStore } from "/stores/useGameStore.js";
import { useConfigStore } from "/stores/useConfigStore.js";
import NotificationContainer from "/components/NotificationContainer.js";
import SidebarDashboard from "/components/SidebarDashboard.js";
import QuestSetup from "/components/QuestSetup.js";
import ChatWindow from "/components/ChatWindow.js";
import ClassSelection from "/components/ClassSelection.js";
import ArchetypeSelection from "/components/ArchetypeSelection.js";
import LoadingSpinner from "/components/LoadingSpinner.js";
import ErrorMessage from "/components/ErrorMessage.js";
import ChatInput from "/components/ChatInput.js";
import Settings from "/components/Settings.js";
import QuestComplete from "/components/QuestComplete.js";
import InfoPopover from "/components/InfoPopover.js";
import VendorModal from "/components/VendorModal.js";
import MobileStatusHud from "/components/MobileStatusHud.js";
import GameOver from "/components/GameOver.js";
import D20Roll from "/components/D20Roll.js";

export default {
  name: "App",
  components: {
    SidebarDashboard,
    QuestSetup,
    ChatWindow,
    ClassSelection,
    ArchetypeSelection,
    LoadingSpinner,
    ErrorMessage,
    ChatInput,
    Settings,
    NotificationContainer,
    QuestComplete,
    InfoPopover,
    VendorModal,
    MobileStatusHud,
    GameOver,
    D20Roll,
  },

  setup() {
    const uiStore = useUiStore();
    const creationStore = useCharacterCreationStore();
    const gameStore = useGameStore();
    const configStore = useConfigStore();

    const isSidebarCollapsed = ref(false);

    const BIOME_BACKGROUNDS = {
      "orbital station": "images/biomes/orbital-station.png",
      "derelict ship": "images/biomes/derelict-ship.png",
      "asteroid mine": "images/biomes/asteroid-mine.png",
      "urban sprawl": "images/biomes/urban-sprawl.png",
      "alien jungle": "images/biomes/alien-jungle.png",
      "barren moon": "images/biomes/barren-moon.png",
      wasteland: "images/biomes/wasteland.png",
    };

    const showSettingsOverlay = computed(() => uiStore.isSettingsModalOpen);
    const isLoading = computed(() => uiStore.loadingTask === "game-turn");
    const isDebugMode = computed(() => gameStore.isDebugMode);
    const isGameOver = computed(() => gameStore.isGameOver); // <-- 3. CREATE COMPUTED

    const suggestions = computed(
      () => gameStore.session?.state?.currentSuggestions || []
    );
    const isQuestComplete = computed(
      () => gameStore.gameState === "quest-complete"
    );
    const questCompletionMessage = computed(
      () => gameStore.formattedQuestCompletionMessage
    );
    const isBlockingLoad = computed(() => {
      const blockingTasks = [
        "initializing",
        "session-start",
        "archetype-load",
        "character-finalize",
      ];
      return blockingTasks.includes(uiStore.loadingTask);
    });
    const creationHeaderTitle = computed(() => {
      const state = gameStore.gameState;
      if (state === "class-selection") return "Choose Your Background";
      if (state === "archetype-selection") return "Select Your Archetype";
      if (state === "quest-selection") return "Choose Your Mission";
      return "AI Game Master";
    });
    const headerTitle = computed(
      () => gameStore.quest?.title || "AI Game Master"
    );
    const questHookForTooltip = computed(() => gameStore.quest?.hook || "");

    const showVendorModal = computed(() => gameStore.gameState === "shopping");

    const mainContentStyle = computed(() => {
      const locationType = gameStore.quest?.locationType;
      if (!locationType) {
        return {};
      }
      const imageUrl = BIOME_BACKGROUNDS[locationType.toLowerCase()];
      if (imageUrl) {
        return {
          backgroundImage: `url(${imageUrl})`,
        };
      }
      console.warn(
        `[App.js] No background image found for locationType: '${locationType}'`
      );
      return {};
    });

    const useSuggestion = (suggestionText) => {
      if (!gameStore.isPlayerTurn || isQuestComplete.value) return;
      gameStore.runGameTurn(suggestionText);
    };

    const startNewGame = () => {
      gameStore.resetGame();
    };

    const findNewQuest = () => {
      gameStore.prepareForNewQuest();
    };

    const handleCreationHeaderClick = () => {
      const currentState = gameStore.gameState;
      if (currentState === "quest-selection") {
        gameStore.resetQuestState();
        gameStore.setGameState("archetype-selection");
      } else if (currentState === "archetype-selection") {
        if (gameStore.session) {
          if (
            confirm(
              "Going back will end your current adventure and you will lose all progress. Are you sure?"
            )
          ) {
            gameStore.resetGame();
          }
        } else {
          creationStore.resetClassSelection();
        }
      } else if (currentState === "class-selection") {
        creationStore.fetchClasses();
      }
    };

    const openSettings = () => uiStore.openSettingsModal();
    const closeSettings = () => uiStore.closeSettingsModal();

    const handleSettingsSave = () => {
      closeSettings();
    };

    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
    };

    const showQuestGoal = (event) => {
      if (!gameStore.activeQuestGoal) return;
      uiStore.showInfoPopover({
        title: gameStore.quest.title,
        description: gameStore.activeQuestGoal,
        target: event.currentTarget,
      });
    };

    onMounted(async () => {
      await gameStore.hydrateState();

      if (!configStore.hasApiKey) {
        openSettings();
      }
    });

    return {
      uiStore,
      creationStore,
      gameStore,
      configStore,
      isSidebarCollapsed,
      showSettingsOverlay,
      creationHeaderTitle,
      headerTitle,
      toggleSidebar,
      startNewGame,
      openSettings,
      closeSettings,
      handleSettingsSave,
      handleCreationHeaderClick,
      questHookForTooltip,
      isBlockingLoad,
      isDebugMode,
      suggestions,
      isLoading,
      useSuggestion,
      isQuestComplete,
      findNewQuest,
      questCompletionMessage,
      mainContentStyle,
      showVendorModal,
      showQuestGoal,
      isGameOver,
      pendingRollResult: computed(() => gameStore.pendingRollResult),
    };
  },

  template: `
  <div v-if="gameStore.isStateHydrated" id="app-container" :class="{ 'sidebar-is-collapsed': isSidebarCollapsed && ['adventuring', 'quest-complete', 'shopping'].includes(gameStore.gameState) }">
    <InfoPopover />
    <NotificationContainer />
    <ErrorMessage />
    <LoadingSpinner v-if="isBlockingLoad" />

    <div v-if="showSettingsOverlay" class="settings-overlay">
      <div class="settings-modal">
        <button @click="closeSettings()" class="btn-close-modal" aria-label="Close Settings">×</button>
        <Settings @settings-saved="handleSettingsSave" />
      </div>
    </div>
    
    <VendorModal v-if="showVendorModal" />

    <transition name="fade" mode="out-in">
      
      <!-- 5. ADD TEMPLATE LOGIC -->
      <GameOver v-if="isGameOver" key="game-over" />

      <div v-else-if="['class-selection', 'archetype-selection', 'quest-selection'].includes(gameStore.gameState)" class="creation-container" key="creation">
        <header 
          class="app-header creation-header"
          :class="{ 
            'is-clickable': ['archetype-selection', 'class-selection', 'quest-selection'].includes(gameStore.gameState),
            'is-back-action': ['archetype-selection', 'quest-selection'].includes(gameStore.gameState),
            'is-refresh-action': gameStore.gameState === 'class-selection'
          }"
          @click="handleCreationHeaderClick"
        >
          <h1>{{ creationHeaderTitle }}</h1>
          <button @click.stop="openSettings()" class="btn" aria-label="Open Settings">⚙️</button>
        </header>
        <main class="creation-main">
          <div class="creation-sidebar">
            <SidebarDashboard :game-state="gameStore.gameState" />
          </div>
          <div class="creation-content" :style="mainContentStyle">
            <transition name="fade" mode="out-in">
                <ClassSelection v-if="gameStore.gameState === 'class-selection'" key="class" />
                <ArchetypeSelection v-else-if="gameStore.gameState === 'archetype-selection'" key="archetype" />
                <QuestSetup v-else-if="gameStore.gameState === 'quest-selection'" key="quest" />
            </transition>
          </div>
        </main>
      </div>
      
      <div v-else-if="['adventuring', 'quest-complete', 'shopping'].includes(gameStore.gameState)" class="game-container" key="game">
        
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
            <h1 @click="showQuestGoal" class="is-clickable-quest-title" :title="questHookForTooltip">{{ headerTitle }}</h1>
            <div class="header-actions">

              <button @click="openSettings()" class="btn">⚙️</button>
              <button @click="startNewGame" class="btn btn-danger" title="Restart">↻</button>
              
              <button 
                v-if="isDebugMode && gameStore.gameState === 'adventuring'" 
                @click="gameStore.debug_forceGoalAchievement()" 
                class="btn btn-warning" 
                title="DEBUG: Achieve Goal & Complete Quest"
              >
                🏆 
              </button>

            </div>
          </header>
          
          <main class="app-main">
            <!-- If the quest is complete, show ONLY the journal/completion component -->
            <template v-if="isQuestComplete">
              <QuestComplete />
            </template>
            
            <!-- Otherwise, show the active gameplay interface -->
            <template v-else>
              <ChatWindow />

              <!-- NEW: Turn Resolution Area -->
              <div v-if="isLoading && pendingRollResult" class="turn-resolution-area">
                <D20Roll 
                  :result="pendingRollResult" 
                  :is-current-roll="true"
                  :animate="true" 
                />
              </div>

              <div class="chat-controls-container">
                <div v-if="suggestions.length > 0 && gameStore.isPlayerTurn && gameStore.gameState === 'adventuring'" class="suggestion-chips-in-chat">
                  <button v-for="suggestion in suggestions" :key="suggestion" @click="useSuggestion(suggestion)">
                    {{ suggestion }}
                  </button>
                </div>
              </div>
              
              <ChatInput v-if="gameStore.gameState === 'adventuring'" />
            </template>
          </main>
        </div>
      </div>

      <div v-else class="loading-overlay" key="initializing">
          <LoadingSpinner />
          <p>Initializing Game...</p>
      </div>
    </transition>
  </div>
  <div v-else class="loading-overlay" key="hydrating">
      <LoadingSpinner />
      <p>Loading Session...</p>
  </div>
  `,
};

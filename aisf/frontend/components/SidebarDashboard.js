// frontend/components/SidebarDashboard.js
import { ref, computed } from "vue";
import { useGameStore } from "../stores/useGameStore.js";
import { useUiStore } from "../stores/useUiStore.js";
import { useCharacterCreationStore } from "../stores/useCharacterCreationStore.js";

export default {
  name: "SidebarDashboard",
  props: {
    gameState: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const gameStore = useGameStore();
    const uiStore = useUiStore();
    const creationStore = useCharacterCreationStore();
    const activeTab = ref("character");
    const isStatsCollapsed = ref(true);

    const character = computed(() => {
      if (gameStore.isGameActive) {
        return gameStore.character;
      }
      return creationStore.finalizedCharacter;
    });

    const hasCharacter = computed(() => !!character.value);
    const ship = computed(() => character.value?.ship);
    const hasShip = computed(() => !!ship.value && ship.value.name);

    const hasStats = computed(
      () =>
        character.value?.stats && Object.keys(character.value.stats).length > 0
    );
    const hasInventory = computed(
      () => character.value?.inventory && character.value.inventory.length > 0
    );

    const isDuringGameplay = computed(() => {
      return ["adventuring", "shopping", "quest-complete"].includes(
        props.gameState
      );
    });

    const characterSheetStyle = computed(() => {
      if (!character.value?.class) return {};
      const imageUrl = `./images/${character.value.class.toLowerCase()}.png`;
      return { "--bg-image-url": `url('${imageUrl}')` };
    });

    const getHealthPercentage = computed(() => {
      if (
        !character.value ||
        typeof character.value.health !== "number" ||
        gameStore.maxHealth === 0
      ) {
        return 0;
      }
      return (character.value.health / gameStore.maxHealth) * 100;
    });

    const healthBarStyle = computed(() => {
      const percentage = getHealthPercentage.value;
      return {
        width: `${Math.max(0, percentage)}%`,
      };
    });

    const healthStateClass = computed(() => {
      const percentage = getHealthPercentage.value;
      if (percentage > 60) {
        return "health-state--high";
      }
      if (percentage > 30) {
        return "health-state--medium";
      }
      return "health-state--low";
    });

    const healthDisplayText = computed(() => {
      if (!character.value) return "0 / 0";
      return `${character.value.health} / ${gameStore.maxHealth}`;
    });

    const debugHealthModel = computed({
      get() {
        return character.value?.health || 0;
      },
      set(newValue) {
        if (gameStore.isDebugMode) {
          gameStore.debug_setHealth(newValue);
        }
      },
    });

    const getEnergyPercentage = computed(() => {
      if (
        !character.value ||
        typeof character.value.energy !== "number" ||
        gameStore.maxEnergy === 0
      ) {
        return 0;
      }
      return (character.value.energy / gameStore.maxEnergy) * 100;
    });

    const energyBarStyle = computed(() => {
      const percentage = getEnergyPercentage.value;
      return {
        width: `${Math.max(0, percentage)}%`,
      };
    });

    const energyStateClass = computed(() => {
      const percentage = getEnergyPercentage.value;
      if (percentage > 60) {
        return "energy-state--high";
      }
      if (percentage > 30) {
        return "energy-state--medium";
      }
      return "energy-state--low";
    });

    const energyDisplayText = computed(() => {
      if (!character.value) return "0 / 0";
      return `${character.value.energy} / ${gameStore.maxEnergy}`;
    });

    const debugEnergyModel = computed({
      get() {
        return character.value?.energy || 0;
      },
      set(newValue) {
        if (gameStore.isDebugMode) {
          gameStore.debug_setEnergy(newValue);
        }
      },
    });

    const debugCurrencyModel = computed({
      get() {
        return character.value?.currency || 0;
      },
      set(newValue) {
        if (gameStore.isDebugMode) {
          gameStore.debug_setCurrency(newValue);
        }
      },
    });

    const formatStatName = (stat) =>
      stat ? stat.substring(0, 3).toUpperCase() : "";

    const entities = computed(() => gameStore.entities);

    const dossierEntities = computed(() => {
      return (
        entities.value?.filter(
          (entity) =>
            entity.entityType === "character" || entity.entityType === undefined
        ) || []
      );
    });

    const objectEntities = computed(() => {
      return (
        entities.value?.filter((entity) => entity.entityType === "object") || []
      );
    });

    const formatKnowledgeTooltip = (knowledgeArray) => {
      if (!knowledgeArray || knowledgeArray.length === 0)
        return "No special information known.";
      return knowledgeArray.map((fact) => `• ${fact}`).join("\n");
    };

    const getEntityCardClasses = (entity) => {
      const classes = [];
      if (entity.status) {
        classes.push(`npc-card--status-${entity.status.toLowerCase()}`);
      }
      return classes;
    };

    const handleItemClick = (item, event) => {
      uiStore.showInfoPopover({
        title: item.name,
        description: item.description,
        contextItem: item,
        target: event.currentTarget,
      });
    };

    const handleEntityClick = (entity, event) => {
      if (entity.status?.toLowerCase() === "dead") return;

      let description = `<p>${entity.description}</p>`;
      if (entity.knowledge && entity.knowledge.length > 0) {
        description += `<br><strong>Known Information:</strong><ul>`;
        entity.knowledge.forEach((fact) => {
          description += `<li>${fact}</li>`;
        });
        description += `</ul>`;
      }

      uiStore.showInfoPopover({
        title: entity.name,
        description: description,
        contextItem: null,
        target: event.currentTarget,
      });
    };

    const handleObjectClick = (object, event) => {
      uiStore.showInfoPopover({
        title: object.name,
        description: object.description,
        contextItem: null,
        target: event.currentTarget,
      });
    };

    const showClassInfo = (event) => {
      const classDesc = creationStore.selectedClass?.description;
      if (!classDesc) return;
      uiStore.showInfoPopover({
        title: character.value.class,
        description: classDesc,
        target: event.currentTarget,
      });
    };

    const showArchetypeInfo = (event) => {
      if (!character.value?.archetype || !character.value?.description) return;
      uiStore.showInfoPopover({
        title: character.value.archetype,
        description: character.value.description,
        target: event.currentTarget,
      });
    };

    const showTraitInfo = (event) => {
      if (!character.value?.trait) return;
      uiStore.showInfoPopover({
        title: "Character Trait",
        description: character.value.trait,
        target: event.currentTarget,
      });
    };

    const showShipInfo = (event) => {
      if (!ship.value?.description) return;
      uiStore.showInfoPopover({
        title: ship.value.name,
        description: ship.value.description,
        target: event.currentTarget,
      });
    };

    const worldState = computed(() => gameStore.worldState);
    const hasWorldState = computed(
      () => Object.keys(worldState.value).length > 0
    );

    const formatWorldStateKey = (key) => {
      if (!key) return "";
      return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
    };

    const handleWorldStateItemClick = (key, value, event) => {
      if (!key || !value) return;

      uiStore.showInfoPopover({
        title: formatWorldStateKey(key),
        description: value,
        target: event.currentTarget,
      });
    };

    return {
      activeTab,
      isStatsCollapsed,
      gameStore,
      uiStore,
      creationStore,
      character,
      hasCharacter,
      ship,
      hasShip,
      hasStats,
      hasInventory,
      characterSheetStyle,
      healthBarStyle,
      healthStateClass,
      healthDisplayText,
      debugHealthModel,
      getEnergyPercentage,
      energyBarStyle,
      energyStateClass,
      energyDisplayText,
      debugEnergyModel,
      debugCurrencyModel,
      formatStatName,
      entities,
      dossierEntities,
      objectEntities,
      getEntityCardClasses,
      handleItemClick,
      handleEntityClick,
      handleObjectClick,
      formatKnowledgeTooltip,
      isDuringGameplay,
      showClassInfo,
      showArchetypeInfo,
      showTraitInfo,
      showShipInfo,
      worldState,
      hasWorldState,
      formatWorldStateKey,
      handleWorldStateItemClick,
    };
  },
  template: `
    <div v-if="hasCharacter" class="character-sheet-content" :style="characterSheetStyle">
      
      <nav v-if="isDuringGameplay" class="sidebar-dashboard__nav">
        <button 
          @click="activeTab = 'character'" 
          :class="{ 'is-active': activeTab === 'character' }"
          title="Character"
        >
          🧑‍🚀
        </button>
        <button 
          @click="activeTab = 'entities'" 
          :class="{ 'is-active': activeTab === 'entities' }"
          title="Entities"
        >
          🎭 
        </button>
        <button 
          @click="activeTab = 'objects'" 
          :class="{ 'is-active': activeTab === 'objects' }"
          title="Objects"
        >
          📦
        </button>
        <button 
          @click="activeTab = 'world'" 
          :class="{ 'is-active': activeTab === 'world' }"
          title="World State"
        >
          🌐 
        </button>
      </nav>

      <div v-if="activeTab === 'character' || !isDuringGameplay" class="sidebar-dashboard__content">
        <div class="form-group">
          <label>Name</label>
          <div 
            class="static-value is-clickable-info"
            @click="showTraitInfo"
          >
            {{ character.generatedName || '...' }}
          </div>
        </div>

        <div class="form-group">
          <label>Background</label>
          <div class="static-value">
            <span @click="showClassInfo" class="is-clickable-info">{{ character.class || 'N/A' }}</span>
          </div>
        </div>

        <div class="form-group">
          <label>Archetype</label>
          <div class="static-value">
            <span v-if="character.archetype" class="archetype-name is-clickable-info" @click="showArchetypeInfo">
              {{ character.archetype }}
            </span>
            <span v-else>N/A</span>
          </div>
        </div>

        <div v-if="hasShip" class="form-group">
          <label>Ship ({{ ship.class }})</label>
          <div 
            class="static-value is-clickable-info"
            :title="ship.description"
            @click="showShipInfo"
          >
            {{ ship.name }}
          </div>
        </div>

        <template v-if="!isDuringGameplay">
            <div v-if="character.description && character.archetype" class="form-group">
                <label>Archetype Dossier</label>
                <p class="character-description">{{ character.description }}</p>
            </div>
             <div v-else-if="creationStore.selectedClass" class="form-group">
                <label>Background Briefing</label>
                <p class="character-description">{{ creationStore.selectedClass.description }}</p>
            </div>

            <div v-if="character.trait" class="form-group">
                <label>Trait</label>
                <p class="character-description">{{ character.trait }}</p>
            </div>
        </template>
        
        <div v-if="isDuringGameplay" class="resource-bars-group">

          <div class="resource-section health-section" :class="healthStateClass">
            <div class="resource-display-wrapper">
              <div v-if="!gameStore.isDebugMode" class="resource-bar-container">
                <div class="resource-bar-fill" :style="healthBarStyle"></div>
                <div class="resource-text-content">
                  <span class="resource-bar-label">Health</span>
                  <span class="resource-bar-values">{{ healthDisplayText }}</span>
                </div>
              </div>
              
              <input 
                v-if="gameStore.isDebugMode"
                type="number"
                v-model.number="debugHealthModel"
                class="debug-resource-input"
                :class="healthStateClass"
                :min="0"
                :max="gameStore.maxHealth"
                placeholder="Health"
                title="DEBUG: Set Character Health"
              />
            </div>
          </div>

          <div class="resource-section energy-section" :class="energyStateClass">
            <div class="resource-display-wrapper">
              <div v-if="!gameStore.isDebugMode" class="resource-bar-container">
                <div class="resource-bar-fill" :style="energyBarStyle"></div>
                 <div class="resource-text-content">
                  <span class="resource-bar-label">Energy</span>
                  <span class="resource-bar-values">{{ energyDisplayText }}</span>
                </div>
              </div>
              
              <input 
                v-if="gameStore.isDebugMode"
                type="number"
                v-model.number="debugEnergyModel"
                class="debug-resource-input"
                :class="energyStateClass"
                :min="0"
                :max="gameStore.maxEnergy"
                placeholder="Energy"
                title="DEBUG: Set Character Energy"
              />
            </div>
          </div>
        </div>

        <div v-if="hasStats" class="form-group">
          <label 
            @click="isStatsCollapsed = !isStatsCollapsed" 
            class="is-clickable-info stats-label"
            :class="{ 'is-collapsed': isStatsCollapsed }"
          >
            Core Stats
          </label>
          <div v-if="!isStatsCollapsed" class="stats-grid">
            <div v-for="(value, stat) in character.stats" :key="stat" class="stat-item">
              <span class="stat-name">{{ formatStatName(stat) }}</span>
              <span class="stat-value">{{ value }}</span>
            </div>
          </div>
        </div>

        <div v-if="isDuringGameplay && typeof character.currency === 'number'" class="form-group">
          <label>Credits</label>
          <div v-if="!gameStore.isDebugMode" class="static-value currency-display">
            <span class="currency-icon">¤</span>
            <span>{{ character.currency.toLocaleString() }}</span>
          </div>
          <input
            v-if="gameStore.isDebugMode"
            type="number"
            v-model.number="debugCurrencyModel"
            class="debug-resource-input"
            min="0"
            placeholder="Credits"
            title="DEBUG: Set Credits"
          />
        </div>

        <div v-if="hasInventory" class="form-group inventory-wrapper">
          <label>Inventory</label>
          <div class="inventory-list scrollable-list">
            <button 
              v-for="(item, index) in character.inventory" 
              :key="item.name + index" 
              @click="handleItemClick(item, $event)" 
              class="inventory-item-btn" 
              :class="{ 'is-new': item.isNew, 'is-reward': item.isReward, 'is-signature': item.isSignature, 'is-quest-item': item.isQuestItem }"
              :title="item.description"
            >
              <span v-if="item.isReward" class="item-reward-icon">★</span>
              <span v-else-if="item.isSignature" class="item-signature-icon">◆</span>
              <span v-else-if="item.isQuestItem" class="item-quest-icon">!</span>
              {{ item.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Entities Tab -->
      <div v-if="activeTab === 'entities' && isDuringGameplay" class="sidebar-dashboard__content">
        <div class="dramatis-personae-panel">
          <template v-if="dossierEntities.length > 0">
            <article 
              v-for="(entity, index) in dossierEntities" 
              :key="entity.name + index" 
              class="npc-card"
              :class="getEntityCardClasses(entity)"
              @click="handleEntityClick(entity, $event)"
              :title="formatKnowledgeTooltip(entity.knowledge)"
            >
              <div class="npc-card__header">
                <span class="npc-card__name">{{ entity.name }}</span>
                <span class="npc-card__disposition" :class="'npc-card__disposition--' + (entity.disposition || 'neutral').toLowerCase()">
                  {{ entity.disposition || 'Neutral' }}
                </span>
              </div>
              <p class="npc-card__description">{{ entity.description }}</p>
              <div v-if="entity.status && entity.status.toLowerCase() !== 'active'" class="npc-card__status-indicator">
                Status: {{ entity.status }}
              </div>
            </article>
          </template>
          <div v-else>
            <p class="help-text-small">No contacts of note have been made.</p>
          </div>
        </div>
      </div>

      <!-- Objects Tab -->
      <div v-if="activeTab === 'objects' && isDuringGameplay" class="sidebar-dashboard__content">
        <div class="objects-panel">
          <template v-if="objectEntities.length > 0">
            <article 
              v-for="(object, index) in objectEntities" 
              :key="object.entityId || object.name + index" 
              class="object-card is-clickable-info"
              @click="handleObjectClick(object, $event)"
              :title="object.description"
            >
              <span class="object-card__name">{{ object.name }}</span>
              <p class="object-card__description">{{ object.description }}</p>
            </article>
          </template>
          <div v-else>
            <p class="help-text-small">No notable objects have been discovered.</p>
          </div>
        </div>
      </div>

      <!-- World State Tab -->
      <div v-if="activeTab === 'world' && isDuringGameplay" class="sidebar-dashboard__content">
        <div class="world-state-panel">
          <label>Intel</label>
          <template v-if="hasWorldState">
            <div class="world-state-list">
              <div 
                v-for="(value, key) in worldState" 
                :key="key" 
                class="world-state-item is-clickable-info"
                :title="value"
                @click="handleWorldStateItemClick(key, value, $event)"
              >
                {{ formatWorldStateKey(key) }}
              </div>
            </div>
          </template>
          <div v-else>
            <p class="help-text-small">No significant intel has been recorded yet.</p>
          </div>
        </div>
      </div>

    </div>
    <div v-else class="character-sheet-content sidebar-placeholder">
      <h3>Awaiting Operative Profile</h3>
      <p class="help-text">Begin by selecting a background from the options on the right to establish your operative's profile.</p>
    </div>
  `,
};

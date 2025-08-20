// frontend/components/SidebarDashboard.js
import { ref, computed } from "vue";
import { useGameStore } from "../stores/useGameStore.js";
import { useCharacterCreationStore } from "../stores/useCharacterCreationStore.js";
import { useUiStore } from "../stores/useUiStore.js";

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
    const activeTab = ref("character"); // 'character' or 'entities'
    const showCoreAttributes = ref(false);

    const character = computed(() => gameStore.character);

    const displayName = computed(() => {
      // If the user has typed a name during creation, show that for immediate feedback.
      if (
        creationStore.characterName &&
        creationStore.characterName.trim() !== ""
      ) {
        return creationStore.characterName.trim();
      }
      // Otherwise, fall back to the name on the character object.
      return character.value?.name || "...";
    });

    const hasCharacter = computed(() => !!character.value);
    const hasStats = computed(
      () =>
        character.value?.stats && Object.keys(character.value.stats).length > 0
    );
    const hasInventory = computed(
      () => character.value?.inventory && character.value.inventory.length > 0
    );

    const isDuringGameplay = computed(() => {
      return [
        "adventuring",
        "shopping",
        "case-complete",
        "case-selection",
      ].includes(props.gameState);
    });

    const characterSheetStyle = computed(() => {
      if (!character.value?.discipline) return {};
      const disciplineData =
        useCharacterCreationStore().disciplines.find(
          (d) => d.name === character.value.discipline
        ) || {};
      const imageUrl = `./images/${disciplineData.image}`;
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

    const debugReputationModel = computed({
      get() {
        return character.value?.currency || 0;
      },
      set(newValue) {
        if (gameStore.isDebugMode) {
          gameStore.debug_setReputation(newValue);
        }
      },
    });

    const formatStatName = (stat) => {
      const statDefinition = gameStore.stats.find((s) => s.name === stat);
      return statDefinition ? statDefinition.abbr : "N/A";
    };

    const getStatTooltip = (statName) => {
      const statDefinition = gameStore.stats.find((s) => s.name === statName);
      if (statDefinition) {
        return `${statDefinition.name}: ${statDefinition.description}`;
      }
      return "Stat details unavailable.";
    };

    const entities = computed(() => gameStore.entities);

    const formatKnowledgeTooltip = (knowledgeArray) => {
      if (!knowledgeArray || knowledgeArray.length === 0)
        return "No special information known.";
      return knowledgeArray.map((fact) => `• ${fact}`).join("\n");
    };

    const getEntityCardClasses = (entity) => {
      const classes = [];
      if (entity.status) {
        classes.push(`entity-card--status-${entity.status.toLowerCase()}`);
      }
      return classes;
    };

    const handleItemClick = (item, event) => {
      const descriptionFromEntries = item.entries
        ? item.entries.map((e) => e.text).join("<br>")
        : item.description || "No details available.";

      uiStore.showInfoPopover({
        title: item.name,
        description: descriptionFromEntries,
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

    const handleStatClick = (statName, event) => {
      const statDefinition = gameStore.stats.find((s) => s.name === statName);
      if (statDefinition) {
        uiStore.showInfoPopover({
          title: statDefinition.name,
          description: statDefinition.description,
          contextItem: null,
          target: event.currentTarget,
        });
      } else {
        console.warn(
          `[SidebarDashboard] Stat definition not found for: ${statName}`
        );
      }
    };

    const handleNameClick = (event) => {
      if (!isDuringGameplay.value || !character.value?.trait) return;
      uiStore.showInfoPopover({
        title: displayName.value,
        description: character.value.trait,
        contextItem: null,
        target: event.currentTarget,
      });
    };

    const handleSpecializationClick = (event) => {
      if (!isDuringGameplay.value || !character.value?.description) return;
      uiStore.showInfoPopover({
        title: character.value.discipline,
        description: character.value.description,
        contextItem: null,
        target: event.currentTarget,
      });
    };

    return {
      activeTab,
      showCoreAttributes,
      gameStore,
      uiStore,
      character,
      displayName,
      hasCharacter,
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
      debugReputationModel,
      formatStatName,
      entities,
      getEntityCardClasses,
      handleItemClick,
      handleEntityClick,
      handleStatClick,
      formatKnowledgeTooltip,
      isDuringGameplay,
      handleNameClick,
      handleSpecializationClick,
      getStatTooltip,
    };
  },
  template: `
    <div v-if="hasCharacter" class="character-sheet-content" :style="characterSheetStyle">
      
      <nav v-if="isDuringGameplay && ['adventuring', 'shopping', 'case-complete'].includes(gameState)" class="sidebar-dashboard__nav">
        <button 
          @click="activeTab = 'character'" 
          :class="{ 'is-active': activeTab === 'character' }"
        >
          Doctor
        </button>
        <button 
          @click="activeTab = 'entities'" 
          :class="{ 'is-active': activeTab === 'entities' }"
        >
          Case File
        </button>
      </nav>

      <div v-if="activeTab === 'character' || !isDuringGameplay" class="sidebar-dashboard__content">
        <div class="form-group">
          <label>Name</label>
          <div 
            class="static-value"
            :class="{ 'is-clickable': isDuringGameplay && character.trait }"
            :title="isDuringGameplay ? character.trait : ''"
            @click="handleNameClick($event)"
          >
            {{ displayName }}
          </div>
        </div>

        <div class="form-group">
          <label>
            {{ character.discipline || 'N/A' }} 
          </label>
          <div 
            class="static-value" 
            :class="{ 'is-clickable': isDuringGameplay && character.description }"
            :title="isDuringGameplay ? character.description : ''"
            @click="handleSpecializationClick($event)"
          >
            <span v-if="character.specialization" class="specialization-name">
              {{ character.specialization }}
            </span>
            <span v-else>No Specialization Selected</span>
          </div>
        </div>
        
        <template v-if="!isDuringGameplay">
            <div v-if="character.description" class="form-group">
                <label>
                    {{ character.specialization ? 'Specialization Description' : 'Discipline Description' }}
                </label>
                <p class="character-description">{{ character.description }}</p>
            </div>

            <div v-if="character.trait" class="form-group">
                <label>Trait</label>
                <p class="character-description">{{ character.trait }}</p>
            </div>
        </template>
        
        <div v-if="isDuringGameplay" class="resource-bars-group">
          <!-- Composure Bar -->
          <div class="resource-section health-section" :class="healthStateClass">
            <div class="resource-display-wrapper">
              <div v-if="!gameStore.isDebugMode" class="resource-bar-container">
                <div class="resource-bar-fill" :style="healthBarStyle"></div>
                <div class="resource-text-content">
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
                placeholder="Composure"
                title="DEBUG: Set Character Composure"
              />
            </div>
          </div>

          <!-- Stamina Bar -->
          <div class="resource-section energy-section" :class="energyStateClass">
            <div class="resource-display-wrapper">
              <div v-if="!gameStore.isDebugMode" class="resource-bar-container">
                <div class="resource-bar-fill" :style="energyBarStyle"></div>
                 <div class="resource-text-content">
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
                placeholder="Stamina"
                title="DEBUG: Set Character Stamina"
              />
            </div>
          </div>
        </div>

        <div v-if="hasStats" class="form-group">
          <label @click="showCoreAttributes = !showCoreAttributes" class="is-clickable" title="Click to toggle attribute visibility">Core Attributes</label>
          <div v-show="showCoreAttributes" class="stats-grid">
            <div v-for="(value, stat) in character.stats" :key="stat" class="stat-item is-clickable" :title="getStatTooltip(stat)" @click="handleStatClick(stat, $event)">
              <span class="stat-name">{{ formatStatName(stat) }}</span>
              <span class="stat-value">{{ value }}</span>
            </div>
          </div>
        </div>

        <div v-if="isDuringGameplay && typeof character.currency === 'number'" class="form-group">
          <label>Reputation</label>
          <div class="static-value currency-display">
            <span class="currency-icon">⭐</span>
            
            <input 
              v-if="gameStore.isDebugMode"
              type="number"
              v-model.number="debugReputationModel"
              class="debug-resource-input"
              :min="0"
              placeholder="Reputation"
              title="DEBUG: Set Character Reputation"
            />
            <span v-else>{{ character.currency.toLocaleString() }}</span>

            <span class="sub-value">({{ gameStore.displayTier  }})</span>
          </div>
        </div>

        <div v-if="hasInventory" class="form-group inventory-wrapper">
          <label>Inventory</label>
          <div class="inventory-list scrollable-list">
            <button 
              v-for="(item, index) in character.inventory" 
              :key="item.name + index" 
              @click="handleItemClick(item, $event)" 
              class="inventory-item-btn" 
              :class="{ 'is-new': item.isNew, 'is-reward': item.isReward, 'is-signature': item.isSignature, 'is-case-item': item.isCaseItem,
                'is-used': item.isUsed }"
            >
              <span v-if="item.isReward" class="item-reward-icon">🏆</span>
              <span v-else-if="item.isSignature" class="item-signature-icon">📖</span>
              <span v-else-if="item.isCaseItem" class="item-case-icon">📋</span>
              {{ item.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Case File Tab -->
      <div v-if="activeTab === 'entities' && isDuringGameplay" class="sidebar-dashboard__content">
        <div class="dramatis-personae-panel">
          <template v-if="entities.length > 0">
            <article 
              v-for="(entity, index) in entities" 
              :key="entity.name + index" 
              class="entity-card"
              :class="getEntityCardClasses(entity)"
              @click="handleEntityClick(entity, $event)"
              :title="formatKnowledgeTooltip(entity.knowledge)"
            >
              <div class="entity-card__header">
                <span class="entity-card__name">{{ entity.name }}</span>
                <span v-if="entity.disposition" class="entity-card__disposition" :class="'entity-card__disposition--' + entity.disposition.toLowerCase()">
                  {{ entity.disposition }}
                </span>
              </div>
              <p class="entity-card__description">{{ entity.description }}</p>
              <div v-if="entity.status && entity.status.toLowerCase() !== 'active'" class="entity-card__status-indicator">
                Status: {{ entity.status }}
              </div>
            </article>
          </template>
          <div v-else>
            <p class="help-text-small">No significant findings or persons of interest have been noted yet.</p>
          </div>
        </div>
      </div>

    </div>
    <div v-else class="character-sheet-content sidebar-placeholder">
      <h3>Medical AI Diagnostician</h3>
      <p class="help-text">Your first step is to select a discipline from the options shown, and begin your career.</p>
    </div>
  `,
};

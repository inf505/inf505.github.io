// frontend/components/ArchetypeSelection.js

import { computed } from "vue";
import { useCharacterCreationStore } from "/stores/useCharacterCreationStore.js";
import { useUiStore } from "/stores/useUiStore.js";

export default {
  name: "ArchetypeSelection",
  setup() {
    const creationStore = useCharacterCreationStore();
    const uiStore = useUiStore();

    const handleSelectArchetype = async (archetype) => {
      await creationStore.selectArchetype(archetype);
      await creationStore.finalizeCharacter();
    };

    const getSignatureItem = (items) => {
      if (!items || !Array.isArray(items)) return null;
      return items.find((item) => item.isSignature === true);
    };

    const showItemInfo = (item, event) => {
      event.stopPropagation();
      if (!item) return;
      uiStore.showInfoPopover({
        title: item.name,
        description: item.description,
        target: event.currentTarget,
      });
    };

    return {
      creationStore,
      handleSelectArchetype,
      getSignatureItem,
      showItemInfo,
    };
  },

  template: `
    <div class="archetype-selection">
      <h2>Select Your Archetype</h2>
      
      <!-- REMOVED name input container -->

      <p class="help-text">
        Your archetype defines your starting stats, trait, and specialized equipment. This choice solidifies your character's identity and capabilities.
      </p>
      
      <div v-if="creationStore.archetypes && creationStore.archetypes.length > 0" class="archetype-selection__list">
        <div v-for="archetype in creationStore.archetypes" :key="archetype.archetype" class="archetype-selection__card">
          <div class="archetype-card__header">
            <h3 class="archetype-card__title">{{ archetype.archetype }}</h3>
            <button @click="handleSelectArchetype(archetype)" class="btn btn-primary">Select Path</button>
          </div>
          <p class="archetype-card__description">{{ archetype.description }}</p>
          
          <div v-if="archetype.narrative_style" class="info-box">
            <h4 class="info-box__label">Narrative Style</h4>
            <p class="info-box__content">{{ archetype.narrative_style }}</p>
          </div>

          <div v-if="getSignatureItem(archetype.items)" class="info-box">
            <h4 class="info-box__label">Weapon</h4>
            <p class="info-box__content is-clickable-info" @click="showItemInfo(getSignatureItem(archetype.items), $event)">
              {{ getSignatureItem(archetype.items).name }}
            </p>
          </div>

        </div>
      </div>

      <div v-else>
         <p class="help-text">No archetypes are available for the {{ creationStore.selectedClass?.name || 'selected' }} class. Please check the backend data.</p>
      </div>
    </div>
  `,
};

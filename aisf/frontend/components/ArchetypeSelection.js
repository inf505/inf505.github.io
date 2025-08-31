// frontend/components/ArchetypeSelection.js

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
      showItemInfo,
    };
  },

  template: `
    <div class="archetype-selection">
      <h2>Select Your Archetype</h2>
      
      <p class="help-text">
        Your archetype defines your starting stats, trait, and specialized equipment. This choice solidifies your character's identity and capabilities.
      </p>
      
      <div v-if="creationStore.archetypes && creationStore.archetypes.length > 0" class="archetype-selection__list">
        <div v-for="archetype in creationStore.archetypes" :key="archetype.archetype" class="archetype-selection__card">
          <div class="archetype-card__header">
            <h3 class="archetype-card__title">{{ archetype.archetype }}</h3>
            <button @click="handleSelectArchetype(archetype)" class="btn btn-primary">Confirm Archetype</button>
          </div>
          <p class="archetype-card__description">{{ archetype.description }}</p>
          
          <div v-if="archetype.narrative_style" class="info-box">
            <h4 class="info-box__label">Narrative Style</h4>
            <p class="info-box__content">{{ archetype.narrative_style }}</p>
          </div>

          <div v-if="archetype.items && archetype.items.length > 0" class="info-box">
            <h4 class="info-box__label">Signature Equipment</h4>
            <div class="archetype-card__items-list">
              <p v-for="item in archetype.items" :key="item.name" class="info-box__content is-clickable-info" @click="showItemInfo(item, $event)">
                {{ item.name }}
              </p>
            </div>
          </div>

        </div>
      </div>

      <div v-else>
         <p class="help-text">No archetypes are available for the {{ creationStore.selectedClass?.class || 'selected' }} background. Please check the backend data.</p>
      </div>
    </div>
  `,
};

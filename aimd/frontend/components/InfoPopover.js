// frontend/components/InfoPopover.js
import { ref, computed, watch, nextTick } from "vue";
import { useUiStore } from "../stores/useUiStore.js";
import { useGameStore } from "../stores/useGameStore.js";

export default {
  name: "InfoPopover",
  setup() {
    const uiStore = useUiStore();
    const gameStore = useGameStore(); // Correctly defined here...

    const popoverRef = ref(null);

    const isVisible = computed(() => uiStore.popover.isVisible);
    const title = computed(() => uiStore.popover.title);
    const description = computed(() => uiStore.popover.description);
    const contextItem = computed(() => uiStore.popover.contextItem);
    const targetElement = computed(() => uiStore.popover.target);

    const popoverStyle = ref({});

    const displayEntries = computed(() => {
      if (
        contextItem.value?.entries &&
        Array.isArray(contextItem.value.entries)
      ) {
        return [...contextItem.value.entries].reverse();
      }
      if (description.value) {
        return [{ text: description.value, turnAdded: null }];
      }
      return [];
    });

    const isUsable = computed(() => {
      if (!contextItem.value) return false;
      const item = contextItem.value;

      if (item.isSignature === true) return true;
      if (item.isCaseItem && !item.isUsed) return true;
      if (item.isReward && item.isUsable === true) return true;

      return false;
    });

    const updatePosition = () => {
      if (!targetElement.value || !popoverRef.value) {
        popoverStyle.value = { visibility: "hidden" };
        return;
      }

      const targetRect = targetElement.value.getBoundingClientRect();
      const popoverRect = popoverRef.value.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = targetRect.bottom + 8;
      let left = targetRect.left;

      if (top + popoverRect.height > viewportHeight) {
        top = targetRect.top - popoverRect.height - 8;
      }

      if (left + popoverRect.width > viewportWidth) {
        left = targetRect.right - popoverRect.width;
      }

      if (left < 0) {
        left = 8;
      }

      popoverStyle.value = {
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        visibility: "visible",
      };
    };

    const handleClickOutside = (event) => {
      if (
        popoverRef.value &&
        !popoverRef.value.contains(event.target) &&
        targetElement.value &&
        !targetElement.value.contains(event.target)
      ) {
        uiStore.hideInfoPopover();
      }
    };

    watch(isVisible, (newValue) => {
      if (newValue) {
        nextTick(() => {
          updatePosition();
          document.addEventListener("mousedown", handleClickOutside, true);
        });
      } else {
        document.removeEventListener("mousedown", handleClickOutside, true);
      }
    });

    watch([title, description], () => {
      if (isVisible.value) {
        nextTick(updatePosition);
      }
    });

    const handleUseItem = () => {
      if (contextItem.value) {
        gameStore.useItem(contextItem.value);
        uiStore.hideInfoPopover();
      }
    };

    return {
      popoverRef,
      isVisible,
      title,
      description,
      contextItem,
      popoverStyle,
      handleUseItem,
      displayEntries,
      isUsable,
      gameStore, // <-- THIS IS THE FIX. EXPOSE gameStore TO THE TEMPLATE.
    };
  },
  template: `
        <div 
            v-if="isVisible" 
            class="info-popover"
            ref="popoverRef" 
            :style="popoverStyle"
            @mousedown.stop
        >
            <h4 class="popover-title">{{ title }}</h4>

            <div class="popover-content">
                <div v-for="(entry, index) in displayEntries" :key="index" class="popover-entry">
                    <p class="popover-description" v-html="entry.text"></p>
                    <span v-if="entry.turnAdded > 0" class="popover-timestamp">
                        Noted on Turn {{ entry.turnAdded }}
                    </span>
                </div>
            </div>

            <div v-if="isUsable" class="popover-actions">
                <button 
                  class="btn btn-primary" 
                  @click="handleUseItem"
                >
                  Use
                </button>
            </div>


        </div>
    `,
};

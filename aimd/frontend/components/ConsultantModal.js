// frontend/components/ConsultantModal.js
import { computed } from "vue";
import { useGameStore } from "../stores/useGameStore.js";
import { useUiStore } from "../stores/useUiStore.js";

export default {
  name: "ConsultantModal",
  setup() {
    const gameStore = useGameStore();
    const uiStore = useUiStore();

    const isTransacting = computed(() => !gameStore.isPlayerTurn);

    const consultant = computed(() => gameStore.activeConsultant);
    const playerReputation = computed(() => gameStore.character?.currency ?? 0);

    const rarityColorClass = (rarity) => {
      switch (rarity) {
        case "Legendary":
          return "text-yellow-400 border-yellow-400/50";
        case "Rare":
          return "text-blue-400 border-blue-400/50";
        case "Uncommon":
          return "text-green-400 border-green-400/50";
        default:
          return "text-gray-300 border-gray-400/50";
      }
    };

    async function handleAcquisition(itemName, cost) {
      if (isTransacting.value || playerReputation.value < cost) return;
      gameStore.isPlayerTurn = false;
      uiStore.clearError();

      try {
        const response = await fetch("/api/consultants/transact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: gameStore.session.sessionId,
            action: "buy", // The only action is to acquire services/items
            itemName,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Transaction failed.");
        }

        gameStore.session.state = data.newState;
        uiStore.addNotification({
          message: `Acquired: ${itemName}`,
          type: "success",
        });
      } catch (error) {
        uiStore.setError(error.message);
      } finally {
        gameStore.isPlayerTurn = true;
      }
    }

    function endConsultation() {
      gameStore.exitShopping();
    }

    return {
      consultant,
      playerReputation,
      isTransacting,
      handleAcquisition,
      endConsultation,
      rarityColorClass,
    };
  },
  template: `
    <div class="consultant-modal">
      <div class="consultant-modal__content">
        <button 
          @click="endConsultation" 
          class="consultant-modal__close-btn" 
          aria-label="End Consultation"
          :disabled="isTransacting"
        >×</button>
        
        <div v-if="consultant" class="flex flex-col h-full">
          <header>
            <div class="flex justify-between items-start">
              <div>
                <h2>{{ consultant.name }}</h2>
                <p>{{ consultant.description }}</p>
              </div>
              <div class="currency-display p-2 rounded-lg">
                  <span class="currency-icon">⭐</span>
                  <span>{{ playerReputation }} Rep</span>
              </div>
            </div>
            <p class="consultant-dialogue">"{{ consultant.dialogue }}"</p>
          </header>

          <div class="consultant-modal__grid">
            <!-- Consultant Services/Items Panel -->
            <div class="consultant-panel">
                <h3 class="consultant-panel__title">Services & Equipment Offered</h3>
                <div class="consultant-panel__body">
                    <div v-if="!consultant.inventory || consultant.inventory.length === 0" class="text-gray-500 text-center p-8">This consultant has no further services to offer.</div>
                    <div v-else v-for="item in consultant.inventory" :key="item.name" class="consultant-item">
                        <div class="consultant-item__header">
                            <div class="consultant-item__info">
                                <h4 :class="rarityColorClass(item.rarity).split(' ')[0]">{{ item.name }}</h4>
                                <p>{{ item.type }} - {{ item.rarity }}</p>
                            </div>
                             <div class="consultant-item__action">
                                <button @click="handleAcquisition(item.name, item.cost)" :disabled="isTransacting || playerReputation < item.cost" class="btn btn-primary btn-sm">
                                    Acquire ({{ item.cost }} ⭐)
                                </button>
                             </div>
                        </div>
                        <p class="consultant-item__description">{{ item.description }}</p>
                    </div>
                </div>
            </div>
          </div>

          <footer>
            <button 
              @click="endConsultation" 
              class="btn btn-primary text-lg"
              :disabled="isTransacting"
            >
              End Consultation
            </button>
          </footer>
        </div>
        <div v-else class="text-white text-center flex items-center justify-center h-full">
            <p class="text-2xl">Loading Consultation...</p>
        </div>
      </div>
    </div>
  `,
};

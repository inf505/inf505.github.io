// frontend/components/VendorModal.js
import { computed } from "vue";
import { makeApiRequest } from "../utils/api.js";
import { useGameStore } from "../stores/useGameStore.js";
import { useUiStore } from "../stores/useUiStore.js";

export default {
  name: "VendorModal",
  setup() {
    const gameStore = useGameStore();
    const uiStore = useUiStore();

    const isTransacting = computed(() => !gameStore.isPlayerTurn);

    const merchant = computed(() => gameStore.activeMerchant);
    const playerCurrency = computed(() => gameStore.character?.currency ?? 0);
    const playerSellableItems = computed(() => {
      if (!gameStore.character?.inventory) return [];
      return gameStore.character.inventory.filter(
        (item) => item.isReward === true
      );
    });

    function getSellValue(item) {
      if (!item.rarity) return 1;
      let baseCost;
      switch (item.rarity) {
        case "Uncommon":
          baseCost = 50;
          break;
        case "Rare":
          baseCost = 250;
          break;
        case "Legendary":
          baseCost = 1000;
          break;
        case "Common":
        default:
          baseCost = 10;
          break;
      }
      return Math.max(1, Math.round(baseCost * 0.4));
    }

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

    async function handleTransaction(action, itemName) {
      if (isTransacting.value) return;
      gameStore.isPlayerTurn = false;
      uiStore.clearError();

      try {
        const data = await makeApiRequest("/api/merchants/transact", {
          method: "POST",
          body: JSON.stringify({
            sessionId: gameStore.session.sessionId,
            action,
            itemName,
          }),
        });

        // Backend is the source of truth. Update the entire session state.
        gameStore.session.state = data.newState;
        uiStore.addNotification({
          message: `${
            action === "buy" ? "Purchase successful!" : "Sale successful!"
          }`,
          type: "success",
        });
      } catch (error) {
        // makeApiRequest handles rate-limit UI, so we only show errors for other issues.
        if (error.message !== "RATE_LIMIT_ACTIVE") {
          uiStore.setError(error.message);
        }
      } finally {
        gameStore.isPlayerTurn = true;
      }
    }

    function onContinue() {
      gameStore.exitShopping();
    }

    return {
      merchant,
      playerCurrency,
      playerSellableItems,
      isTransacting,
      handleTransaction,
      onContinue,
      getSellValue,
      rarityColorClass,
    };
  },
  template: `
    <div class="vendor-modal">
      <div class="vendor-modal__content">
        <button 
          @click="onContinue" 
          class="vendor-modal__close-btn" 
          aria-label="Close vendor screen"
          :disabled="isTransacting"
        >×</button>
        
        <div v-if="merchant" class="flex flex-col h-full">
          <header>
            <h2>{{ merchant.name }}</h2>
            <p>{{ merchant.description }}</p>
            <p class="vendor-dialogue">"{{ merchant.dialogue }}"</p>
          </header>

          <div class="vendor-modal__grid">
            <!-- Merchant Inventory Panel -->
            <div class="vendor-panel">
                <h3 class="vendor-panel__title">Merchant's Wares</h3>
                <div class="vendor-panel__body">
                    <div v-if="!merchant.inventory || merchant.inventory.length === 0" class="text-gray-500 text-center p-8">The merchant has nothing left to sell.</div>
                    <div v-else v-for="item in merchant.inventory" :key="item.name" class="vendor-item">
                        <div class="vendor-item__header">
                            <div class="vendor-item__info">
                                <h4 :class="rarityColorClass(item.rarity).split(' ')[0]">{{ item.name }}</h4>
                                <p>{{ item.type }} - {{ item.rarity }}</p>
                            </div>
                             <div class="vendor-item__action">
                                <button @click="handleTransaction('buy', item.name)" :disabled="isTransacting || playerCurrency < item.cost" class="btn btn-primary btn-sm" :class="{'opacity-50 cursor-not-allowed': playerCurrency < item.cost}">
                                    Buy ({{ item.cost }} G)
                                </button>
                             </div>
                        </div>
                        <p class="vendor-item__description">{{ item.description }}</p>
                    </div>
                </div>
            </div>

            <!-- Player Inventory Panel -->
            <div class="vendor-panel">
                <h3 class="vendor-panel__title">
                    <span>Your Goods</span>
                    <span class="currency-display">{{ playerCurrency }} G</span>
                </h3>
                <div class="vendor-panel__body">
                    <div v-if="playerSellableItems.length === 0" class="text-gray-500 text-center p-8">You have no items to sell.</div>
                    <div v-for="item in playerSellableItems" :key="item.name" class="vendor-item">
                         <div class="vendor-item__header">
                            <div class="vendor-item__info">
                                <h4 :class="rarityColorClass(item.rarity).split(' ')[0]">{{ item.name }}</h4>
                                <p>{{ item.type }} - {{ item.rarity }}</p>
                            </div>
                            <div class="vendor-item__action">
                                <button @click="handleTransaction('sell', item.name)" :disabled="isTransacting" class="btn btn-secondary btn-sm">
                                    Sell ({{ getSellValue(item) }} G)
                                </button>
                            </div>
                        </div>
                        <p class="vendor-item__description">{{ item.description }}</p>
                    </div>
                </div>
            </div>
          </div>

          <footer>
            <button 
              @click="onContinue" 
              class="btn btn-primary text-lg"
              :disabled="isTransacting"
            >
              Continue Adventure
            </button>
          </footer>
        </div>
        <div v-else class="text-white text-center flex items-center justify-center h-full">
            <p class="text-2xl">Loading Merchant...</p>
        </div>
      </div>
    </div>
  `,
};

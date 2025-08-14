// frontend/components/MobileStatusHud.js
import { computed } from "vue";
import { useGameStore } from "/stores/useGameStore.js";

export default {
  name: "MobileStatusHud",
  setup() {
    const gameStore = useGameStore();

    const character = computed(() => gameStore.character);

    const healthText = computed(() => {
      if (!character.value) return "0/0";
      return `${character.value.health}/${gameStore.maxHealth}`;
    });

    const energyText = computed(() => {
      if (!character.value) return "0/0";
      return `${character.value.energy}/${gameStore.maxEnergy}`;
    });

    const currencyText = computed(() => {
      if (!character.value || typeof character.value.currency !== "number")
        return "0";
      return character.value.currency.toLocaleString();
    });

    return {
      character,
      healthText,
      energyText,
      currencyText,
    };
  },
  template: `
    <div v-if="character" class="mobile-status-hud">
      <div class="hud-stat hud-stat--health" title="Composure">
        <span class="hud-icon">🧠</span>
        <span class="hud-value">{{ healthText }}</span>
      </div>
      <div class="hud-stat hud-stat--energy" title="Stamina">
        <span class="hud-icon">☕</span>
        <span class="hud-value">{{ energyText }}</span>
      </div>
      <div v-if="typeof character.currency === 'number'" class="hud-stat hud-stat--currency" title="Reputation">
        <span class="hud-icon">⭐</span>
        <span class="hud-value">{{ currencyText }}</span>
      </div>
    </div>
  `,
};

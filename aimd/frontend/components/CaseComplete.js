// frontend/components/CaseComplete.js
import { computed } from "vue";
import { useGameStore } from "../stores/useGameStore.js";
import { formatNarrative } from "../utils/formatters.js";

export default {
  name: "CaseComplete",
  props: {
    status: {
      type: String,
      required: true,
      validator: (value) => ["success", "failure"].includes(value),
    },
  },
  emits: ["find-new-case", "new-character"],

  setup(props, { emit }) {
    const gameStore = useGameStore();

    const title = computed(() => {
      return props.status === "success"
        ? "Case Complete"
        : "Simulation Failed 💀";
    });

    const summary = computed(() => gameStore.caseSummaryData);

    const narrativeSummaryHtml = computed(() => {
      if (summary.value?.narrativeSummary) {
        return formatNarrative(summary.value.narrativeSummary);
      }
      return null;
    });

    const findNewCase = () => emit("find-new-case");
    const newCharacter = () => emit("new-character");

    return {
      title,
      summary,
      narrativeSummaryHtml,
      findNewCase,
      newCharacter,
    };
  },

  template: `
    <div class="case-complete-view" :class="['status-' + status]">
      <div class="case-complete-header">
        <span class="header-icon">✓</span>
        <h2>{{ title }}</h2>
      </div>

      <div v-if="narrativeSummaryHtml" class="case-narrative-summary">
        <h3>My Debrief</h3>
        <div class="narrative-content" v-html="narrativeSummaryHtml"></div>
      </div>

      <div v-if="summary" class="case-summary-rewards">
        <h3>Case Debrief</h3>
        <div class="rewards-grid">
          <!-- Reputation Card -->
          <div v-if="summary.reputation && summary.reputation.total > 0" class="reward-card">
            <div class="reward-card__header">
              <span class="reward-icon">⭐</span>
              <h4>Reputation Earned</h4>
            </div>
            <div class="reward-card__body">
              <div class="rep-breakdown">
                <span>Base Award</span>
                <span class="rep-value">+{{ summary.reputation.base }}</span>
              </div>
              <div class="rep-breakdown">
                <span>Efficiency Bonus</span>
                <span class="rep-value">+{{ summary.reputation.efficiency }}</span>
              </div>
            </div>
            <div class="reward-card__footer">
              <span>Total</span>
              <span class="rep-total">+{{ summary.reputation.total }}</span>
            </div>
          </div>

          <!-- Item Card -->
          <div v-if="summary.awardedItem" class="reward-card">
             <div class="reward-card__header">
              <span class="reward-icon">🎁</span>
              <h4>Item Acquired</h4>
            </div>
            <div class="reward-card__body">
              <p class="item-name">{{ summary.awardedItem.name }}</p>
              <p class="item-desc">{{ summary.awardedItem.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="case-complete-actions">
        <button 
          v-if="status === 'success'" 
          @click="findNewCase" 
          class="btn btn-primary"
        >
          Take New Case
        </button>
        <button @click="newCharacter" class="btn btn-secondary">Start New Career</button>
      </div>
    </div>
  `,
};

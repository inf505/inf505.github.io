// frontend/components/SkillCheckDisplay.js
import { ref, watch, onUnmounted } from "vue";

export default {
  name: "SkillCheckDisplay",
  props: {
    result: {
      type: Number,
      required: true,
    },
    isRolling: {
      type: Boolean,
      required: true,
    },
  },
  emits: ["rollComplete"],
  setup(props, { emit }) {
    const displayNumber = ref(20);
    const isAnimating = ref(false);

    let animationFrameId = null;
    let stopTimeoutId = null;
    let lastTickTimestamp = 0;
    const tickInterval = 75; // ms

    const animateRoll = (timestamp) => {
      if (timestamp - lastTickTimestamp > tickInterval) {
        displayNumber.value = Math.floor(Math.random() * 20) + 1;
        lastTickTimestamp = timestamp;
      }
      animationFrameId = requestAnimationFrame(animateRoll);
    };

    const startRoll = () => {
      if (isAnimating.value) return;
      isAnimating.value = true;
      lastTickTimestamp = performance.now();
      animationFrameId = requestAnimationFrame(animateRoll);

      stopTimeoutId = setTimeout(() => {
        cancelAnimationFrame(animationFrameId);
        displayNumber.value = props.result;
        isAnimating.value = false;
        emit("rollComplete");
      }, 1500); // Total roll duration
    };

    watch(
      () => props.isRolling,
      (newValue) => {
        if (newValue) {
          startRoll();
        }
      },
      {
        immediate: true,
      }
    );

    onUnmounted(() => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(stopTimeoutId);
    });

    return {
      displayNumber,
      isAnimating,
    };
  },
  template: `
    <div class="roll-display-container" :class="{ 'is-animating': isAnimating }">
      <div class="roll-display-face" :key="displayNumber">
        {{ displayNumber }}
      </div>
    </div>
  `,
};

// frontend/components/D20Roll.js
import { ref, onMounted, onUnmounted } from "vue";

export default {
  name: "D20Roll",
  props: {
    result: {
      type: Number,
      required: true,
    },
    isCurrentRoll: {
      type: Boolean,
      default: true,
    },
    // NEW PROP: Controls whether the animation runs on mount.
    animate: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    // If not animating, display the result immediately. Otherwise, start with '?'.
    const displayNumber = ref(props.animate ? "?" : props.result);
    // Animation is only active if the prop says so.
    const isAnimating = ref(props.animate);

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

    const startAndStopRoll = () => {
      isAnimating.value = true;
      lastTickTimestamp = performance.now();
      animationFrameId = requestAnimationFrame(animateRoll);

      stopTimeoutId = setTimeout(() => {
        cancelAnimationFrame(animationFrameId);
        displayNumber.value = props.result;
        isAnimating.value = false;
      }, 1500); // Total roll duration
    };

    onMounted(() => {
      // Only run the animation if the prop allows it.
      if (props.animate) {
        startAndStopRoll();
      }
    });

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
    <div 
      class="d20-container" 
      :class="{ 
        'is-animating': isAnimating, 
        'is-past-roll': !isCurrentRoll 
      }"
    >
      <div class="d20-face" :key="displayNumber">
        {{ displayNumber }}
      </div>
    </div>
  `,
};

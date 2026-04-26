const { createApp, ref, onMounted, nextTick } = Vue;

const app = createApp({
  setup() {
    const speed = ref(100);
    const isPlaying = ref(false);

    const togglePlay = () => {
      isPlaying.value = !isPlaying.value;
      // Re-render icons after DOM updates
      nextTick(() => lucide.createIcons());
    };

    onMounted(() => {
      lucide.createIcons(); // Initialize icons
    });

    return { speed, isPlaying, togglePlay };
  },
});

// Tell Vue to use PrimeVue
app.use(PrimeVue.Config);
app.component("p-slider", PrimeVue.Slider);

app.mount("#app");

const { createApp, ref, onMounted, nextTick } = Vue;

const app = createApp({
  setup() {
    // Game State
    const isPlaying = ref(false);

    // UI State (Added this)
    const isSidebarOpen = ref(false);

    const toggleSidebar = () => {
      isSidebarOpen.value = !isSidebarOpen.value;
    };

    const togglePlay = () => {
      isPlaying.value = !isPlaying.value;
      // Re-render Lucide icons after Vue updates the DOM
      nextTick(() => lucide.createIcons());
    };

    onMounted(() => {
      lucide.createIcons(); // Initial icon load
    });

    // Everything returned here is available to your HTML
    return {
      speed,
      isPlaying,
      isSidebarOpen,
      toggleSidebar,
      togglePlay,
    };
  },
});

// PrimeVue Global Config
app.use(PrimeVue.Config);

app.mount("#app");

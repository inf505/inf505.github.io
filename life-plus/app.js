const { createApp, ref, onMounted, nextTick } = Vue;

const app = createApp({
  setup() {
    const isSidebarOpen = ref(false);

    const toggleSidebar = () => {
      isSidebarOpen.value = !isSidebarOpen.value;
    };

    onMounted(() => {});

    // Everything returned here is available to your HTML
    return {
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

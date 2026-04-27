const { createApp, ref } = Vue;

const app = createApp({
  setup() {
    const isSidebarOpen = ref(false);

    const toggleSidebar = () => {
      isSidebarOpen.value = !isSidebarOpen.value;
    };

    return {
      isSidebarOpen,
      toggleSidebar,
    };
  },
});

// Use PrimeVue with the Aura theme preset (Sakai's modern default)
app.use(PrimeVue.Config, {
  theme: {
    preset: PrimeUIX.Themes.Aura,
    options: {
      darkModeSelector: ".app-dark",
    },
  },
});

// Register Components
app.component("p-button", PrimeVue.Button);

app.mount("#app");

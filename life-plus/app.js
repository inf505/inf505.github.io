const { createApp } = Vue;

createApp({
  data() {
    return {
      // Tracks if the sidebar is open on mobile
      isSidebarOpen: false,
    };
  },
  methods: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen;
    },
  },
}).mount("#app");

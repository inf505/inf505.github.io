// frontend/main.js

// 1. Import from Vue and Pinia using the import map
import { createApp } from "vue";
import { createPinia } from "pinia";

// 2. Import the root component
import App from "./components/App.js";

// 3. Create the Pinia instance
const pinia = createPinia();

// 4. Create the Vue application instance
const app = createApp(App);

// 5. Tell the Vue application to use the Pinia instance
// This makes the stores available to all components.
app.use(pinia);

// 6. Mount the application to the DOM
app.mount("#app");

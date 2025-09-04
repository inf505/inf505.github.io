// components/SettingsModal.js
import { ref, watchEffect, onMounted, onUnmounted } from "vue";
import { useStoryStore } from "../store/useStoryStore.js";

export const SettingsModal = {
  setup() {
    const store = useStoryStore();

    // Use local refs for form inputs to avoid direct mutation
    const localApiKey = ref("");
    const localApiModel = ref("");

    // Sync local state with store state when modal opens
    watchEffect(() => {
      if (store.isSettingsOpen) {
        localApiKey.value = store.apiKey;
        localApiModel.value = store.apiModel;
      }
    });

    const handleSave = () => {
      store.saveSettings({
        newApiKey: localApiKey.value,
        newApiModel: localApiModel.value,
      });
    };

    const handleClose = () => {
      store.toggleSettingsModal();
    };

    // Close modal on Escape key
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    onMounted(() => window.addEventListener("keydown", handleKeydown));
    onUnmounted(() => window.removeEventListener("keydown", handleKeydown));

    return {
      store,
      localApiKey,
      localApiModel,
      handleSave,
      handleClose,
    };
  },
  template: `
    <div v-if="store.isSettingsOpen" class="modal-backdrop" @click.self="handleClose">
      <div class="modal-panel">
        <div class="modal-header">
          <h3>Settings</h3>
          <button @click="handleClose" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="apiKey">Google Gemini API Key</label>
            <input 
              id="apiKey"
              type="password" 
              v-model="localApiKey"
              placeholder="Enter your API key"
            />
            <small>Your key is saved securely in your browser's local storage.</small>
          </div>
          <div class="form-group">
            <label for="apiModel">AI Model</label>
            <select id="apiModel" v-model="localApiModel">
              <option v-for="model in store.validModels" :key="model" :value="model">
                {{ model }}
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="handleSave" class="btn-primary">Save & Close</button>
        </div>
      </div>
    </div>
  `,
};

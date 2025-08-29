// frontend/utils/api.js
import { useConfigStore } from "../stores/useConfigStore.js";
import { useUiStore } from "../stores/useUiStore.js";
import { API_BASE_URL } from "../config.js";

/**
 * A centralized API request handler that automatically attaches the API key,
 * constructs the full URL, and handles rate-limiting, standard errors, and
 * session recovery with one automatic retry.
 * @param {string} endpoint The API endpoint to call (e.g., '/api/session').
 * @param {object} options The standard `fetch` options object.
 * @returns {Promise<any>} The JSON response from the server.
 * @throws {Error} Throws an error if the request fails after all attempts.
 */
export async function makeApiRequest(endpoint, options = {}) {
  const configStore = useConfigStore();
  const uiStore = useUiStore();

  const fullUrl = API_BASE_URL + endpoint;

  if (uiStore.isRateLimited) {
    const errorMessage = `Please wait for the rate limit cooldown to finish (${uiStore.rateLimitSeconds}s).`;
    console.warn(`[API] Request blocked: ${errorMessage}`);
    return Promise.reject(new Error(errorMessage));
  }

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (configStore.apiKey) {
    headers["Authorization"] = `Bearer ${configStore.apiKey}`;
  } else {
    const errorMessage = "API Key not found. Please set it in the settings.";
    console.error(`[API] ${errorMessage}`);

    // --- ARCHITECTURAL FIX FOR DEADLOCK ---
    // If we are in a blocking loading state (like 'initializing'),
    // do NOT try to open the modal. Just throw the error so it can be
    // displayed by the ErrorMessage component.
    const isBlockingLoad = [
      "initializing",
      "session-start",
      "archetype-load",
      "character-finalize",
    ].includes(uiStore.loadingTask);

    if (!isBlockingLoad) {
      uiStore.openSettingsModal();
    }

    throw new Error(errorMessage);
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(fullUrl, { ...options, headers });

      if (response.ok) {
        return response.json();
      }

      if (response.status === 404 && attempt === 1) {
        const { useGameStore } = await import("../stores/useGameStore.js");
        const gameStore = useGameStore();

        if (gameStore.session?.sessionId) {
          console.warn(
            `[API] Received 404 on attempt 1. Attempting session rehydration for ID: ${gameStore.session.sessionId}`
          );
          await gameStore.rehydrateSession();
          console.log(
            "[API] Rehydration successful. Retrying original request automatically."
          );
          continue;
        }
      }

      const errorData = await response.json();

      if (response.status === 401) {
        console.warn(
          "[API] Server responded with 401 Unauthorized. Opening settings modal."
        );
        uiStore.openSettingsModal();
      }

      if (response.status === 429 && errorData.retryAfter) {
        uiStore.startRateLimitCountdown(errorData.retryAfter);
        throw new Error("RATE_LIMIT_ACTIVE");
      }

      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    } catch (error) {
      if (error.message === "RATE_LIMIT_ACTIVE") {
        throw error;
      }

      console.error(
        `[API] Request to ${fullUrl} failed on attempt ${attempt}:`,
        error.message
      );
      if (attempt === 2 || !error.message.includes("SESSION_REHYDRATED")) {
        throw error;
      }
    }
  }
}

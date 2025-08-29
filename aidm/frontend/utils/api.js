// frontend/utils/api.js
import { useConfigStore } from "../stores/useConfigStore.js";
import { useUiStore } from "../stores/useUiStore.js";
import { API_BASE_URL } from "../config.js";

/**
 * A centralized API request handler that automatically attaches the API key
 * and handles rate-limiting, standard errors, and session recovery with one automatic retry.
 * @param {string} url The API endpoint to call.
 * @param {object} options The standard `fetch` options object.
 * @returns {Promise<any>} The JSON response from the server.
 * @throws {Error} Throws an error if the request fails after all attempts.
 */
export async function makeApiRequest(url, options = {}) {
  const configStore = useConfigStore();
  const uiStore = useUiStore();

  const fullUrl = API_BASE_URL + endpoint;

  if (uiStore.isRateLimited) {
    const errorMessage = `Please wait for the rate limit cooldown to finish (${uiStore.rateLimitSeconds}s).`;
    console.warn(`[API] Request blocked: ${errorMessage}`);
    // Return a rejected promise to halt the calling function's logic
    return Promise.reject(new Error(errorMessage));
  }

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (configStore.apiKey) {
    headers["Authorization"] = `Bearer ${configStore.apiKey}`;
  } else {
    uiStore.openSettingsModal();
    const errorMessage = "API Key not found. Please set it in the settings.";
    console.error(`[API] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // We'll try the request a maximum of two times.
  // The second attempt only happens after a successful session rehydration.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(fullUrl, { ...options, headers });

      if (response.ok) {
        return response.json(); // Success on the first or second try
      }

      // --- Handle specific non-OK responses ---

      // On a 404, we'll try to rehydrate the session, but only on the first attempt.
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
          continue; // This goes to the next iteration of the loop (attempt 2)
        }
      }

      // If we are here, it means the request failed for a reason other than a recoverable 404,
      // or the retry after rehydration also failed.
      const errorData = await response.json();

      if (response.status === 401) {
        console.warn(
          "[API] Server responded with 401 Unauthorized. Opening settings modal."
        );
        uiStore.openSettingsModal();
      }

      // --- [MODIFIED] Rate Limit Handling ---
      if (response.status === 429 && errorData.retryAfter) {
        uiStore.startRateLimitCountdown(errorData.retryAfter);
        // Throw a specific, "silent" error to stop the promise chain
        // without triggering the generic error UI.
        throw new Error("RATE_LIMIT_ACTIVE");
      }

      // Throw the final error that will be caught by the outer catch block.
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    } catch (error) {
      // --- [MODIFIED] Prevent generic error message on rate limit ---
      if (error.message === "RATE_LIMIT_ACTIVE") {
        // This is our silent error. Re-throw it so the calling function stops,
        // but don't log it as a generic failure.
        throw error;
      }

      console.error(
        `[API] Request to ${fullUrl} failed on attempt ${attempt}:`,
        error.message
      );
      // If this was the last attempt, or not a rehydration-related error, re-throw it.
      if (attempt === 2 || !error.message.includes("SESSION_REHYDRATED")) {
        throw error;
      }
    }
  }
}

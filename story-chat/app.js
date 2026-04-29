const { createApp, ref, onMounted, nextTick, watch } = Vue;

const CORE_SYSTEM_PROMPT = `You are a creative and collaborative storytelling partner.
TASK: Work with the user to write an engaging story.

OUTPUT REQUIREMENTS:
Return a single JSON object.
1. "thought": Internal logic (1 sentence).
2. "response": The story text.
3. "options": Array of 3 distinct action choices.
4. "new_facts": An array of strings representing permanent changes to the world state, character status, or discovered items (e.g., ["The protagonist found a silver key", "Met Elara, a rogue archer", "Current location: The Whispering Woods"]).
   - Only include NEW facts or UPDATED facts in this array.
   - If no new facts occurred, return an empty array [].
`;

const db = new Dexie("StoryWriterDB");
db.version(2).stores({
  // Incremented version to 2
  chats: "++id, role, text, thought, timestamp",
  facts: "++id, text, category, timestamp", // Added facts table
});

const formatRelativeTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};

createApp({
  setup() {
    const apiKey = ref("");
    const selectedModel = ref("gemma-4-31b-it");
    const isConfigured = ref(false);
    const systemPrompt = ref("");
    const showSettings = ref(false);

    const activeTab = ref("settings");

    const totalSizeKb = ref("0.0");
    const totalTokens = ref("0");
    const messages = ref([]);
    const currentInput = ref("");
    const isLoading = ref(false);
    const messagesContainer = ref(null);
    const inputArea = ref(null);
    const isGeneratingRules = ref(false);
    const selectedTTSModel = ref("gemini-3.1-flash-tts-preview");
    const selectedVoice = ref("Aoede");
    const ttsProsodyNudge = ref(
      "Read the following text like a professional audiobook narrator. Tone: Expressive, engaging, and atmospheric.",
    );

    const facts = ref([]);

    const loadFacts = async () => {
      try {
        // Sort by timestamp so newest or oldest appear in order
        const data = await db.facts.orderBy("timestamp").toArray();
        facts.value = data;
        console.log("Facts loaded into UI:", facts.value); // Debug check
      } catch (err) {
        console.error("Error loading facts:", err);
      }
    };

    const deleteFact = async (id) => {
      await db.facts.delete(id);
      await loadFacts();
    };

    const renderMarkdown = (text) => marked.parse(text);

    const updateCounts = async () => {
      try {
        const chats = await db.chats.toArray();
        const fullDb = { chats };
        const bytes = new TextEncoder().encode(JSON.stringify(fullDb)).length;
        totalSizeKb.value = (bytes / 1024).toFixed(1);
      } catch (err) {
        console.error("Error updating stats:", err);
      }
    };

    const adjustHeight = () => {
      const el = inputArea.value;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    };

    watch(currentInput, () => {
      nextTick(adjustHeight);
    });

    onMounted(async () => {
      const storedKey = localStorage.getItem("story_api_key");
      const storedModel = localStorage.getItem("story_model");

      if (localStorage.getItem("story_tts_model"))
        selectedTTSModel.value = localStorage.getItem("story_tts_model");
      if (localStorage.getItem("story_tts_voice"))
        selectedVoice.value = localStorage.getItem("story_tts_voice");
      if (localStorage.getItem("story_tts_prosody"))
        ttsProsodyNudge.value = localStorage.getItem("story_tts_prosody");

      if (storedKey && storedModel) {
        apiKey.value = storedKey;
        selectedModel.value = storedModel;
        isConfigured.value = true;
      }

      const storedSystemPrompt = localStorage.getItem("story_system_prompt");
      if (storedSystemPrompt !== null) systemPrompt.value = storedSystemPrompt;

      try {
        messages.value = await db.chats.orderBy("timestamp").toArray();
        scrollToBottom();

        // AUTOLOAD LOGIC: If no messages exist, automatically start the story
        if (messages.value.length === 0) {
          if (apiKey.value) {
            initializeStory();
          } else {
            showSettings.value = true; // Open settings if they need to setup the API
          }
        }
      } catch (err) {
        console.error("Dexie Chats Load Error:", err);
      }

      await updateCounts();

      if (window.visualViewport) {
        const handleResize = () => {
          document.documentElement.style.setProperty(
            "--app-height",
            `${window.visualViewport.height}px`,
          );
          document.body.style.height = `${window.visualViewport.height}px`;
          scrollToBottom();
        };

        window.visualViewport.addEventListener("resize", handleResize);
        handleResize();
      } else {
        const handleFallbackResize = () => {
          document.documentElement.style.setProperty(
            "--app-height",
            `${window.innerHeight}px`,
          );
          document.body.style.height = `${window.innerHeight}px`;
          scrollToBottom();
        };
        window.addEventListener("resize", handleFallbackResize);
        handleFallbackResize();
      }

      await loadFacts();
    });

    const saveAllSettings = () => {
      if (selectedModel.value.trim())
        localStorage.setItem("story_model", selectedModel.value.trim());

      localStorage.setItem("story_api_key", apiKey.value);
      localStorage.setItem("story_system_prompt", systemPrompt.value);
      localStorage.setItem("story_tts_model", selectedTTSModel.value);
      localStorage.setItem("story_tts_voice", selectedVoice.value);
      localStorage.setItem("story_tts_prosody", ttsProsodyNudge.value);

      showSettings.value = false;
      isConfigured.value = true;

      // If they just saved settings and have a blank canvas, start!
      if (messages.value.length === 0 && apiKey.value) {
        initializeStory();
      }
    };

    const scrollToBottom = () => {
      setTimeout(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop =
            messagesContainer.value.scrollHeight;
        }
      }, 300);
    };

    const saveToDb = async (role, text, thought = "", options = null) => {
      const id = await db.chats.add({
        role,
        text,
        thought,
        options,
        timestamp: Date.now(),
      });
      return id;
    };

    const deleteMessage = async (index) => {
      const msg = messages.value[index];
      if (msg.id) await db.chats.delete(msg.id);
      messages.value.splice(index, 1);
      await updateCounts();
    };

    const startOver = async () => {
      if (
        !confirm(
          "Are you sure you want to start a new story? This will permanently delete the current text.",
        )
      ) {
        return;
      }
      await db.chats.clear();
      messages.value = [];
      await updateCounts();

      if (apiKey.value) {
        initializeStory();
      } else {
        showSettings.value = true;
      }
    };

    const generateRandomRules = async () => {
      if (!apiKey.value) return alert("Please enter an API Key first.");
      isGeneratingRules.value = true;

      const generatorPrompt =
        "Generate a creative and unique 'World / Character / Tone' setting for a story. " +
        "Be specific but concise (2-3 sentences). Mix genres interestingly. " +
        "Include the Setting, the Protagonist's role, and the overall Tone (Whimsical, Gritty, etc.). " +
        "Return ONLY the setting text, no conversational filler.";

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey.value,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: generatorPrompt }] }],
            generationConfig: { temperature: 1.0 },
          }),
        });

        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error?.message || "Generation failed");

        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          systemPrompt.value = generatedText.trim();
        }
      } catch (err) {
        console.error("Rules Generation Error:", err);
        alert("Failed to generate rules: " + err.message);
      } finally {
        isGeneratingRules.value = false;
      }
    };

    // The automatic kickoff prompt
    const initializeStory = async () => {
      if (isLoading.value) return;

      const prompt = "Begin the story. ";
      const userId = await saveToDb("user", prompt);

      messages.value.push({
        id: userId,
        role: "user",
        text: prompt,
        isHidden: false,
      });
      await triggerAIResponse();
    };

    const addWavHeader = (base64Pcm) => {
      const binaryString = atob(base64Pcm);
      const dataSize = binaryString.length;
      const buffer = new ArrayBuffer(44);
      const view = new DataView(buffer);

      const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, 24000, true);
      view.setUint32(28, 24000 * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, "data");
      view.setUint32(40, dataSize, true);

      let headerString = "";
      const headerBytes = new Uint8Array(buffer);
      for (let i = 0; i < headerBytes.length; i++) {
        headerString += String.fromCharCode(headerBytes[i]);
      }

      return btoa(headerString + binaryString);
    };

    const triggerTTS = async (messageIndex) => {
      const msg = messages.value[messageIndex];
      if (!msg || !msg.text || msg.isGeneratingAudio) return;

      msg.isGeneratingAudio = true;

      try {
        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                { text: `${ttsProsodyNudge.value}\n\nTEXT:\n${msg.text}` },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: selectedVoice.value,
                },
              },
            },
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedTTSModel.value}:generateContent`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey.value,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok)
          throw new Error(data.error?.message || "TTS API Error");

        const base64Audio =
          data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Audio) {
          const playableWavBase64 = addWavHeader(base64Audio);
          msg.audioData = playableWavBase64;
          scrollToBottom();
        }
      } catch (err) {
        console.error("Audio Synthesis Pipeline Failed:", err);
        alert("Failed to synthesize audio: " + err.message);
      } finally {
        msg.isGeneratingAudio = false;
      }
    };

    const triggerAIResponse = async () => {
      isLoading.value = true;
      scrollToBottom();

      try {
        const contents = messages.value.map((msg) => {
          let role = msg.role === "user" ? "user" : "model";
          return {
            role: role,
            parts: [{ text: msg.text }],
          };
        });

        const userTone = systemPrompt.value.trim();

        // Fetch existing facts to inject into the prompt
        const allFacts = await db.facts.toArray();
        const factsSummary = allFacts.map((f) => `- ${f.text}`).join("\n");

        const finalSystemInstruction = `
        ${CORE_SYSTEM_PROMPT}
        ${userTone ? "\nUSER STYLE SETTINGS: " + userTone : ""}

        KNOWN STORY FACTS:
        ${factsSummary || "No facts established yet."}
        `.trim();

        const payload = {
          contents,
          ...(finalSystemInstruction && {
            systemInstruction: { parts: [{ text: finalSystemInstruction }] },
          }),
          generationConfig: {
            temperature: 0.9,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                thought: { type: "string" },
                response: { type: "string" },
                options: {
                  type: "array",
                  items: { type: "string" },
                },
                new_facts: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Key story developments or permanent world-state changes.",
                },
              },
              required: ["thought", "response", "options", "new_facts"],
            },
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent`;

        let data;
        let attempt = 0;
        const retryDelays = [5000, 10000, 15000];

        while (attempt <= retryDelays.length) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 240000);

          try {
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey.value,
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              if (response.status === 500 && attempt < retryDelays.length) {
                console.warn(
                  `API 500 Error. Retrying in ${retryDelays[attempt]}ms...`,
                );
                await new Promise((res) =>
                  setTimeout(res, retryDelays[attempt]),
                );
                attempt++;
                continue;
              }
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.error?.message || `API Error: ${response.status}`,
              );
            }

            data = await response.json();
            break;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        }

        let responseText = "";
        let thoughtText = "";
        totalTokens.value =
          data.usageMetadata.totalTokenCount.toLocaleString("en-US");

        if (data.candidates && data.candidates[0].content.parts) {
          for (const part of data.candidates[0].content.parts) {
            if (part.thought) {
              thoughtText += (part.text || "") + "\n\n";
            } else if (part.text) {
              let text = part.text;
              text = text.replace(
                /<think>([\s\S]*?)<\/think>/gi,
                (m, inner) => {
                  thoughtText += inner.trim() + "\n\n";
                  return "";
                },
              );
              responseText += text + "\n";
            }
          }
        }

        let finalResponse = responseText.trim() || "*(No response text)*";
        let finalOptions = null;

        // --- PARSING & FACT STORAGE ---
        try {
          const jsonStartIndex = finalResponse.indexOf("{");
          const jsonEndIndex = finalResponse.lastIndexOf("}");
          if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
            const jsonString = finalResponse.substring(
              jsonStartIndex,
              jsonEndIndex + 1,
            );
            const parsed = JSON.parse(jsonString);

            if (parsed.thought) thoughtText = parsed.thought;
            if (parsed.response) finalResponse = parsed.response.trim();
            if (parsed.options) finalOptions = parsed.options;

            // Process facts inside the block where 'parsed' is defined
            if (parsed.new_facts && Array.isArray(parsed.new_facts)) {
              for (const factText of parsed.new_facts) {
                await db.facts.add({
                  text: factText,
                  timestamp: Date.now(),
                });
              }
              // Refresh UI ref for the Facts Tab
              if (typeof loadFacts === "function") await loadFacts();
            }
          }
        } catch (e) {
          console.error("JSON Parse error", e);
        }

        const modelId = await saveToDb(
          "model",
          finalResponse,
          thoughtText.trim(),
          finalOptions,
        );

        messages.value.push({
          id: modelId,
          role: "model",
          text: finalResponse,
          thought: thoughtText.trim(),
          options: finalOptions,
          audioData: null,
          isGeneratingAudio: false,
        });
      } catch (error) {
        let errorMsg = `❌ Error: ${error.message}`;
        if (error.name === "AbortError") {
          errorMsg =
            "⏳ Request timed out. The AI took too long to respond. Please hit the retry button.";
        }
        const errId = await saveToDb("model", errorMsg);
        messages.value.push({ id: errId, role: "model", text: errorMsg });
      } finally {
        isLoading.value = false;
        scrollToBottom();
        nextTick(() => inputArea.value?.focus());
      }
      await updateCounts();
    };

    const sendMessage = async () => {
      const userText = currentInput.value.trim();
      if (!userText || isLoading.value) return;

      const userId = await saveToDb("user", userText);
      messages.value.push({ id: userId, role: "user", text: userText });

      currentInput.value = "";
      nextTick(() => {
        if (inputArea.value) inputArea.value.style.height = "auto";
      });

      await triggerAIResponse();
    };

    const sendOption = async (optionText) => {
      currentInput.value = optionText;
      await sendMessage();
    };

    const retryMessage = async (index) => {
      if (isLoading.value) return;
      await deleteMessage(index);
      await triggerAIResponse();
    };

    return {
      apiKey,
      selectedModel,
      isConfigured,
      generateRandomRules,
      isGeneratingRules,
      renderMarkdown,
      formatRelativeTime,
      messages,
      currentInput,
      isLoading,
      messagesContainer,
      sendMessage,
      sendOption,
      retryMessage,
      inputArea,
      deleteMessage,
      systemPrompt,
      showSettings,
      saveAllSettings,
      startOver,
      totalSizeKb,
      totalTokens,
      scrollToBottom,
      activeTab,
      selectedTTSModel,
      selectedVoice,
      ttsProsodyNudge,
      triggerTTS,
      facts,
      loadFacts,
      deleteFact,
    };
  },
}).mount("#app");

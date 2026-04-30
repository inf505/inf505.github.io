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
    const isOptimizingFacts = ref(false);
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
      } catch (err) {
        console.error("Error loading facts:", err);
      }
    };

    const deleteFact = async (id) => {
      await db.facts.delete(id);
      await loadFacts();
    };

    const randomizeRules = async () => {
      if (!apiKey.value) {
        alert("Please enter your API Key first.");
        return;
      }

      // No warning needed anymore since this is non-destructive!
      isGeneratingRules.value = true;
      try {
        var p =
          "Act as a professional narrative designer. Generate a high-concept, atmospheric story premise mixing two unexpected genres. Describe a world with one specific mystery and a protagonist with a clear goal and a secret. No commentary, no formatting, keep your story design simple. Stay under 100 words if possible.";
        var res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" +
            selectedModel.value +
            ":generateContent?key=" +
            apiKey.value,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: p }] }],
            }),
          },
        );
        var data = await res.json();
        if (data.candidates && data.candidates[0].content.parts) {
          // Just update the textarea, don't restart yet
          systemPrompt.value = data.candidates[0].content.parts[0].text.trim();
        }
      } catch (err) {
        console.error(err);
        alert("Randomizer failed.");
      } finally {
        isGeneratingRules.value = false;
      }
    };

    const optimizeFacts = async () => {
      if (!apiKey.value || facts.value.length < 2) return;
      isOptimizingFacts.value = true;
      try {
        var fData = "";
        for (var i = 0; i < facts.value.length; i++) {
          fData += " [FACT: " + facts.value[i].text + "] ";
        }
        var prompt =
          "Merge duplicate facts. Keep concise. Preserve categories (Character, Item, Location, Lore). Return JSON merged_facts array of objects with text and category. DATA: " +
          fData;
        var res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" +
            selectedModel.value +
            ":generateContent?key=" +
            apiKey.value,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "object",
                  properties: {
                    merged_facts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          text: { type: "string" },
                          category: { type: "string" },
                        },
                        required: ["text", "category"],
                      },
                    },
                  },
                  required: ["merged_facts"],
                },
              },
            }),
          },
        );

        var data = await res.json();
        var raw = data.candidates[0].content.parts[0].text;
        var s = raw.indexOf("{"),
          e = raw.lastIndexOf("}");
        if (s !== -1 && e !== -1) {
          var p = JSON.parse(raw.substring(s, e + 1));
          if (p.merged_facts) {
            await db.facts.clear();

            // for (var j = 0; j < p.merged_facts.length; j++) {
            //   await db.facts.add({
            //     text: p.merged_facts[j],
            //     timestamp: Date.now(),
            //   });
            // }

            for (var j = 0; j < p.merged_facts.length; j++) {
              var mf = p.merged_facts[j];
              await db.facts.add({
                text: mf.text,
                category: mf.category,
                timestamp: Date.now(),
              });
            }

            await loadFacts();
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        isOptimizingFacts.value = false;
      }
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
            showSettings.value = true;
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
      // Check if the rules actually changed compared to what's in storage
      var oldRules = localStorage.getItem("story_system_prompt") || "";
      var rulesChanged = oldRules.trim() !== systemPrompt.value.trim();

      // Save everything to localStorage
      localStorage.setItem("story_api_key", apiKey.value);
      localStorage.setItem("story_model", selectedModel.value);
      localStorage.setItem("story_system_prompt", systemPrompt.value);
      localStorage.setItem("story_tts_model", selectedTTSModel.value);
      localStorage.setItem("story_tts_voice", selectedVoice.value);
      localStorage.setItem("story_tts_prosody", ttsProsodyNudge.value);

      showSettings.value = false;
      isConfigured.value = true;

      // Case 1: The chat is empty, just start the story
      if (messages.value.length === 0 && apiKey.value) {
        initializeStory();
      }
      // Case 2: Mid-game change. Ask the user if they want to restart
      else if (rulesChanged && messages.value.length > 0) {
        var restartNow = confirm(
          "Rules updated! Would you like to restart the story now to apply these changes?",
        );
        if (restartNow) {
          // We manually trigger the logic from startOver without the double-confirmation
          db.chats.clear();
          db.facts.clear();
          messages.value = [];
          facts.value = [];
          updateCounts();
          initializeStory();
        }
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
      var warnMsg =
        "Are you sure? This will permanently delete the story AND all remembered facts in the Grimoire.";
      if (!confirm(warnMsg)) return;

      await db.chats.clear();
      await db.facts.clear();
      messages.value = [];
      facts.value = [];

      await updateCounts();

      if (apiKey.value) {
        initializeStory();
      } else {
        showSettings.value = true;
      }
    };

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

        const allFacts = await db.facts.toArray();
        const factsSummary = allFacts.map((f) => `- ${f.text}`).join("\n");

        const finalSystemInstruction = `
        ${CORE_SYSTEM_PROMPT}
        ${userTone ? "\nUSER STYLE SETTINGS: " + userTone : ""}
        CATEGORIES: Character (people/creatures), Item (objects/weapons), Location (places), Lore (history/world rules).
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
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      category: {
                        type: "string",
                        enum: ["Character", "Item", "Location", "Lore"],
                      },
                    },
                    required: ["text", "category"],
                  },
                  description: "Key developments with their specific category.",
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

            if (parsed.new_facts && Array.isArray(parsed.new_facts)) {
              for (var k = 0; k < parsed.new_facts.length; k++) {
                var f = parsed.new_facts[k];
                await db.facts.add({
                  text: f.text,
                  category: f.category || "Lore", // Fallback to Lore
                  timestamp: Date.now(),
                });
              }
              await loadFacts();
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
        const errId = await saveToDb("model", errorMsg);
        messages.value.push({ id: errId, role: "model", text: errorMsg });
      } finally {
        isLoading.value = false;
        scrollToBottom();
      }
      await updateCounts();
    };

    const sendMessage = async () => {
      const userText = currentInput.value.trim();
      if (!userText || isLoading.value) return;

      const userId = await saveToDb("user", userText);
      messages.value.push({ id: userId, role: "user", text: userText });

      currentInput.value = "";
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
      isOptimizingFacts,
      optimizeFacts,
      isGeneratingRules,
      randomizeRules,
    };
  },
}).mount("#app");

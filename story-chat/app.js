const { createApp, ref, onMounted, nextTick, watch } = Vue;

// SAFE STRING CONSTRUCTION
const CORE_SYSTEM_PROMPT =
  "You are a creative and collaborative storytelling partner. " +
  "TASK: Work with the user to write an engaging story. " +
  "OUTPUT REQUIREMENTS: Return a single JSON object. " +
  "1. 'thought': Internal logic (1-2 sentences). " +
  "2. 'response': The story text. " +
  "3. 'options': Array of 3 distinct action choices. " +
  "4. 'new_facts': An array of strings representing permanent changes to the world state. " +
  "Only include NEW or UPDATED facts. If no new facts occurred, return an empty array [].";

const db = new Dexie("StoryWriterDB");
db.version(2).stores({
  chats: "++id, role, text, thought, timestamp",
  facts: "++id, text, category, timestamp",
});

const formatRelativeTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + "m ago";
  if (hours < 24) return hours + "h ago";
  if (days === 1) return "yesterday";
  return days + " days ago";
};

createApp({
  setup() {
    const apiKey = ref("");
    const selectedModel = ref("gemini-2.5-flash-lite");
    const isConfigured = ref(false);
    const systemPrompt = ref("");
    const showSettings = ref(false);
    const activeTab = ref("settings");
    const totalSizeKb = ref("0.0");
    const totalTokens = ref("0");
    const messages = ref([]);
    const currentInput = ref("");
    const isLoading = ref(false);
    const isOptimizingFacts = ref(false);
    const messagesContainer = ref(null);
    const inputArea = ref(null);
    const selectedTTSModel = ref("gemini-3.1-flash-tts-preview");
    const selectedVoice = ref("Aoede");
    const ttsProsodyNudge = ref(
      "Read the following text like a professional audiobook narrator. Tone: Expressive, engaging, and atmospheric.",
    );
    const facts = ref([]);

    const loadFacts = async () => {
      try {
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

    const optimizeFacts = async () => {
      if (!apiKey.value || facts.value.length < 2) return;
      isOptimizingFacts.value = true;
      try {
        var factData = "";
        for (var i = 0; i < facts.value.length; i++) {
          factData += " [FACT: " + facts.value[i].text + "] ";
        }
        var instr =
          "You are an AI editor. Merge duplicate story facts. Keep them concise and third-person. Return ONLY a JSON object with a merged_facts array of strings. DATA: " +
          factData;
        var payload = {
          contents: [{ role: "user", parts: [{ text: instr }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                merged_facts: { type: "array", items: { type: "string" } },
              },
              required: ["merged_facts"],
            },
          },
        };
        var url =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          selectedModel.value +
          ":generateContent";
        var res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey.value,
          },
          body: JSON.stringify(payload),
        });
        var data = await res.json();
        if (!res.ok) throw new Error("API Error");
        var text = data.candidates[0].content.parts[0].text;
        var s = text.indexOf("{");
        var e = text.lastIndexOf("}");
        if (s !== -1 && e !== -1) {
          var parsed = JSON.parse(text.substring(s, e + 1));
          if (parsed.merged_facts) {
            await db.facts.clear();
            for (var j = 0; j < parsed.merged_facts.length; j++) {
              await db.facts.add({
                text: parsed.merged_facts[j],
                timestamp: Date.now(),
              });
            }
            await loadFacts();
          }
        }
      } catch (err) {
        alert("Optimize failed: " + err.message);
      } finally {
        isOptimizingFacts.value = false;
      }
    };

    const renderMarkdown = (text) => marked.parse(text);

    const updateCounts = async () => {
      try {
        const chats = await db.chats.toArray();
        const bytes = new TextEncoder().encode(
          JSON.stringify({ chats }),
        ).length;
        totalSizeKb.value = (bytes / 1024).toFixed(1);
      } catch (err) {
        console.error(err);
      }
    };

    const scrollToBottom = () => {
      setTimeout(() => {
        if (messagesContainer.value)
          messagesContainer.value.scrollTop =
            messagesContainer.value.scrollHeight;
      }, 300);
    };

    const saveToDb = async (role, text, thought = "", options = null) => {
      return await db.chats.add({
        role,
        text,
        thought,
        options,
        timestamp: Date.now(),
      });
    };

    const deleteMessage = async (index) => {
      const msg = messages.value[index];
      if (msg.id) await db.chats.delete(msg.id);
      messages.value.splice(index, 1);
      await updateCounts();
    };

    const startOver = async () => {
      if (!confirm("Start over?")) return;
      await db.chats.clear();
      messages.value = [];
      if (apiKey.value) initializeStory();
    };

    const initializeStory = async () => {
      if (isLoading.value) return;
      const prompt = "Begin the story. ";
      const id = await saveToDb("user", prompt);
      messages.value.push({ id, role: "user", text: prompt });
      await triggerAIResponse();
    };

    const triggerTTS = async (index) => {
      const msg = messages.value[index];
      if (!msg || msg.isGeneratingAudio) return;
      msg.isGeneratingAudio = true;
      try {
        const payload = {
          contents: [
            {
              role: "user",
              parts: [{ text: ttsProsodyNudge.value + "\n\n" + msg.text }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice.value },
              },
            },
          },
        };
        const url =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          selectedTTSModel.value +
          ":generateContent";
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey.value,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        const base64 = data.candidates[0].content.parts[0].inlineData.data;
        if (base64) {
          msg.audioData = addWavHeader(base64);
          scrollToBottom();
        }
      } catch (err) {
        console.error(err);
      } finally {
        msg.isGeneratingAudio = false;
      }
    };

    const addWavHeader = (pcm) => {
      const bin = atob(pcm);
      const size = bin.length;
      const buffer = new ArrayBuffer(44);
      const view = new DataView(buffer);
      const writeStr = (off, s) => {
        for (let i = 0; i < s.length; i++)
          view.setUint8(off + i, s.charCodeAt(i));
      };
      writeStr(0, "RIFF");
      view.setUint32(4, 36 + size, true);
      writeStr(8, "WAVE");
      writeStr(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, 24000, true);
      view.setUint32(28, 48000, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, "data");
      view.setUint32(40, size, true);
      let head = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i++)
        head += String.fromCharCode(bytes[i]);
      return btoa(head + bin);
    };

    const triggerAIResponse = async () => {
      isLoading.value = true;
      try {
<<<<<<< HEAD
        const hist = messages.value.map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        }));
        const fSum = facts.value.map((f) => "- " + f.text).join("\n");
        const sys =
          CORE_SYSTEM_PROMPT +
          "\nSTYLE: " +
          systemPrompt.value +
          "\nFACTS: " +
          (fSum || "None");
=======
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

        KNOWN STORY FACTS:
        ${factsSummary || "No facts established yet."}
        `.trim();
>>>>>>> parent of ce25736 (Update app.js)

        const payload = {
          contents: hist,
          systemInstruction: { parts: [{ text: sys }] },
          generationConfig: {
            temperature: 0.9,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                thought: { type: "string" },
                response: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                new_facts: { type: "array", items: { type: "string" } },
              },
              required: ["thought", "response", "options", "new_facts"],
            },
          },
        };
<<<<<<< HEAD
        const url =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          selectedModel.value +
          ":generateContent";
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey.value,
          },
          body: JSON.stringify(payload),
=======

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
          }
        } catch (e) {
          console.error("JSON Parse error", e);
        }

        if (parsed.new_facts && Array.isArray(parsed.new_facts)) {
          for (const factText of parsed.new_facts) {
            await db.facts.add({
              text: factText,
              timestamp: Date.now(),
            });
          }
          await loadFacts();
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
>>>>>>> parent of ce25736 (Update app.js)
        });
        const data = await res.json();
        totalTokens.value = data.usageMetadata.totalTokenCount.toLocaleString();
        const raw = data.candidates[0].content.parts[0].text;
        const s = raw.indexOf("{");
        const e = raw.lastIndexOf("}");
        if (s !== -1 && e !== -1) {
          const p = JSON.parse(raw.substring(s, e + 1));
          const id = await saveToDb("model", p.response, p.thought, p.options);
          messages.value.push({
            id,
            role: "model",
            text: p.response,
            thought: p.thought,
            options: p.options,
          });
          if (p.new_facts) {
            for (const f of p.new_facts)
              await db.facts.add({ text: f, timestamp: Date.now() });
            await loadFacts();
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        isLoading.value = false;
        scrollToBottom();
      }
    };

    const sendMessage = async () => {
      const val = currentInput.value.trim();
      if (!val || isLoading.value) return;
      const id = await saveToDb("user", val);
      messages.value.push({ id, role: "user", text: val });
      currentInput.value = "";
      await triggerAIResponse();
    };

    onMounted(async () => {
      apiKey.value = localStorage.getItem("story_api_key") || "";
      selectedModel.value =
        localStorage.getItem("story_model") || "gemini-2.5-flash-lite";
      systemPrompt.value = localStorage.getItem("story_system_prompt") || "";
      messages.value = await db.chats.orderBy("timestamp").toArray();
      await loadFacts();
      if (messages.value.length === 0 && apiKey.value) initializeStory();
    });

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
      inputArea,
      deleteMessage,
      systemPrompt,
      showSettings,
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
      saveAllSettings: () => {
        localStorage.setItem("story_api_key", apiKey.value);
        localStorage.setItem("story_model", selectedModel.value);
        localStorage.setItem("story_system_prompt", systemPrompt.value);
        showSettings.value = false;
        if (messages.value.length === 0 && apiKey.value) initializeStory();
      },
      sendOption: (t) => {
        currentInput.value = t;
        sendMessage();
      },
    };
  },
}).mount("#app");

const { createApp, ref, onMounted, nextTick, watch } = Vue;

const db = new Dexie("LLMChatDB");
db.version(3).stores({
  chats: "++id, role, text, thought, timestamp",
  facts: "++id, text, category, timestamp",
  archives: "++id, text, timestamp"
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
    const baseUrl = ref("https://api.openai.com/v1");
    const apiKey = ref("");
    const selectedModel = ref("gpt-4o-mini");
    const isConfigured = ref(false);
    const systemPrompt = ref("");

    const selectedPersona = ref("socratic");
    const selectedDepth = ref("balanced");
    const selectedOptionStrategy = ref("follow_up");

    const showSettings = ref(false);
    const activeTab = ref("settings");
    const isOptimizingFacts = ref(false);
    const isSummarizing = ref(false);
    const totalSizeKb = ref("0.0");
    const totalTokens = ref("0");
    const messages = ref([]);
    const currentInput = ref("");
    const isLoading = ref(false);
    const messagesContainer = ref(null);
    const inputArea = ref(null);

    const ttsProvider = ref("gemini");
    const geminiApiKey = ref("");
    const selectedTTSModel = ref("gemini-3.1-flash-tts-preview");
    const selectedVoice = ref("Aoede");
    const ttsProsodyNudge = ref(
      "Read the following text like a professional audiobook narrator. Tone: Expressive, engaging, and atmospheric.",
    );
    const newFactText = ref("");
    const newFactCategory = ref("Concept");
    const facts = ref([]);
    const summaryBatchSize = ref(10);
    const editingMsgId = ref(null);
    const editingMsgText = ref("");
    const archivedSummaries = ref([]);
    const superSummaryBatchSize = ref(5);
    const isSuperSummarizing = ref(false);

    const modelJail = ref({}); // { "model-name": expireTimestamp }

    const putModelInJail = (modelName, minutes = 5) => {
      const expireTime = Date.now() + minutes * 60 * 1000;
      modelJail.value[modelName] = expireTime;
      console.warn(`🚨 [MODEL JAIL] ${modelName} jailed for ${minutes}m until ${new Date(expireTime).toLocaleTimeString()}`);
    };

    const getModelList = () => {
      if (!selectedModel.value.trim()) return ["google/gemma-4-26b-a4b-it:free"];
      return selectedModel.value
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m.length > 0);
    };

    const getNextAvailableModel = (attemptedInThisTurn = []) => {
      const models = getModelList();
      const now = Date.now();

      // Find first model not in jail and not already attempted in this turn
      const available = models.find(
        (m) => (!modelJail.value[m] || modelJail.value[m] <= now) && !attemptedInThisTurn.includes(m)
      );
      if (available) return available;

      // Fallback: Pick any model from list not attempted in this turn
      const unattempted = models.find((m) => !attemptedInThisTurn.includes(m));
      if (unattempted) return unattempted;

      return models[0];
    };

    const onTTSProviderChange = () => {
      if (ttsProvider.value === "gemini") {
        selectedTTSModel.value = "gemini-3.1-flash-tts-preview";
        selectedVoice.value = "Aoede";
      } else {
        selectedTTSModel.value = "tts-1";
        selectedVoice.value = "alloy";
      }
    };

    const startEditMessage = (msg) => {
      editingMsgId.value = msg.id;
      editingMsgText.value = msg.text;
    };

    const cancelEditMessage = () => {
      editingMsgId.value = null;
      editingMsgText.value = "";
    };

    const saveEditMessage = async (msg) => {
      if (!editingMsgText.value.trim()) return;
      try {
        await db.chats.update(msg.id, { text: editingMsgText.value.trim() });
        msg.text = editingMsgText.value.trim();
        editingMsgId.value = null;
        editingMsgText.value = "";
        await updateCounts();
      } catch (err) {
        console.error("Error saving edited message:", err);
        alert("Failed to save changes.");
      }
    };

    const loadFacts = async () => {
      try {
        const data = await db.facts.orderBy("timestamp").toArray();
        facts.value = data;
      } catch (err) {
        console.error("Error loading facts:", err);
      }
    };

    const loadArchives = async () => {
      try {
        const data = await db.archives.orderBy("timestamp").reverse().toArray();
        archivedSummaries.value = data;
      } catch (err) {
        console.error("Error loading archives:", err);
      }
    };

    const deleteFact = async (id) => {
      await db.facts.delete(id);
      await loadFacts();
    };

    const addManualFact = async () => {
      if (!newFactText.value.trim()) return;

      try {
        await db.facts.add({
          text: newFactText.value.trim(),
          category: newFactCategory.value,
          timestamp: Date.now(),
        });

        newFactText.value = "";
        await loadFacts();
      } catch (err) {
        console.error("Error adding manual fact:", err);
      }
    };

    const optimizeFacts = async () => {
      if (!apiKey.value || facts.value.length < 2) return;
      isOptimizingFacts.value = true;

      try {
        const timeFacts = facts.value
          .filter((f) => f.text.toLowerCase().startsWith("time:"))
          .sort((a, b) => b.timestamp - a.timestamp);

        const latestTimeFact = timeFacts[0];

        const otherFacts = facts.value.filter(
          (f) => !f.text.toLowerCase().startsWith("time:"),
        );

        const cleanFactsForAI = otherFacts.map((f) => ({
          category: f.category,
          text: f.text
        }));

        if (otherFacts.length < 2 && timeFacts.length > 1) {
          await db.facts.clear();
          if (latestTimeFact) await db.facts.add(latestTimeFact);
          for (const f of otherFacts) await db.facts.add(f);
          await loadFacts();
          isOptimizingFacts.value = false;
          return;
        }

        const prompt = `You are an AI knowledge base manager for an intellectual discussion. Your task is to optimize an array of established concepts, premises, and contextual notes.

        RULES:
        1. Merge duplicate concepts and resolve contradictions. Combine all known details about a specific topic or premise into a single, comprehensive entry.
        2. Preserve core definitions, philosophical stances, academic citations, and ongoing debate rules. Do not delete unique ideas.
        3. Categorize strictly as: Concept, Premise, Citation, Context.

        INPUT DATA:
        ${JSON.stringify(cleanFactsForAI, null, 2)}

        You MUST return a valid JSON object matching this schema format:
        {
          "merged_facts": [
            {
              "text": "The details of the fact/concept",
              "category": "Concept | Premise | Citation | Context"
            }
          ]
        }`;

        const url = `${baseUrl.value.replace(/\/$/, "")}/chat/completions`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.value}`
          },
          body: JSON.stringify({
            model: selectedModel.value,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error?.message || "Optimization failed");

        if (data.choices && data.choices[0] && data.choices[0].message) {
          let rawText = data.choices[0].message.content;
          const start = rawText.indexOf("{"),
            end = rawText.lastIndexOf("}");
          const parsed = JSON.parse(rawText.substring(start, end + 1));

          if (parsed.merged_facts) {
            await db.facts.clear();

            if (latestTimeFact) {
              await db.facts.add({
                text: latestTimeFact.text,
                category: latestTimeFact.category,
                timestamp: Date.now(),
              });
            }

            for (const mf of parsed.merged_facts) {
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
        console.error("Optimization Error:", err);
      } finally {
        isOptimizingFacts.value = false;
      }
    };

    const renderMarkdown = (text) => marked.parse(text);

    const summarizeStory = async () => {
      if (!apiKey.value) {
        alert("Please configure your API settings first.");
        return;
      }

      const batchSize = parseInt(summaryBatchSize.value) || 10;

      const latestIds = messages.value.slice(-2).map((m) => m.id);
      const candidates = messages.value.filter(
        (m, i) => i !== 0 && m.role !== "summary" && !latestIds.includes(m.id),
      );

      if (candidates.length < batchSize) {
        alert(
          `Not enough unsummarized messages. You requested ${batchSize}, but only have ${candidates.length} available for compression.`,
        );
        return;
      }

      const warnMsg = `This will use the Model to compress the oldest ${batchSize} messages into a Chapter Summary. Continue?`;
      if (!confirm(warnMsg)) return;

      isSummarizing.value = true;

      try {
        const msgsToSummarize = candidates.slice(0, batchSize);
        const transcript = msgsToSummarize
          .map((m) => {
            let text = m.text;
            if (m.role === "model" && m.options && m.options.length > 0) {
              text += `\n(Options chosen: ${m.options.join(", ")})`;
            }
            return `${m.role === "user" ? "USER" : "STORYTELLER"}: ${text}`;
          })
          .join("\n\n");

        const prompt = `Summarize the following chronological excerpt of a story into a highly dense, information-packed paragraph.
              Focus entirely on critical plot progression, major decisions, acquired items, and permanent changes.

              CRITICAL RULES:
              1. SHIFT POV: Do NOT use the word "you" or second-person perspective. Write purely in the third-person objective (e.g., "The protagonist", or BETTER is to use their specific character name if known).
              2. MAXIMIZE DENSITY: Strip out trivial dialogue, minor movements, and atmospheric fluff. Condense the events into concise, factual narrative history.

              STORY EXCERPT:
              ${transcript}

              You MUST return a valid JSON object matching this schema:
              {
                "thought_process": "brief analysis of events and POV shift check",
                "summary": "dense third-person paragraph summary text"
              }`;

        const payload = {
          model: selectedModel.value,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        };

        const url = `${baseUrl.value.replace(/\/$/, "")}/chat/completions`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.value}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error?.message || "Summarization API failed");

        let summaryText = "";

        if (data.choices && data.choices[0] && data.choices[0].message) {
          let rawText = data.choices[0].message.content;

          const start = rawText.indexOf("{");
          const end = rawText.lastIndexOf("}");
          if (start !== -1 && end !== -1) {
            rawText = rawText.substring(start, end + 1);
          }

          const parsed = JSON.parse(rawText);
          if (parsed.summary) {
            summaryText = parsed.summary.trim();
          }
        }

        if (!summaryText) throw new Error("Received empty summary from AI.");

        // Safe Timestamp Extraction
        const lastItem = msgsToSummarize[msgsToSummarize.length - 1];
        let baseTimestamp = lastItem.timestamp;

        if (!baseTimestamp || isNaN(baseTimestamp)) {
          const dbItem = await db.chats.get(lastItem.id);
          baseTimestamp = dbItem && !isNaN(dbItem.timestamp) ? dbItem.timestamp : Date.now();
        }

        // 🛡️ DEXIE TRANSACTION: Guarantees no partial deletes!
        await db.transaction('rw', db.chats, async () => {
          for (const m of msgsToSummarize) {
            await db.chats.delete(m.id);
          }

          await db.chats.add({
            role: "summary",
            text: summaryText,
            thought: "",
            options: null,
            timestamp: baseTimestamp + 1,
          });
        });

        messages.value = await db.chats.orderBy("timestamp").toArray();
        await updateCounts();

        // Let the user know it succeeded and where to look
        alert("Summary created successfully! Scroll up your chat history to see it.");

      } catch (err) {
        console.error("Summarize Error:", err);
        alert("Summarize failed: " + err.message);
      } finally {
        isSummarizing.value = false;
      }
    };

    const superSummarizeStory = async () => {
      if (!apiKey.value) return;

      const batchSize = parseInt(superSummaryBatchSize.value) || 5;

      const candidates = messages.value.filter(m =>
        m.role === "summary" && !m.text.includes("[THE STORY SO FAR]")
      );

      if (candidates.length < batchSize) {
        alert(`Not enough chapter summaries. You requested ${batchSize}, but only have ${candidates.length} available.`);
        return;
      }

      const warnMsg = `This will compress the oldest ${batchSize} Chapter Summaries into a single "Story So Far" entry, and move the originals to your Archive. Continue?`;
      if (!confirm(warnMsg)) return;

      isSuperSummarizing.value = true;

      try {
        const msgsToSummarize = candidates.slice(0, batchSize);
        const transcript = msgsToSummarize
          .map((m, i) => `CHAPTER ${i + 1}:\n${m.text}`)
          .join("\n\n");

        const prompt = `You are a master storyteller. Summarize the following sequential chapter summaries into a single, cohesive "The Story So Far" narrative arc.
                        Focus entirely on the overarching plot progression, major milestones, and critical locations/items. Do not lose the main thread.

                        PREVIOUS CHAPTERS:
                        ${transcript}

                        You MUST return a valid JSON object matching this schema format:
                        {
                          "thought_process": "Internal analysis of narrative arc",
                          "epoch_summary": "narrative epoch summary block"
                        }`;

        const payload = {
          model: selectedModel.value,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        };

        const url = `${baseUrl.value.replace(/\/$/, "")}/chat/completions`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.value}`
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Super Summarize failed");

        let rawText = data.choices[0].message.content;
        const start = rawText.indexOf("{");
        const end = rawText.lastIndexOf("}");
        if (start !== -1 && end !== -1) rawText = rawText.substring(start, end + 1);

        const parsed = JSON.parse(rawText);
        let summaryText = parsed.epoch_summary?.trim();

        if (!summaryText) throw new Error("Received empty summary.");

        // Safe Timestamp Extraction
        const lastItem = msgsToSummarize[msgsToSummarize.length - 1];
        let baseTimestamp = lastItem.timestamp;

        if (!baseTimestamp || isNaN(baseTimestamp)) {
          const dbItem = await db.chats.get(lastItem.id);
          baseTimestamp = dbItem && !isNaN(dbItem.timestamp) ? dbItem.timestamp : Date.now();
        }

        // 🛡️ DEXIE TRANSACTION (Chats & Archives): Moves items safely!
        await db.transaction('rw', db.chats, db.archives, async () => {
          for (const m of msgsToSummarize) {
            await db.archives.add({ text: m.text, timestamp: m.timestamp || baseTimestamp });
            await db.chats.delete(m.id);
          }

          await db.chats.add({
            role: "summary",
            text: `**[THE STORY SO FAR]**\n\n${summaryText}`,
            thought: "",
            options: null,
            timestamp: baseTimestamp + 1,
          });
        });

        messages.value = await db.chats.orderBy("timestamp").toArray();
        await loadArchives();
        await updateCounts();

        alert("Epoch compression complete! Original chapters have been archived.");
      } catch (err) {
        console.error("Super Summarize Error:", err);
        alert("Super Summarize failed: " + err.message);
      } finally {
        isSuperSummarizing.value = false;
      }
    };

    const updateCounts = async () => {
      try {
        const chats = await db.chats.toArray();
        const facts = await db.facts.toArray();

        const fullDb = { chats, facts };

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
      const storedBaseUrl = localStorage.getItem("story_base_url");
      if (storedBaseUrl) baseUrl.value = storedBaseUrl;

      const storedKey = localStorage.getItem("story_api_key");
      const storedModel = localStorage.getItem("story_model");

      if (localStorage.getItem("story_tts_provider"))
        ttsProvider.value = localStorage.getItem("story_tts_provider");
      if (localStorage.getItem("story_gemini_api_key"))
        geminiApiKey.value = localStorage.getItem("story_gemini_api_key");
      if (localStorage.getItem("story_tts_model"))
        selectedTTSModel.value = localStorage.getItem("story_tts_model");
      if (localStorage.getItem("story_tts_voice"))
        selectedVoice.value = localStorage.getItem("story_tts_voice");
      if (localStorage.getItem("story_tts_prosody"))
        ttsProsodyNudge.value = localStorage.getItem("story_tts_prosody");

      if (localStorage.getItem("story_persona")) selectedPersona.value = localStorage.getItem("story_persona");
      if (localStorage.getItem("story_depth")) selectedDepth.value = localStorage.getItem("story_depth");
      if (localStorage.getItem("story_option_strategy")) selectedOptionStrategy.value = localStorage.getItem("story_option_strategy");

      if (storedKey && storedModel) {
        apiKey.value = storedKey;
        selectedModel.value = storedModel;
        isConfigured.value = true;
      }

      const storedSystemPrompt = localStorage.getItem("story_system_prompt");
      if (storedSystemPrompt !== null) systemPrompt.value = storedSystemPrompt;

      if (localStorage.getItem("story_summary_batch")) {
        summaryBatchSize.value = parseInt(
          localStorage.getItem("story_summary_batch"),
        );
      }

      try {
        messages.value = await db.chats.orderBy("timestamp").toArray();
        scrollToBottom();

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
      await loadArchives();
    });

    const saveAllSettings = () => {
      var oldRules = localStorage.getItem("story_system_prompt") || "";
      var rulesChanged = oldRules.trim() !== systemPrompt.value.trim();

      localStorage.setItem("story_base_url", baseUrl.value);
      localStorage.setItem("story_api_key", apiKey.value);
      localStorage.setItem("story_model", selectedModel.value);
      localStorage.setItem("story_system_prompt", systemPrompt.value);
      localStorage.setItem("story_tts_provider", ttsProvider.value);
      localStorage.setItem("story_gemini_api_key", geminiApiKey.value);
      localStorage.setItem("story_tts_model", selectedTTSModel.value);
      localStorage.setItem("story_tts_voice", selectedVoice.value);
      localStorage.setItem("story_tts_prosody", ttsProsodyNudge.value);
      localStorage.setItem("story_summary_batch", summaryBatchSize.value);

      localStorage.setItem("story_persona", selectedPersona.value);
      localStorage.setItem("story_depth", selectedDepth.value);
      localStorage.setItem("story_option_strategy", selectedOptionStrategy.value);

      showSettings.value = false;
      isConfigured.value = true;

      if (messages.value.length === 0 && apiKey.value) {
        initializeStory();
      } else if (rulesChanged && messages.value.length > 0) {
        var restartNow = confirm(
          "Rules updated! Would you like to restart the story now to apply these changes?",
        );
        if (restartNow) {
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

      const firstMessage =
        systemPrompt.value.trim() ||
        "The story begins in a mysterious world...";

      const userId = await saveToDb("user", firstMessage);

      messages.value.push({
        id: userId,
        role: "user",
        text: firstMessage,
        isHidden: false,
        timestamp: Date.now()
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
        if (ttsProvider.value === "gemini") {
          const useKey = geminiApiKey.value.trim() || apiKey.value.trim();
          if (!useKey) {
            throw new Error("No API Key configured for Gemini TTS. Please add a key in the Audio tab or Settings.");
          }

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
              "x-goog-api-key": useKey,
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok)
            throw new Error(data.error?.message || "Gemini TTS API Error");

          const base64Audio =
            data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

          if (base64Audio) {
            const playableWavBase64 = addWavHeader(base64Audio);
            msg.audioData = playableWavBase64;
            scrollToBottom();
          }
        } else {
          const payload = {
            model: selectedTTSModel.value,
            input: `${ttsProsodyNudge.value}\n\nTEXT:\n${msg.text}`,
            voice: selectedVoice.value,
            response_format: "wav"
          };

          const url = `${baseUrl.value.replace(/\/$/, "")}/audio/speech`;

          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey.value}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error?.message || "TTS API Error");
          }

          const buffer = await response.arrayBuffer();
          let binary = "";
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          const chunkSize = 0xffff;
          for (let i = 0; i < len; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
          }
          const base64Audio = btoa(binary);

          msg.audioData = base64Audio;
          scrollToBottom();
        }
      } catch (err) {
        console.error("Audio Synthesis Pipeline Failed:", err);
        alert("Failed to synthesize audio: " + err.message);
      } finally {
        msg.isGeneratingAudio = false;
      }
    };

    const generateSystemPrompt = () => {
      let personaText = "";
      switch (selectedPersona.value) {
        case "socratic": personaText = "You are a Socratic Dialogue Partner. Ask probing questions, challenge assumptions, and guide the user to discover underlying truths through critical inquiry."; break;
        case "feynman": personaText = "You are a Feynman Educator. Explain complex concepts using intuitive, simple analogies. Break down difficult topics so they are easy to understand without losing accuracy."; break;
        case "devil": personaText = "You are a Devil's Advocate. Your goal is to critique arguments, highlight logical fallacies, and present strong opposing stances to test the robustness of the user's ideas."; break;
        case "scholar": personaText = "You are a Historical & Patristic Scholar. Focus heavily on primary sources, historical context, textual exegesis, and the evolution of thought over time."; break;
        case "reviewer": personaText = "You are an Academic / Technical Peer Reviewer. Engage at a graduate-level of technical depth, demanding rigor, precise terminology, and robust evidence."; break;
        case "custom": personaText = "You are an expert dialogue partner."; break;
      }

      let depthText = "";
      if (selectedDepth.value === "eli5") depthText = "DEPTH: Keep explanations extremely simple, accessible, and free of unnecessary jargon. Explain as if to an intelligent beginner (ELI5).";
      else if (selectedDepth.value === "balanced") depthText = "DEPTH: Maintain a standard, balanced academic tone. Use appropriate terminology but ensure clarity for a general educated audience.";
      else if (selectedDepth.value === "deep") depthText = "DEPTH: Use maximal academic and technical rigor. Do not shy away from complex jargon, deep theoretical nuances, or advanced conceptual frameworks.";

      let optionsThoughtText = "";
      let optionsExample = "";
      switch (selectedOptionStrategy.value) {
        case "follow_up":
          optionsThoughtText = "3 distinct, compelling follow-up directions or probing questions that the user could explore next.";
          optionsExample = '["How does Aquinas view this?", "What is the primary critique of this stance?", "Can we explore the historical context?"]';
          break;
        case "counter_arguments":
          optionsThoughtText = "3 distinct counter-arguments, critiques, or weaknesses of the viewpoint just discussed.";
          optionsExample = '["Critique: This ignores the problem of induction.", "Counter: Utilitarianism would argue otherwise.", "Fallacy: Is this a strawman?"]';
          break;
        case "applications":
          optionsThoughtText = "3 distinct real-world applications, modern implications, or practical uses of these concepts.";
          optionsExample = '["How does this apply to modern AI ethics?", "Example of this in modern politics?", "Practical use case in daily life?"]';
          break;
        case "definitions":
          optionsThoughtText = "3 specific key concepts, philosophers, or jargon terms mentioned that need deeper definition.";
          optionsExample = '["Define: Epistemology", "Who was Kierkegaard?", "Explain: The Categorical Imperative"]';
          break;
      }

      return `TASK: Engage with the user in rigorous, nuanced discussions based on the provided topic.

    PERSONA & TONE:
    ${personaText}
    ${depthText}

    USER CUSTOM INSTRUCTIONS / TOPIC:
    ${systemPrompt.value || "(None provided. Drive the conversation based on the user's input.)"}

    OUTPUT REQUIREMENTS:
    Return a single JSON object with EXACTLY three fields in this SPECIFIC ORDER: "thought", "options", and "response".

    - "thought":
       - Briefly analyze the user's inquiry, key nuances, and potential context.
       - BRAINSTORM OPTIONS: Explicitly draft ${optionsThoughtText}
    - "options": MANDATORY ARRAY of the 3 concise items brainstormed in your "thought" field (e.g., ${optionsExample}).
    - "response": The direct, comprehensive, and insightful main discussion text formatted in standard markdown prose.

    CRITICAL STRUCTURAL RULES:
    1. The JSON keys MUST appear in exact order: "thought", then "options", then "response".
    2. The "options" array is STRICTLY MANDATORY. Never return an empty array or omit the "options" key.
    3. The "response" field must contain ONLY standard, natural discussion text or markdown prose.
    4. DO NOT embed, escape, or serialize any JSON objects, JSON strings, or array representations inside the "response" or "thought" fields.
    5. Never use markdown code fences (like \`json ... \`) inside a JSON string property.`;
    };

    const triggerAIResponse = async () => {
      isLoading.value = true;
      scrollToBottom();

      try {
        const allFacts = await db.facts.toArray();
        const factsSummary = allFacts
          .map((f) => `- [${f.category}] ${f.text}`)
          .join("\n");

        const contents = messages.value.map((msg, index) => {
          let role =
            msg.role === "user" || msg.role === "summary" ? "user" : "assistant";
          let text = msg.text;

          if (msg.role === "summary") {
            text = `[PREVIOUS EVENTS SUMMARY]\n${text}`;
          }

          if (index === 0) {
            text = `[KNOWLEDGE BASE / ESTABLISHED FACTS]
                ${factsSummary || "No facts established yet."}[END KNOWLEDGE BASE]

                DISCUSSION PROMPT: ${text}`;
          }

          return {
            role: role,
            content: text,
          };
        });

        const systemMessage = {
          role: "system",
          content: generateSystemPrompt()
        };

        const messagesPayload = [systemMessage, ...contents];

        const modelList = getModelList();
        const attemptedInThisTurn = [];
        let data = null;
        let activeModel = "";

        // Loop through available models if errors or rate limits occur
        while (attemptedInThisTurn.length < modelList.length) {
          activeModel = getNextAvailableModel(attemptedInThisTurn);
          attemptedInThisTurn.push(activeModel);

          console.log(`🤖 Requesting response from: ${activeModel}`);

          const payload = {
            model: activeModel,
            messages: messagesPayload,
            temperature: 0.7,
            max_tokens: 4096,
            response_format: { type: "json_object" }
          };

          const url = `${baseUrl.value.replace(/\/$/, "")}/chat/completions`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey.value}`,
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errMsg = errorData.error?.message || "";

              // If rate limited (429) or server error (5xx), put model in jail and try next!
              if (response.status === 429 || response.status >= 500) {
                console.warn(`⚠️ Model ${activeModel} failed with status ${response.status}: ${errMsg}. Putting in jail...`);
                putModelInJail(activeModel, 5);

                if (attemptedInThisTurn.length < modelList.length) {
                  continue;
                }
              }

              throw new Error(`[${activeModel}] API Error (${response.status}): ${errMsg}`);
            }

            data = await response.json();
            console.log("RAW API RESPONSE:", data);
            break; // Success! Exit retry loop.
          } catch (error) {
            clearTimeout(timeoutId);

            // If timeout or network error on this model and we have backups, jail & try next
            if ((error.name === "AbortError" || error.message.includes("Failed to fetch")) && attemptedInThisTurn.length < modelList.length) {
              console.warn(`⏳ Model ${activeModel} timed out or network failed. Putting in jail...`);
              putModelInJail(activeModel, 5);
              continue;
            }

            // If no more backup models, rethrow error to outer handler
            if (attemptedInThisTurn.length >= modelList.length) {
              throw error;
            }
          }
        }

        if (!data) throw new Error("All configured models in fallback list failed or were rate-limited.");

        let responseText = "";
        let thoughtText = "";
        totalTokens.value =
          data.usage?.total_tokens?.toLocaleString("en-US") || "0";

        if (data.choices && data.choices[0] && data.choices[0].message) {
          let messageContent = data.choices[0].message.content;
          if (messageContent) {
            // Safely capture and strip native <think> reasoning blocks
            messageContent = messageContent.replace(
              /<think>([\s\S]*?)<\/think>/gi,
              (m, inner) => {
                thoughtText += inner.trim() + "\n\n";
                return "";
              }
            );
            responseText = messageContent;
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

            let parsed = null;
            try {
              parsed = JSON.parse(jsonString);
            } catch (parseErr) {
              // Handle unescaped newline/control characters inside JSON strings
              try {
                const sanitized = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
                  if (match === '\n') return '\\n';
                  if (match === '\r') return '\\r';
                  if (match === '\t') return '\\t';
                  return '';
                });
                parsed = JSON.parse(sanitized);
              } catch (sanitizedErr) {
                console.warn("JSON parsing failed after sanitization. Attempting regex extraction.");
                console.log("📄 Raw JSON string from model:\n", jsonString);
              }
            }

            const cleanTextField = (val) => {
              if (typeof val !== "string") return val;
              let s = val.trim();

              // Unescape literal unicode sequences like \u201d or \u201c
              s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

              if (s.startsWith("```")) {
                s = s.replace(/^```[a-zA-Z]*\n?|```$/g, "").trim();
              }
              if (s.startsWith("{") || s.startsWith("[")) {
                try {
                  const nested = JSON.parse(s);
                  if (nested.response) return nested.response.trim();
                  if (nested.text) return nested.text.trim();
                } catch (e) { }
              }
              return s;
            };

            if (parsed) {
              if (parsed.thought) {
                thoughtText = typeof parsed.thought === 'string'
                  ? parsed.thought
                  : JSON.stringify(parsed.thought);
              }

              if (parsed.response) finalResponse = cleanTextField(parsed.response).trim();

              if (parsed.options && Array.isArray(parsed.options)) {
                finalOptions = parsed.options;
              } else if (parsed.choices && Array.isArray(parsed.choices)) {
                finalOptions = parsed.choices;
              } else {
                finalOptions = null;
              }
            } else {
              // Regex fallback to extract the response if JSON parsing failed completely
              const responseMatch = jsonString.match(/"response"\s*:\s*"([\s\S]*?)"\s*\}\s*$/);
              if (responseMatch && responseMatch[1]) {
                finalResponse = responseMatch[1]
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\')
                  .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
              }
            }
          }
        } catch (e) {
          console.error("JSON processing error:", e);
        }

        const finalThoughtString = typeof thoughtText === "string" ? thoughtText.trim() : "";

        const modelId = await saveToDb(
          "model",
          finalResponse,
          finalThoughtString,
          finalOptions,
        );

        messages.value.push({
          id: modelId,
          role: "model",
          text: finalResponse,
          thought: finalThoughtString,
          options: finalOptions,
          audioData: null,
          isGeneratingAudio: false,
          timestamp: Date.now()
        });

      } catch (error) {
        let errorMsg = `❌ Error: ${error.message}`;
        if (error.name === "AbortError") {
          errorMsg =
            "⏳ Request timed out. The AI took too long to respond. Please hit the ↻ retry button.";
        }

        const errId = await saveToDb("model", errorMsg);
        messages.value.push({ id: errId, role: "model", text: errorMsg });
      } finally {
        isLoading.value = false;
        scrollToBottom();

        // Only auto-focus on desktop devices (non-touch) to prevent mobile virtual keyboard popups
        const isMobile = window.matchMedia("(pointer: coarse)").matches || ('ontouchstart' in window);
        if (!isMobile) {
          nextTick(() => inputArea.value?.focus());
        }
      }
      await updateCounts();
    };

    const sendMessage = async () => {
      const userText = currentInput.value.trim();
      if (!userText || isLoading.value) return;

      const userId = await saveToDb("user", userText);
      messages.value.push({ id: userId, role: "user", text: userText, timestamp: Date.now() });

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
      baseUrl,
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
      ttsProvider,
      geminiApiKey,
      selectedTTSModel,
      selectedVoice,
      ttsProsodyNudge,
      triggerTTS,
      onTTSProviderChange,
      facts,
      loadFacts,
      deleteFact,
      newFactText,
      newFactCategory,
      addManualFact,
      isOptimizingFacts,
      optimizeFacts,
      isSummarizing,
      summarizeStory,
      summaryBatchSize,
      editingMsgId,
      editingMsgText,
      startEditMessage,
      cancelEditMessage,
      saveEditMessage,
      archivedSummaries,
      superSummaryBatchSize,
      isSuperSummarizing,
      superSummarizeStory,
      selectedPersona,
      selectedDepth,
      selectedOptionStrategy,
    };
  },
}).mount("#app");

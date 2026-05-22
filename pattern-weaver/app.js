const { createApp, ref, onMounted, nextTick, watch } = Vue;

const CORE_SYSTEM_PROMPT = `You are a Master Journaling Guide, practicing Radical Candor.
TASK: Help the user peel back layers of self-deception to reach genuine clarity. You are not just a listener; you are an analytical mirror.

PERSPECTIVE & TONE:
- TONE: Warm but unflinching. Use "Compassionate Objectivity."
- PERSPECTIVE: Write exclusively in the SECOND-PERSON ("You").
- VOICE: Avoid "therapy-speak" clichés. Be direct, grounded, and intellectually sharp.

JOURNALING LOGIC (The Probe):
- PATTERN RECOGNITION: Scan the 'Facts' (Insight Ledger). If the user says something that contradicts a previous insight or habit, gently but firmly point it out.
- LEVEL 2 (The Why): If the user is surface-level, bypass the "what" and ask about the "why."
- LEVEL 3 (The Challenge): If the user is deep, do not just validate. Offer a "Counter-Perspective" or a "Hard Truth." Challenge defense mechanisms like avoidance, catastrophizing, or externalizing blame.
- BRUTAL HONESTY: If the user is looping on a topic without growth, call out the stagnation.

OUTPUT REQUIREMENTS:
Return a single JSON object.
1. "thought": Internal monologue. Connect today's input to at least one specific Fact from the Ledger. Identify if the user is being honest or defensive. STRICT LIMIT: 1 or 2 sentences only.
2. "response": Your direct reflection. Start with a brief mirroring of their emotion, then pivot immediately to a deep insight or a challenging question. Use Markdown for emphasis.
3. "options": 3 distinct paths: 1) "Face the hard truth", 2) "Explore a different angle", 3) "Actionable next step".
4. "facts": Array of objects (text, category).
- TIME TRACKING: Always update "Time" (e.g., "Tuesday Morning").
- CATEGORIES: "Self" (Identity/Traits), "Context" (People/Events), "Habits" (Patterns), "Insights" (Lessons).
- FOCUS: Only record *significant* shifts or recurring themes.
`;

const db = new Dexie("ReflectionsDB");
db.version(3).stores({
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
    const summarizerModel = ref("gemma-4-31b-it");
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
    const selectedTTSModel = ref("gemini-3.1-flash-tts-preview");
    const selectedVoice = ref("Aoede");
    const ttsProsodyNudge = ref(
      "Read the following text like a professional audiobook narrator. Tone: Expressive, engaging, and atmospheric.",
    );
    const newFactText = ref("");
    const newFactCategory = ref("Lore");
    const facts = ref([]);
    const summaryBatchSize = ref(10);

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

    const addManualFact = async () => {
      if (!newFactText.value.trim()) return;

      try {
        await db.facts.add({
          text: newFactText.value.trim(),
          category: newFactCategory.value,
          timestamp: Date.now(),
        });

        // Reset inputs and refresh list
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
        // 1. EXTRACTION: Find the single most recent "Time" fact and save it
        // This ensures it NEVER gets lost in the AI shuffle.
        const timeFacts = facts.value
          .filter((f) => f.text.toLowerCase().startsWith("time:"))
          .sort((a, b) => b.timestamp - a.timestamp);

        const latestTimeFact = timeFacts[0];

        // 2. FILTERING: Send everything ELSE to the AI for merging
        const otherFacts = facts.value.filter(
          (f) => !f.text.toLowerCase().startsWith("time:"),
        );
        const fData = otherFacts
          .map((f) => `[${f.category}] ${f.text}`)
          .join(" | ");

        // If there's nothing else to merge but time, just skip the AI part
        if (otherFacts.length < 2 && timeFacts.length > 1) {
          await db.facts.clear();
          if (latestTimeFact) await db.facts.add(latestTimeFact);
          for (const f of otherFacts) await db.facts.add(f);
          await loadFacts();
          isOptimizingFacts.value = false;
          return;
        }

        const prompt = `Merge duplicate facts and resolve contradictions.
        Preserve categories (Character, Item, Location, Lore).
        Keep text concise. Do not invent new facts.
        DATA: ${fData}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent?key=${apiKey.value}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1, // Keep it robotic
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
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error?.message || "Optimization failed");

        if (data.candidates && data.candidates[0].content.parts) {
          let rawText = data.candidates[0].content.parts[0].text;
          const start = rawText.indexOf("{"),
            end = rawText.lastIndexOf("}");
          const parsed = JSON.parse(rawText.substring(start, end + 1));

          if (parsed.merged_facts) {
            await db.facts.clear();

            // 3. RE-INSERTION: Add the "Time" fact back first
            if (latestTimeFact) {
              await db.facts.add({
                text: latestTimeFact.text,
                category: latestTimeFact.category,
                timestamp: Date.now(),
              });
            }

            // Then add the AI-merged facts
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
        alert("Please configure your API Key first.");
        return;
      }

      const batchSize = parseInt(summaryBatchSize.value) || 10;

      // 1. Identify candidates (Skip premise, skip existing summaries, skip last 2)
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

      const warnMsg = `This will use the Randomizer Model to compress the oldest ${batchSize} messages into a Chapter Summary. Continue?`;
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

        const prompt = `Summarize the following chronological excerpt of a story concisely into a flowing narrative paragraph.
            Focus entirely on the narrative progression and major actions.
            Write the summary strictly in the SECOND-PERSON ("You").

            STORY EXCERPT:
            ${transcript}`;

        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2, // Lower temperature for more factual summaries
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                thought_process: { type: "string" },
                summary: { type: "string" },
              },
              required: ["thought_process", "summary"],
            },
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${summarizerModel.value}:generateContent`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey.value,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error?.message || "Summarization API failed");

        let summaryText = "";

        if (data.candidates && data.candidates[0].content.parts) {
          let rawText = data.candidates[0].content.parts[0].text;

          // Safety: Handle potential backticks
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

        const lastMsgTimestamp =
          msgsToSummarize[msgsToSummarize.length - 1].timestamp;

        // Delete the 10 original messages from DB
        for (const m of msgsToSummarize) {
          await db.chats.delete(m.id);
        }

        // Add the new Summary message to DB
        await db.chats.add({
          role: "summary",
          text: summaryText,
          thought: "",
          options: null,
          timestamp: lastMsgTimestamp + 1,
        });

        // Reload UI
        messages.value = await db.chats.orderBy("timestamp").toArray();
        await updateCounts();
        scrollToBottom();
      } catch (err) {
        console.error("Summarize Error:", err);
        alert("Summarize failed with Flash model: " + err.message);
      } finally {
        isSummarizing.value = false;
      }
    };

    const updateCounts = async () => {
      try {
        const chats = await db.chats.toArray();
        const facts = await db.facts.toArray(); // <-- Fetch facts too

        const fullDb = { chats, facts }; // <-- Combine them

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
      const storedKey = localStorage.getItem("journal_api_key");
      const storedModel = localStorage.getItem("journal_model");

      if (localStorage.getItem("journal_tts_model"))
        selectedTTSModel.value = localStorage.getItem("journal_tts_model");
      if (localStorage.getItem("journal_randomizer_model")) {
        summarizerModel.value = localStorage.getItem("journal_randomizer_model");
      }
      if (localStorage.getItem("journal_tts_voice"))
        selectedVoice.value = localStorage.getItem("journal_tts_voice");
      if (localStorage.getItem("journal_tts_prosody"))
        ttsProsodyNudge.value = localStorage.getItem("journal_tts_prosody");

      if (storedKey && storedModel) {
        apiKey.value = storedKey;
        selectedModel.value = storedModel;
        isConfigured.value = true;
      }

      const storedSystemPrompt = localStorage.getItem("journal_system_prompt");
      if (storedSystemPrompt !== null) systemPrompt.value = storedSystemPrompt;

      if (localStorage.getItem("journal_summary_batch")) {
        summaryBatchSize.value = parseInt(
          localStorage.getItem("journal_summary_batch"),
        );
      }

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
      var oldRules = localStorage.getItem("journal_system_prompt") || "";
      var rulesChanged = oldRules.trim() !== systemPrompt.value.trim();

      // Save everything to localStorage
      localStorage.setItem("journal_api_key", apiKey.value);
      localStorage.setItem("journal_model", selectedModel.value);
      localStorage.setItem("journal_randomizer_model", summarizerModel.value);
      localStorage.setItem("journal_system_prompt", systemPrompt.value);
      localStorage.setItem("journal_tts_model", selectedTTSModel.value);
      localStorage.setItem("journal_tts_voice", selectedVoice.value);
      localStorage.setItem("journal_tts_prosody", ttsProsodyNudge.value);
      localStorage.setItem("journal_summary_batch", summaryBatchSize.value);

      showSettings.value = false;
      isConfigured.value = true;


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

      const firstMessage = "Welcome to your reflection space. How are you feeling today?";

      const userId = await saveToDb("user", firstMessage);

      messages.value.push({
        id: userId,
        role: "user",
        text: firstMessage,
        isHidden: true,
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
        const allFacts = await db.facts.toArray();
        const factsSummary = allFacts
          .map((f) => `- [${f.category}] ${f.text}`)
          .join("\n");

        // 1. GEMMA TRICK: Inject context directly into the first User message
        const contents = messages.value.map((msg, index) => {
          // Send summaries as 'user' role so the AI accepts the format
          let role =
            msg.role === "user" || msg.role === "summary" ? "user" : "model";
          let text = msg.text;

          // Flag it explicitly so the AI understands this is past events
          if (msg.role === "summary") {
            text = `[PREVIOUS EVENTS SUMMARY]\n${text}`;
          }

          if (index === 0) {
            text = `[INSIGHT LEDGER]
            ${factsSummary || "No facts established yet."}[END LEDGER]

            CURRENT REFLECTION: ${text}`;
          }

          return {
            role: role,
            parts: [{ text: text }],
          };
        });

        const isGemma = 0; //selectedModel.value.toLowerCase().includes("gemma");

        const payload = {
          contents,
          // Use the static core prompt
          systemInstruction: {
              parts: [{
                text: `${CORE_SYSTEM_PROMPT}\n\nUSER DIRECTIVES:\n${systemPrompt.value || "No specific directives."}`
              }]
            },
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                thought: { type: "string" },
                response: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                facts: {
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
              required: ["thought", "response", "options", "facts"],
            },
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent`;

        let data;
        let attempt = 0;
        const retryDelays = [5000, 10000, 15000, 15000, 15000];

        while (attempt <= retryDelays.length) {
          const controller = new AbortController();
          // 3. FIXED TIMEOUT: 45000 ms = 45 seconds
          const timeoutId = setTimeout(() => controller.abort(), 45000);

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
              if ((response.status === 500 || response.status === 503) && attempt < retryDelays.length) {
                console.warn(
                  `Retrying... (Attempt ${attempt + 1})`,
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
          data.usageMetadata?.totalTokenCount?.toLocaleString("en-US") || "0";

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

            if (parsed.facts && Array.isArray(parsed.facts)) {
              for (const f of parsed.facts) {
                if (f.text && f.category) {
                  await db.facts.add({
                    text: f.text,
                    category: f.category,
                    timestamp: Date.now(),
                  });
                }
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
        if (error.name === "AbortError") {
          errorMsg =
            "⏳ Request timed out. The AI took too long to respond. Please hit the ↻ retry button.";
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
      summarizerModel,
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
      newFactText,
      newFactCategory,
      addManualFact,
      isOptimizingFacts,
      optimizeFacts,
      isSummarizing,
      summarizeStory,
      summaryBatchSize,


    };
  },
}).mount("#app");

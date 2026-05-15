const { createApp, ref, onMounted, nextTick, watch } = Vue;

const CORE_SYSTEM_PROMPT = `You are a world-class, adaptive Math Tutor.
TASK: Guide the user through any mathematical concept, from basic arithmetic to advanced calculus and statistics.

ADAPTIVE PEDAGOGY:
1. Socratic Method: Don't just give answers. Ask questions that lead the student to the solution.
2. Scaffolding: Break complex problems into smaller, manageable steps.
3. Visualization: Use text-based descriptions of visual aids (e.g., "Imagine a coordinate plane...") to explain concepts.
4. Mastery Learning: Use the Grimoire to track what the user has mastered. Only move to harder topics once they demonstrate "Strength" in the current one.

STRICT VISUAL RULES:
1. UNIVERSAL LATEX: Every single mathematical expression, variable, or number-sentence MUST be wrapped in dollar signs.
   - Variables: Use $x$, not x.
   - Simple math: Use $2 + 2 = 4$, not 2 + 2 = 4.
   - Complex math: Use $\\sum_{n=1}^{\\infty}$, $\\int_{a}^{b}$, $\\sqrt{x^2+y^2}$, etc.
2. NO SLASHES: Never use "1/2". Always use "$\\frac{1}{2}$".
3. TERMINOLOGY: Use **bold** for formal math terms (e.g., **Derivative**, **Hypotenuse**, **Common Denominator**).

OUTPUT REQUIREMENTS (JSON):
1. "thought": Internal monologue. Assess user's current math level based on history. Plan the next teaching step (Theory -> Example -> Practice -> Feedback).
2. "response": The primary teaching content. Use LaTeX for ALL math.
3. "options": 3 interactive buttons. Mix of: Numerical answers, conceptual questions, or "Show me a step-by-step example."
4. "facts": Update the student's profile.
   - Category "Lore": Current Topic (e.g., "Topic: Quadratic Equations").
   - Category "Character": Student's specific struggles (e.g., "Struggles with negative exponents").
   - Category "Item": Mathematical tools introduced (e.g., "Tool: The Quadratic Formula").

STRICT MATH SYNTAX (FOR JSON SAFETY):
1. Use DOUBLE BACKSLASHES for all LaTeX commands so they survive JSON parsing.
   - Correct: "$\\ \\frac{1}{2}$"
   - Correct: "$\\ \\sqrt{x}$"
2. The "Form Feed" Fix: Never let the sequence "\\f" appear in your raw output. Always output as "\\\\f".
`;

const db = new Dexie("FractionChatDB");
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
    const randomizerModel = ref("gemma-4-31b-it");
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
    const isGeneratingRules = ref(false);
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

    const randomizeRules = async () => {
      if (!apiKey.value) {
        alert("Please enter your API Key first.");
        return;
      }

      isGeneratingRules.value = true;

      // 1. Create the controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const p = `Act as an innovative Educational Game Designer.
        TASK: Create a high-concept "Math Adventure" premise where the user must learn math to succeed in a strange world.

        In your 'thought' field:
        - Brainstorm 3 weird, unrelated scenarios where math is a "power" (e.g., Potion-making ratios, Space-flight geometry, Ancient pyramid structural logic).
        - Pick the most creative one.

        In your 'premise' field:
        - Write a 1-paragraph "World Rule" (Max 80 words).
        - Describe the user's role and WHY they need math (e.g., "You are a Cyber-Navigator. To jump through hyperspace, you must calculate precise fractions of light-speed. If your ratios are off, you'll end up in a black hole.").
        - Keep the tone atmospheric but educational.
        - Do NOT mention specific math problems yet, just the theme.`;

        const payload = {
          contents: [{ role: "user", parts: [{ text: p }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                thought: {
                  type: "string",
                  description:
                    "Internal brainstorming. Explore 3 wild, unrelated genres and combine them.",
                },
                premise: { type: "string" },
              },
              required: ["thought", "premise"],
            },
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${randomizerModel.value}:generateContent`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey.value,
          },
          body: JSON.stringify(payload),
          signal: controller.signal, // 2. Pass the signal to fetch
        });

        // 3. Clear the timeout since the request finished
        clearTimeout(timeoutId);

        const data = await res.json();

        if (!res.ok)
          throw new Error(data.error?.message || "API request failed");

        if (data.candidates && data.candidates[0].content.parts) {
          let rawText = data.candidates[0].content.parts[0].text;

          // Safety: Strip markdown backticks if the model ignores the MimeType instruction
          const start = rawText.indexOf("{");
          const end = rawText.lastIndexOf("}");
          if (start !== -1 && end !== -1) {
            rawText = rawText.substring(start, end + 1);
          }

          const parsedData = JSON.parse(rawText);
          if (parsedData.premise) {
            systemPrompt.value = parsedData.premise.trim();
          }
        }
      } catch (err) {
        // 4. Handle specifically the timeout/abort error
        if (err.name === "AbortError") {
          console.error("Randomizer timed out.");
          alert(
            "The request timed out. The AI is taking too long to think—try again!",
          );
        } else {
          console.error("Error generating rules:", err);
          alert("Randomizer failed: " + err.message);
        }
      } finally {
        isGeneratingRules.value = false;
        clearTimeout(timeoutId); // Final safety clear
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

    const renderMarkdown = (text) => {
      if (!text) return "";

      // 1. FIX: Restore "frac" if it was turned into a Form Feed (\f)
      let sanitized = text.replace(/\x0c/g, "\\f");

      const processedText = sanitized.replace(
        /\$(.*?)\$/g,
        (match, formula) => {
          try {
            let cleanFormula = formula;

            // 2. SAFETY NET: If the AI sent "rac" instead of "\frac", fix it
            // This catches "rac{1}{2}" and turns it into "\frac{1}{2}"
            if (
              cleanFormula.includes("rac{") &&
              !cleanFormula.includes("\\frac{")
            ) {
              cleanFormula = cleanFormula.replace(/rac\{/g, "\\frac{");
            }

            return katex.renderToString(cleanFormula, { throwOnError: false });
          } catch (e) {
            return match;
          }
        },
      );
      return marked.parse(processedText);
    };

    const renderInlineMath = (text) => {
      if (!text) return "";

      // Same fix for the buttons
      let sanitized = text.replace(/\x0c/g, "\\f");

      return sanitized.replace(/\$(.*?)\$/g, (match, formula) => {
        try {
          let cleanFormula = formula;

          // SAFETY NET: Fix "rac" in buttons too
          if (
            cleanFormula.includes("rac{") &&
            !cleanFormula.includes("\\frac{")
          ) {
            cleanFormula = cleanFormula.replace(/rac\{/g, "\\frac{");
          }

          return katex.renderToString(cleanFormula, {
            displayMode: false,
            throwOnError: false,
          });
        } catch (e) {
          return match;
        }
      });
    };

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

        // Using randomizerModel (Gemini Flash) which supports strict responseSchema
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

        // TARGET: randomizerModel.value (Gemini Flash)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${randomizerModel.value}:generateContent`;

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
      const storedKey = localStorage.getItem("fractionchat_api_key");
      const storedModel = localStorage.getItem("fractionchat_model");

      if (localStorage.getItem("fractionchat_tts_model"))
        selectedTTSModel.value = localStorage.getItem("fractionchat_tts_model");
      if (localStorage.getItem("fractionchat_randomizer_model")) {
        randomizerModel.value = localStorage.getItem(
          "fractionchat_randomizer_model",
        );
      }
      if (localStorage.getItem("fractionchat_tts_voice"))
        selectedVoice.value = localStorage.getItem("fractionchat_tts_voice");
      if (localStorage.getItem("fractionchat_tts_prosody"))
        ttsProsodyNudge.value = localStorage.getItem(
          "fractionchat_tts_prosody",
        );

      if (storedKey && storedModel) {
        apiKey.value = storedKey;
        selectedModel.value = storedModel;
        isConfigured.value = true;
      }

      const storedSystemPrompt = localStorage.getItem(
        "fractionchat_system_prompt",
      );
      if (storedSystemPrompt !== null) systemPrompt.value = storedSystemPrompt;

      if (localStorage.getItem("fractionchat_summary_batch")) {
        summaryBatchSize.value = parseInt(
          localStorage.getItem("fractionchat_summary_batch"),
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
      var oldRules = localStorage.getItem("fractionchat_system_prompt") || "";
      var rulesChanged = oldRules.trim() !== systemPrompt.value.trim();

      // Save everything to localStorage
      localStorage.setItem("fractionchat_api_key", apiKey.value);
      localStorage.setItem("fractionchat_model", selectedModel.value);
      localStorage.setItem(
        "fractionchaty_randomizer_model",
        randomizerModel.value,
      );
      localStorage.setItem("fractionchat_system_prompt", systemPrompt.value);
      localStorage.setItem("fractionchat_tts_model", selectedTTSModel.value);
      localStorage.setItem("fractionchat_tts_voice", selectedVoice.value);
      localStorage.setItem("fractionchat_tts_prosody", ttsProsodyNudge.value);
      localStorage.setItem(
        "fractionchat_summary_batch",
        summaryBatchSize.value,
      );

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

      // Use the Premise as the first message.
      // If it's empty, use a default fallback.
      const firstMessage =
        systemPrompt.value.trim() ||
        "The story begins in a mysterious world of fractions...";

      const userId = await saveToDb("user", firstMessage);

      messages.value.push({
        id: userId,
        role: "user",
        text: firstMessage,
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
            text = `[STORY GRIMOIRE]
            ${factsSummary || "No facts established yet."}[END GRIMOIRE]

            STORY PREMISE: ${text}`;
          }

          return {
            role: role,
            parts: [{ text: text }],
          };
        });

        const isGemma = selectedModel.value.toLowerCase().includes("gemma");

        const payload = {
          contents,
          // Use the static core prompt
          systemInstruction: { parts: [{ text: CORE_SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            // Only include responseSchema if NOT a Gemma model
            ...(!isGemma && {
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
            }),
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent`;

        let data;
        let attempt = 0;
        const retryDelays = [5000, 10000, 15000];

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
              if (response.status === 500 && attempt < retryDelays.length) {
                console.warn(
                  `API 500 Error. Retrying... (Attempt ${attempt + 1})`,
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
      randomizerModel,
      isConfigured,
      renderInlineMath,
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
      isGeneratingRules,
      randomizeRules,
    };
  },
}).mount("#app");

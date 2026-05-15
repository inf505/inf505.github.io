const { createApp, ref, onMounted, nextTick, watch } = Vue;

const CORE_SYSTEM_PROMPT = `You are a patient, Socratic Math Tutor. Wrap every number, variable, and fraction in dollar signs ($).

PEDAGOGY & OPTIONS RULES:
1. THOUGHT PROCESS: Use the "thought" field to act as a teacher. Diagnose the student's current understanding, identify potential mistakes, and plan your next specific question.
2. ONE STEP AT A TIME: End your "response" with exactly ONE clear question. Never lecture for too long.
3. OPTIONS DESIGN: Always provide up to 4 options. They MUST include:
   - The correct answer.
   - 1 or 2 common math misconceptions or distractors (e.g., adding denominators instead of finding a common one).
   - A safe "I don't know / Can you explain?" option.

STRICT VISUAL RULES:
1. UNIVERSAL LATEX: Use $5$ or $\\frac{1}{2}$ for everything.
2. BOLD: Use **bold** for key math terms.

ONE-SHOT EXAMPLE:
{
  "thought": "The student is learning fraction anatomy. I will ask them to identify the denominator. If they pick 3, they confused it with the numerator. If they pick 11, they added them.",
  "response": "If a pizza has $8$ slices and you eat $3$, you ate $\\frac{3}{8}$ of the pizza. \\n\\nLooking at $\\frac{3}{8}$, which number is the **Denominator**?",
  "options": ["$8$", "$3$", "$11$", "I don't know what a denominator is."],
  "facts": [{"text": "Topic: Intro to Fractions", "category": "Lore"}]
}

REQUIREMENTS:
- Return JSON.
- Use double-backslashes for LaTeX: \\\\frac{1}{2}.`;

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
    //const randomizerModel = ref("gemma-4-31b-it");
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
    //const isGeneratingRules = ref(false);
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
        newFactText.value = "";
        await loadFacts();
      } catch (err) {
        console.error("Error adding manual fact:", err);
      }
    };

    // const randomizeRules = async () => {
    //   if (!apiKey.value) {
    //     alert("Please enter your API Key first.");
    //     return;
    //   }

    //   isGeneratingRules.value = true;
    //   const controller = new AbortController();
    //   const timeoutId = setTimeout(() => controller.abort(), 45000);

    //   try {
    //     const p = `Act as an innovative Educational Game Designer.
    //     TASK: Create a high-concept "Math Adventure" premise where the user must learn math to succeed in a strange world.

    //     In your 'thought' field:
    //     - Brainstorm 3 weird, unrelated scenarios where math is a "power".
    //     - Pick the most creative one.

    //     In your 'premise' field:
    //     - Write a 1-paragraph "World Rule" (Max 80 words).
    //     - Describe the user's role and WHY they need math.
    //     - Keep the tone atmospheric but educational.
    //     - Do NOT mention specific math problems yet, just the theme.`;

    //     const payload = {
    //       contents: [{ role: "user", parts: [{ text: p }] }],
    //       generationConfig: {
    //         responseMimeType: "application/json",
    //         responseSchema: {
    //           type: "object",
    //           properties: {
    //             thought: { type: "string" },
    //             premise: { type: "string" },
    //           },
    //           required: ["thought", "premise"],
    //         },
    //       },
    //     };

    //     const url = `https://generativelanguage.googleapis.com/v1beta/models/${randomizerModel.value}:generateContent`;

    //     const res = await fetch(url, {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json",
    //         "x-goog-api-key": apiKey.value,
    //       },
    //       body: JSON.stringify(payload),
    //       signal: controller.signal,
    //     });

    //     clearTimeout(timeoutId);
    //     const data = await res.json();

    //     if (!res.ok)
    //       throw new Error(data.error?.message || "API request failed");

    //     if (data.candidates && data.candidates[0].content.parts) {
    //       let rawText = data.candidates[0].content.parts[0].text;
    //       const start = rawText.indexOf("{");
    //       const end = rawText.lastIndexOf("}");
    //       if (start !== -1 && end !== -1) {
    //         rawText = rawText.substring(start, end + 1);
    //       }
    //       const parsedData = JSON.parse(rawText);
    //       if (parsedData.premise) {
    //         systemPrompt.value = parsedData.premise.trim();
    //       }
    //     }
    //   } catch (err) {
    //     if (err.name === "AbortError")
    //       alert(
    //         "The request timed out. The AI is taking too long to think—try again!",
    //       );
    //     else alert("Randomizer failed: " + err.message);
    //   } finally {
    //     isGeneratingRules.value = false;
    //     clearTimeout(timeoutId);
    //   }
    // };

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
        const fData = otherFacts
          .map((f) => `[${f.category}] ${f.text}`)
          .join(" | ");

        if (otherFacts.length < 2 && timeFacts.length > 1) {
          await db.facts.clear();
          if (latestTimeFact) await db.facts.add(latestTimeFact);
          for (const f of otherFacts) await db.facts.add(f);
          await loadFacts();
          isOptimizingFacts.value = false;
          return;
        }

        const prompt = `Merge duplicate facts and resolve contradictions. Keep text concise. Do not invent new facts. DATA: ${fData}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent?key=${apiKey.value}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
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
            if (latestTimeFact)
              await db.facts.add({
                text: latestTimeFact.text,
                category: latestTimeFact.category,
                timestamp: Date.now(),
              });
            for (const mf of parsed.merged_facts)
              await db.facts.add({
                text: mf.text,
                category: mf.category,
                timestamp: Date.now(),
              });
            await loadFacts();
          }
        }
      } catch (err) {
        console.error("Optimization Error:", err);
      } finally {
        isOptimizingFacts.value = false;
      }
    };

    // --- THE MASTER JANITOR ---
    const renderMarkdown = (text) => {
      if (!text) return "";

      // 1. Reverse JSON control character mutations globally
      let content = text
        .replace(/\x0c/g, "\\f") // Form Feed -> \f (Fixes \frac)
        .replace(/\t/g, "\\t") // Tab -> \t (Fixes \times, \tan, \theta)
        .replace(/\x08/g, "\\b") // Backspace -> \b (Fixes \beta, \binom)
        .replace(/\x0b/g, "\\v"); // Vertical Tab -> \v (Fixes \vec)

      const processedText = content.replace(/\$(.*?)\$/g, (match, formula) => {
        try {
          let clean = formula.replace(/(^|[^a-zA-Z])\\*f?rac/g, "$1\\frac");
          clean = clean.replace(
            /\\frac\s*([a-zA-Z0-9])\s*([a-zA-Z0-9])/g,
            "\\frac{$1}{$2}",
          );

          return katex.renderToString(clean.trim(), { throwOnError: false });
        } catch (e) {
          return match;
        }
      });

      return marked.parse(processedText);
    };

    const renderInlineMath = (text) => {
      if (!text) return "";

      let content = text
        .replace(/\x0c/g, "\\f")
        .replace(/\t/g, "\\t")
        .replace(/\x08/g, "\\b")
        .replace(/\x0b/g, "\\v");

      const processedText = content.replace(/\$(.*?)\$/g, (match, formula) => {
        try {
          let clean = formula.replace(/(^|[^a-zA-Z])\\*f?rac/g, "$1\\frac");
          clean = clean.replace(
            /\\frac\s*([a-zA-Z0-9])\s*([a-zA-Z0-9])/g,
            "\\frac{$1}{$2}",
          );

          return katex.renderToString(clean.trim(), {
            displayMode: false,
            throwOnError: false,
          });
        } catch (e) {
          return match;
        }
      });

      let html = marked.parse(processedText);
      return html.replace(/^<p>/i, "").replace(/<\/p>\n?$/i, "");
    };

    const summarizeStory = async () => {
      if (!apiKey.value) {
        alert("Please configure your API Key first.");
        return;
      }

      const batchSize = parseInt(summaryBatchSize.value) || 10;
      const latestIds = messages.value.slice(-2).map((m) => m.id);
      const candidates = messages.value.filter(
        (m, i) => i !== 0 && m.role !== "summary" && !latestIds.includes(m.id),
      );

      if (candidates.length < batchSize) {
        alert(
          `Not enough unsummarized messages. You requested ${batchSize}, but only have ${candidates.length} available.`,
        );
        return;
      }

      if (
        !confirm(
          `This will compress the oldest ${batchSize} messages into a Chapter Summary. Continue?`,
        )
      )
        return;

      isSummarizing.value = true;

      try {
        const msgsToSummarize = candidates.slice(0, batchSize);
        const transcript = msgsToSummarize
          .map((m) => {
            let text = m.text;
            if (m.role === "model" && m.options && m.options.length > 0)
              text += `\n(Options chosen: ${m.options.join(", ")})`;
            return `${m.role === "user" ? "USER" : "STORYTELLER"}: ${text}`;
          })
          .join("\n\n");

        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Summarize the following chronological excerpt of a story concisely into a flowing narrative paragraph.\nFocus entirely on the narrative progression and major actions.\nWrite strictly in the SECOND-PERSON ("You").\n\nSTORY EXCERPT:\n${transcript}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
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

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${randomizerModel.value}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey.value,
            },
            body: JSON.stringify(payload),
          },
        );

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error?.message || "Summarization API failed");

        let summaryText = "";
        if (data.candidates && data.candidates[0].content.parts) {
          let rawText = data.candidates[0].content.parts[0].text;
          const start = rawText.indexOf("{"),
            end = rawText.lastIndexOf("}");
          if (start !== -1 && end !== -1)
            rawText = rawText.substring(start, end + 1);
          const parsed = JSON.parse(rawText);
          if (parsed.summary) summaryText = parsed.summary.trim();
        }

        if (!summaryText) throw new Error("Received empty summary from AI.");

        const lastMsgTimestamp =
          msgsToSummarize[msgsToSummarize.length - 1].timestamp;
        for (const m of msgsToSummarize) await db.chats.delete(m.id);

        await db.chats.add({
          role: "summary",
          text: summaryText,
          thought: "",
          options: null,
          timestamp: lastMsgTimestamp + 1,
        });

        messages.value = await db.chats.orderBy("timestamp").toArray();
        await updateCounts();
        scrollToBottom();
      } catch (err) {
        alert("Summarize failed: " + err.message);
      } finally {
        isSummarizing.value = false;
      }
    };

    const updateCounts = async () => {
      try {
        const chats = await db.chats.toArray();
        const facts = await db.facts.toArray();
        const bytes = new TextEncoder().encode(
          JSON.stringify({ chats, facts }),
        ).length;
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

    watch(currentInput, () => nextTick(adjustHeight));

    onMounted(async () => {
      if (localStorage.getItem("fractionchat_api_key"))
        apiKey.value = localStorage.getItem("fractionchat_api_key");
      if (localStorage.getItem("fractionchat_model"))
        selectedModel.value = localStorage.getItem("fractionchat_model");
      if (localStorage.getItem("fractionchat_tts_model"))
        selectedTTSModel.value = localStorage.getItem("fractionchat_tts_model");
      if (localStorage.getItem("fractionchat_randomizer_model"))
        randomizerModel.value = localStorage.getItem(
          "fractionchat_randomizer_model",
        );
      if (localStorage.getItem("fractionchat_tts_voice"))
        selectedVoice.value = localStorage.getItem("fractionchat_tts_voice");
      if (localStorage.getItem("fractionchat_tts_prosody"))
        ttsProsodyNudge.value = localStorage.getItem(
          "fractionchat_tts_prosody",
        );
      if (localStorage.getItem("fractionchat_system_prompt"))
        systemPrompt.value = localStorage.getItem("fractionchat_system_prompt");
      if (localStorage.getItem("fractionchat_summary_batch"))
        summaryBatchSize.value = parseInt(
          localStorage.getItem("fractionchat_summary_batch"),
        );

      if (apiKey.value && selectedModel.value) isConfigured.value = true;

      try {
        messages.value = await db.chats.orderBy("timestamp").toArray();
        scrollToBottom();
        if (messages.value.length === 0) {
          if (apiKey.value) initializeStory();
          else showSettings.value = true;
        }
      } catch (err) {
        console.error("Dexie Chats Load Error:", err);
      }

      await updateCounts();

      const handleResize = () => {
        const h = window.visualViewport
          ? window.visualViewport.height
          : window.innerHeight;
        document.documentElement.style.setProperty("--app-height", `${h}px`);
        document.body.style.height = `${h}px`;
        scrollToBottom();
      };
      if (window.visualViewport)
        window.visualViewport.addEventListener("resize", handleResize);
      else window.addEventListener("resize", handleResize);
      handleResize();

      await loadFacts();
    });

    const saveAllSettings = () => {
      const oldRules = localStorage.getItem("fractionchat_system_prompt") || "";
      const rulesChanged = oldRules.trim() !== systemPrompt.value.trim();

      localStorage.setItem("fractionchat_api_key", apiKey.value);
      localStorage.setItem("fractionchat_model", selectedModel.value);
      localStorage.setItem(
        "fractionchat_randomizer_model",
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

      if (messages.value.length === 0 && apiKey.value) {
        initializeStory();
      } else if (rulesChanged && messages.value.length > 0) {
        if (
          confirm(
            "Rules updated! Would you like to restart the story now to apply these changes?",
          )
        ) {
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
      if (
        !confirm(
          "Are you sure? This will permanently delete the story AND all remembered facts in the Grimoire.",
        )
      )
        return;
      await db.chats.clear();
      await db.facts.clear();
      messages.value = [];
      facts.value = [];
      await updateCounts();

      if (apiKey.value) initializeStory();
      else showSettings.value = true;
    };

    const initializeStory = async () => {
      if (isLoading.value) return;
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
        for (let i = 0; i < string.length; i++)
          view.setUint8(offset + i, string.charCodeAt(i));
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
      for (let i = 0; i < headerBytes.length; i++)
        headerString += String.fromCharCode(headerBytes[i]);
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
                prebuiltVoiceConfig: { voiceName: selectedVoice.value },
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
          msg.audioData = addWavHeader(base64Audio);
          scrollToBottom();
        }
      } catch (err) {
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

        const contents = messages.value.map((msg, index) => {
          let role =
            msg.role === "user" || msg.role === "summary" ? "user" : "model";
          let text = msg.text;
          if (msg.role === "summary")
            text = `[PREVIOUS EVENTS SUMMARY]\n${text}`;
          if (index === 0)
            text = `[STORY GRIMOIRE]\n${factsSummary || "No facts established yet."}[END GRIMOIRE]\n\nSTORY PREMISE: ${text}`;
          return { role: role, parts: [{ text: text }] };
        });

        const isGemma = selectedModel.value.toLowerCase().includes("gemma");

        const payload = {
          contents,
          systemInstruction: { parts: [{ text: CORE_SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
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
            if (part.thought) thoughtText += (part.text || "") + "\n\n";
            else if (part.text) {
              let text = part.text.replace(
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
          let jsonString = "";

          // 1. Try to extract JSON from markdown code blocks (e.g., ```json ... ```)
          const codeBlockMatch = finalResponse.match(
            /```(?:json)?\s*([\s\S]*?)```/i,
          );

          if (codeBlockMatch) {
            jsonString = codeBlockMatch[1].trim();
          } else {
            // 2. Look for the true start of the JSON object, ignoring LaTeX math braces
            const startMatch = finalResponse.match(
              /\{\s*"(?:thought|response|options|facts)"/i,
            );
            if (startMatch) {
              const startIndex = startMatch.index;
              const endIndex = finalResponse.lastIndexOf("}");
              if (startIndex !== -1 && endIndex !== -1) {
                jsonString = finalResponse.substring(startIndex, endIndex + 1);
              }
            }
          }

          if (jsonString) {
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
          console.error("JSON Parse error:", e, "\nRaw String:", finalResponse);
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
        if (error.name === "AbortError")
          errorMsg =
            "⏳ Request timed out. The AI took too long to respond. Please hit the ↻ retry button.";
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
      //randomizerModel,
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
      //randomizeRules,
    };
  },
}).mount("#app");

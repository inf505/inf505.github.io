const { createApp, ref, onMounted, nextTick, watch } = Vue;

const CORE_SYSTEM_PROMPT = `You are a patient, Socratic Math Tutor. Wrap every number, variable, and fraction in dollar signs ($).

PEDAGOGY & OPTIONS RULES:
1. THOUGHT PROCESS: Use the "thought" field for a brief (MAX 2 sentences) teacher's diagnosis. Identify the student's current logic and your goal. Do NOT pre-write the response or options here.
2. ONE STEP AT A TIME: End your "response" with exactly ONE clear question. Never lecture for too long.
3. OPTIONS DESIGN: Always provide up to 4 options. They MUST include:
   - The correct answer (make sure this is in a random location, not always first).
   - 1 or 2 common math misconceptions or distractors (e.g., adding denominators instead of finding a common one).
   - A safe "I don't know / Can you explain?" option.

STRICT VISUAL RULES:
1. UNIVERSAL LATEX: Use $5$ or $\\\\frac{1}{2}$ for everything.
  - Use \\\\div for the division symbol (÷). NEVER use \\\\dividedby or \\\\bdiv.
  - Use \\\\times for multiplication (×).
  - For Long Division, use the format: \\\\longdiv{dividend}{divisor}
    Example: To show 125 divided by 5, write $\\\\longdiv{125}{5}$.
  - NEVER write \\\\longdiv without braces {}.
  - Use \\\\% for percentages (e.g., $50\\\\%$).
  - NEVER use the $ symbol for currency. Write out the word "dollars" instead (e.g., $5$ dollars). The $ symbol is strictly reserved for math.
2. PERCENTAGES: Use \\\\% for percentages (e.g., $37.5\\\\%$). Every percentage must be wrapped in dollar signs.
3. BOLD: Use **bold** for key math terms.

ONE-SHOT EXAMPLE:
{
  "thought": "The student is converting fractions to percentages. I will ask them to convert 3/8.",
  "response": "To find the percentage of $\\\\frac{3}{8}$, we divide $3$ by $8$ to get $0.375$. What is $0.375$ as a **Percentage**?",
  "options": ["$37.\\\\%$", "$3.75\\\\%$", "$375\\\\%$", "I don't know how to move the decimal."],
  "facts": [{"text": "Topic: Conversions", "category": "Concept"}]
}

MANDATORY JSON SCHEMA:
{
  "thought": "Concise strategy (Max 2 sentences)",
  "response": "Socratic message + question",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "facts": [{"text": "Brief fact", "category": "Concept"}]
}

Return ONLY JSON.`;

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
    const selectedTTSModel = ref("gemini-3.1-flash-tts-preview");
    const selectedVoice = ref("Aoede");
    const ttsProsodyNudge = ref(
      "Read the following text like a professional audiobook narrator. Tone: Expressive, engaging, and atmospheric.",
    );
    const newFactText = ref("");
    const newFactCategory = ref("Concept");
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

    const renderMarkdown = (text) => {
      if (!text) return "";

      // 1. AUTO-WRAPPER: Find raw LaTeX environments and wrap them in $
      // This fixes the error in your screenshot (missing delimiters)
      let content = text.replace(
        /\\begin\{(\w+)\}[\s\S]*?\\end\{\1\}/g,
        (match) => {
          return match.startsWith("$") ? match : `$${match}$`;
        },
      );

      // 2. The standard character cleanup
      content = content
        .replace(/\x0c/g, "\\f")
        .replace(/\t/g, "\\t")
        .replace(/\x08/g, "\\b")
        .replace(/\x0b/g, "\\v");

      const mathPlaceholders = [];

      // 3. VAULTING: This now catches the auto-wrapped math!
      const processedText = content.replace(/\$(.*?)\$/g, (match, formula) => {
        const index = mathPlaceholders.length;
        mathPlaceholders.push(formula);
        return `@@MATH_${index}@@`;
      });

      let html = marked.parse(processedText);

      // 4. UN-VAULTING & HEALING
      html = html.replace(/@@MATH_(\d+)@@/g, (match, index) => {
        const formula = mathPlaceholders[index];
        try {
          // Surgical Healer (Halve backslashes)
          let clean = formula.replace(/\\\\/g, "\\");

          clean = clean.replace(/(^|[^a-zA-Z])\\*f?rac/g, "$1\\frac");
          clean = clean.replace(
            /(^|[^a-zA-Z])\\*(dividedby|divided|bdiv|div)/g,
            "$1\\div ",
          );
          clean = clean.replace(
            /\\longdiv\s*\{?(\d+)\}?\s*\{?(\d+)\}?/g,
            (match, dividend, divisor) => {
              // This turns it into: divisor | dividend (with a line over it)
              return `${divisor}\\overline{\\smash{)} ${dividend}}`;
            },
          );

          // 2. Also catch the word variations just in case
          clean = clean.replace(
            /(^|[^a-zA-Z])\\*(longdivision|ldiv)/g,
            "$1\\longdiv",
          );
          clean = clean.replace(/(^|[^a-zA-Z])\\*times/g, "$1\\times");
          clean = clean.replace(/(^|[^a-zA-Z])\\*sqrt/g, "$1\\sqrt");
          clean = clean.replace(/(^|[^a-zA-Z])\\*pi/g, "$1\\pi");
          clean = clean.replace(/(^|[^a-zA-Z])\\*theta/g, "$1\\theta");
          clean = clean.replace(/(^|[^a-zA-Z])\\*begin/g, "$1\\begin");
          clean = clean.replace(/(^|[^a-zA-Z])\\*end/g, "$1\\end");
          clean = clean.replace(/\\*%+/g, "\\%");

          // Smart Display Mode (Centered newline for big math)
          const isBlock = formula.includes("\\\\") || formula.includes("begin");

          return katex.renderToString(clean.trim(), {
            displayMode: isBlock,
            throwOnError: false,
            strict: false,
          });
        } catch (e) {
          return `$${formula}$`;
        }
      });

      return html;
    };

    const renderInlineMath = (text) => {
      if (!text) return "";

      // Added auto-wrapper here too for safety
      let content = text.replace(
        /\\begin\{(\w+)\}[\s\S]*?\\end\{\1\}/g,
        (match) => {
          return match.startsWith("$") ? match : `$${match}$`;
        },
      );

      const mathPlaceholders = [];
      const processedText = content.replace(/\$(.*?)\$/g, (match, formula) => {
        const index = mathPlaceholders.length;
        mathPlaceholders.push(formula);
        return `@@MATH_${index}@@`;
      });

      let html = marked.parse(processedText);
      html = html.replace(/^<p>/i, "").replace(/<\/p>\n?$/i, "");

      html = html.replace(/@@MATH_(\d+)@@/g, (match, index) => {
        const formula = mathPlaceholders[index];
        try {
          let clean = formula.replace(/\\\\/g, "\\");
          clean = clean.replace(/(^|[^a-zA-Z])\\*f?rac/g, "$1\\frac");
          clean = clean.replace(
            /(^|[^a-zA-Z])\\*(dividedby|divided|bdiv|div)/g,
            "$1\\div ",
          );
          clean = clean.replace(
            /\\longdiv\s*\{?(\d+)\}?\s*\{?(\d+)\}?/g,
            (match, dividend, divisor) => {
              // This turns it into: divisor | dividend (with a line over it)
              return `${divisor}\\overline{\\smash{)} ${dividend}}`;
            },
          );

          // 2. Also catch the word variations just in case
          clean = clean.replace(
            /(^|[^a-zA-Z])\\*(longdivision|ldiv)/g,
            "$1\\longdiv",
          );
          clean = clean.replace(/(^|[^a-zA-Z])\\*times/g, "$1\\times");
          clean = clean.replace(/(^|[^a-zA-Z])\\*sqrt/g, "$1\\sqrt");
          clean = clean.replace(/(^|[^a-zA-Z])\\*pi/g, "$1\\pi");
          clean = clean.replace(/(^|[^a-zA-Z])\\*theta/g, "$1\\theta");
          clean = clean.replace(/(^|[^a-zA-Z])\\*begin/g, "$1\\begin");
          clean = clean.replace(/(^|[^a-zA-Z])\\*end/g, "$1\\end");
          clean = clean.replace(/\\*%+/g, "\\%");
          clean = clean.replace(
            /\\frac\s*([a-zA-Z0-9])\s*([a-zA-Z0-9])/g,
            "\\frac{$1}{$2}",
          );

          return katex.renderToString(clean.trim(), {
            displayMode: false, // Buttons should never be "Block"
            throwOnError: false,
            strict: false,
          });
        } catch (e) {
          return `$${formula}$`;
        }
      });
      return html;
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
          `This will compress the oldest ${batchSize} messages into a Summary. Continue?`,
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
                  text: `Summarize the following chronological excerpt of a math tutoring session into a single, concise progress paragraph.
                  Focus on:
                  1. What mathematical concepts were introduced.
                  2. Specific mistakes or misconceptions the student had.
                  3. What the student eventually mastered.
                  Write strictly in the THIRD-PERSON (e.g., "The student practiced...").

                  TUTORING EXCERPT:
                  ${transcript}`,
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
      // localStorage.setItem(
      //   "fractionchat_randomizer_model",
      //   randomizerModel.value,
      // );
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
        "Welcome to your Math Chat! What math topic would you like to explore today?";
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
            text = `[PREVIOUS PROGRESS REPORT]\n${text}`;
          if (index === 0)
            text = `[STUDENT KNOWLEDGE BASE]\n${factsSummary || "No facts established yet."}\n[END KNOWLEDGE BASE]\n\nCURRENT MATH TOPIC: ${text}`;
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
            let sanitized = jsonString
              .replace(/\x0c/g, "\\\\f")
              .replace(/\x0b/g, "\\\\v")
              .replace(/\t/g, "\\\\t")
              .replace(/\\/g, "\\\\")
              .replace(/\\\\n/g, "\\n")
              .replace(/\\\\"/g, '\\"');

            const parsed = JSON.parse(sanitized);

            thoughtText =
              parsed.thought ||
              parsed.thought_process ||
              parsed.diagnosis ||
              "";

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
    };
  },
}).mount("#app");

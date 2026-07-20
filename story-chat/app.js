const { createApp, ref, onMounted, nextTick, watch } = Vue;

const CORE_SYSTEM_PROMPT = `You are a creative and collaborative storytelling partner.
TASK: Work with the user to write an engaging story.

PERSPECTIVE:
- Write exclusively in the SECOND-PERSON ("You").
- The user is the protagonist.
- Maintain a natural progression of time; describe atmospheric, sensory, and lighting shifts as the day moves forward.

WRITING STYLE:
- Direct Description: Focus on direct, positive descriptions of actions. Describe only what is currently happening, being felt, or being done.
- STRICT CONTRAST BAN: Never use comparative rhetorical reframes to contrast the protagonist's actions or mindset.
  * FORBIDDEN: "You aren't just [Action A]; you are [Action B]" or "It is not [A], but [B]."
  * REWRITE EXAMPLE: Instead of writing "You aren't just waiting; you are preparing," write "You prepare for..."

OUTPUT REQUIREMENTS:
Return a single JSON object.
- "thought":
   - Check the Grimoire for existing facts, current inventory, and the current time.
   - Briefly plan how the next scene progresses the timeline.
   - Brainstorm 3 distinct, non-trivial paths the user could take next. Note how it would uniquely shift the story state or reveal different details.
- "response": The story text.
- "options": Array of 3 distinct action choices. (Keep these option sentences brief)
- "facts": An array of objects (text, category).
   - TIME TRACKING: Always include exactly one "Lore" fact starting with "Time:" that tracks the current day of the week, time of day, and the current season (e.g., "Time: Monday, Early Morning, Late Autumn"). Update the time, day, or season naturally based on actions taken (e.g., long tasks should advance the time; many actions can shift the day or season).
   - CATEGORIES: Infrastructure, Character, Item, Location, Lore.

You MUST return a single JSON object matching that exact structure. Do not include extra conversational text outside of the JSON payload.

CRITICAL STRUCTURAL RULES:
1. The "response" field must contain ONLY standard, natural narrative text or markdown prose.
2. DO NOT embed, escape, or serialize any JSON objects, JSON strings, or array representations inside the "response" or "thought" fields.
3. Never use markdown code fences (like \`json ... \`) inside a JSON string property.`;

const db = new Dexie("StoryWriterDB");
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
    const isGeneratingRules = ref(false);
    const ttsProvider = ref("gemini");
    const geminiApiKey = ref("");
    const selectedTTSModel = ref("gemini-3.1-flash-tts-preview");
    const selectedVoice = ref("Aoede");
    const ttsProsodyNudge = ref(
      "Read the following text like a professional audiobook narrator. Tone: Expressive, engaging, and atmospheric.",
    );
    const newFactText = ref("");
    const newFactCategory = ref("Lore");
    const facts = ref([]);
    const summaryBatchSize = ref(10);
    const editingMsgId = ref(null);
    const editingMsgText = ref("");
    const archivedSummaries = ref([]);
    const superSummaryBatchSize = ref(5);
    const isSuperSummarizing = ref(false);

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

    const randomizeRules = async () => {
      if (!apiKey.value) {
        alert("Please enter your API Key first.");
        return;
      }

      isGeneratingRules.value = true;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const p = `Act as a professional high-concept screenwriter.
In your 'thought' field, brainstorm three completely different, weird settings (e.g., biopunk, post-apocalyptic jazz age, sentient nebula).
Pick the most unusual one and develop a mystery around it. Then, in 'premise', provide the final story description.
- Do not name the protagonist; describe them only by their current situation or role (e.g., 'You are a survivor', 'You are the last keeper').
STRICT LIMIT: One paragraph, maximum 80 words.

You MUST return a valid JSON object matching this schema structure:
{
  "thought": "Internal brainstorming. Explore 3 wild, unrelated genres and combine them.",
  "premise": "the final story description"
}`;

        const payload = {
          model: selectedModel.value,
          messages: [{ role: "user", content: p }],
          response_format: { type: "json_object" }
        };

        const url = `${baseUrl.value.replace(/\/$/, "")}/chat/completions`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.value}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await res.json();

        if (!res.ok)
          throw new Error(data.error?.message || "API request failed");

        if (data.choices && data.choices[0] && data.choices[0].message) {
          let rawText = data.choices[0].message.content;

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
        clearTimeout(timeoutId);
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

        const prompt = `You are an AI database manager for a story. Your task is to optimize an array of story facts.

          RULES:
          1. Merge duplicate facts and resolve contradictions. Combine all known details about a specific entity into a single, comprehensive fact.
          2. Overwrite outdated transient states. If a character moves, or an item is consumed/broken, keep only the latest state. Discard temporary actions.
          3. Preserve permanent world lore, character traits, and current inventory. Do not delete unique entities.
          4. Categorize strictly as: Character, Item, Location, Lore, Infrastructure.
          5. Clean up time: If any old time-of-day or day-of-week facts slipped through, discard them. Keep facts objective and in the third-person.

          INPUT DATA:
          ${JSON.stringify(cleanFactsForAI, null, 2)}

          You MUST return a valid JSON object matching this schema format:
          {
            "merged_facts": [
              {
                "text": "The details of the fact",
                "category": "Character | Item | Location | Lore | Infrastructure"
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

        // 1. Ensure we have fallback text if AI returns weird JSON
        if (!summaryText) {
          console.error("AI returned data but no summary field:", data);
          throw new Error("The AI failed to generate a summary. Check the console.");
        }

        const lastMsgTimestamp = msgsToSummarize[msgsToSummarize.length - 1].timestamp;

        // Delete the old ones
        for (const m of msgsToSummarize) {
          await db.chats.delete(m.id);
        }

        // 2. Add the summary
        await db.chats.add({
          role: "summary",
          text: summaryText,
          thought: parsed.thought_process || "", // Capture the thought process if available
          options: null,
          timestamp: lastMsgTimestamp // This keeps it in the correct chronological order
        });

        // Refresh the UI
        messages.value = await db.chats.orderBy("timestamp").toArray();
        await updateCounts();
        alert("Chapter summarized successfully! Scroll up to see the entry."); // 3. Feedback to user
        scrollToBottom();
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

      // Updated filter: Ignore existing super-summaries
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

        const lastMsgTimestamp = msgsToSummarize[msgsToSummarize.length - 1].timestamp;

        for (const m of msgsToSummarize) {
          await db.archives.add({ text: m.text, timestamp: m.timestamp });
          await db.chats.delete(m.id);
        }

        await db.chats.add({
          role: "summary",
          text: `**[THE STORY SO FAR]**\n\n${summaryText}`,
          thought: "",
          options: null,
          timestamp: lastMsgTimestamp + 1,
        });

        messages.value = await db.chats.orderBy("timestamp").toArray();
        await loadArchives();
        await updateCounts();
        scrollToBottom();
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
            text = `[STORY GRIMOIRE]
            ${factsSummary || "No facts established yet."}[END GRIMOIRE]

            STORY PREMISE: ${text}`;
          }

          return {
            role: role,
            content: text,
          };
        });

        const systemMessage = {
          role: "system",
          content: CORE_SYSTEM_PROMPT
        };

        const messagesPayload = [systemMessage, ...contents];

        const payload = {
          model: selectedModel.value,
          messages: messagesPayload,
          temperature: 0.7,
          max_tokens: 4096,
          response_format: { type: "json_object" }
        };

        const url = `${baseUrl.value.replace(/\/$/, "")}/chat/completions`;

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
                "Authorization": `Bearer ${apiKey.value}`,
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errMsg = errorData.error?.message || "";

              if ((response.status === 500 || response.status === 429) && attempt < retryDelays.length) {
                let delayMs = retryDelays[attempt];

                const retryAfterHeader = response.headers.get("Retry-After");
                if (retryAfterHeader) {
                  const parsedSeconds = parseFloat(retryAfterHeader);
                  if (!isNaN(parsedSeconds)) {
                    delayMs = Math.ceil(parsedSeconds * 1000) + 500;
                  }
                } else if (response.status === 429) {
                  const match = errMsg.match(/Please retry in ([\d.]+)s/);
                  if (match && match[1]) {
                    delayMs = Math.ceil(parseFloat(match[1]) * 1000) + 500;
                  }
                }

                console.warn(`API ${response.status} Error. Waiting ${delayMs}ms... (Attempt ${attempt + 1})`);

                await new Promise((res) => setTimeout(res, delayMs));
                attempt++;
                continue;
              }

              throw new Error(errMsg || `API Error: ${response.status}`);
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
            const parsed = JSON.parse(jsonString);

            // Defensive parser to safely clean nested JSON and markdown leaks
            const cleanTextField = (val) => {
              if (typeof val !== "string") return val;
              let s = val.trim();
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

            if (parsed.thought) {
              thoughtText = typeof parsed.thought === 'string'
                ? parsed.thought
                : JSON.stringify(parsed.thought);
            }

            if (parsed.response) finalResponse = cleanTextField(parsed.response).trim();
            // Ensure options exist and are actually an Array so Vue's .length doesn't fail
            if (parsed.options && Array.isArray(parsed.options)) {
              finalOptions = parsed.options;
            } else if (parsed.choices && Array.isArray(parsed.choices)) {
              // Fallback in case the AI renames the key to "choices"
              finalOptions = parsed.choices;
            } else {
              finalOptions = null;
            }

            if (parsed.facts && Array.isArray(parsed.facts)) {
              for (const f of parsed.facts) {
                if (f.text && f.category) {
                  if (f.text.toLowerCase().startsWith("time:")) {
                    await db.facts
                      .filter((existFact) => existFact.text && existFact.text.toLowerCase().startsWith("time:"))
                      .delete();
                  }

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
      isGeneratingRules,
      randomizeRules,
      editingMsgId,
      editingMsgText,
      startEditMessage,
      cancelEditMessage,
      saveEditMessage,
      archivedSummaries,
      superSummaryBatchSize,
      isSuperSummarizing,
      superSummarizeStory,
    };
  },
}).mount("#app");

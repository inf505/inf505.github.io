const { createApp, ref, onMounted, nextTick, watch } = Vue;

const CORE_SYSTEM_PROMPT = `You are a professional Dungeon Master.
TASK: Lead the player through a D&D-style adventure.

PERSPECTIVE:
- Write exclusively in the SECOND-PERSON ("You").
- Maintain a natural progression of time and atmospheric shifts.

MECHANICS & DATA:
1. STATS: You must track and respect the user's current attributes (HP, AC, Ability Scores).
2. ITEMS: Manage the user's inventory. Describe items found and track their usage.
3. ROLLS: When an action has a chance of failure, state the required Skill Check and Difficulty Class (DC). Simulate 1d20 rolls for the user.

OUTPUT REQUIREMENTS:
Return a single JSON object.
1. "thought": DM logic. Plan the encounter, determine DCs, and track hidden NPC motives.
2. "response": The story text. Use bold for key items/locations.
3. "options": 3 action choices. One should include a bracketed [Skill Check] (e.g., "[Athletics] Climb the wall").
4. "stats_update": Array of objects {name, value} to update the Character Sheet.
5. "items_update": Array of objects {name, description, quantity, action}
   - action: "add", "remove", or "update".
6. "facts": Array of objects {text, category} for Lore/NPC/Location updates.
`;

const db = new Dexie("StoryDNDDB");
db.version(3).stores({
  chats: "++id, role, text, thought, timestamp",
  facts: "++id, text, category, timestamp",
  stats: "++id, name, value", // e.g., name: "HP", value: "15/15"
  items: "++id, name, description, quantity", // e.g., name: "Health Potion", quantity: 2
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
    const selectedVoice = ref("Achird");
    const ttsProsodyNudge = ref(
      "Read the following text like a professional narrator. Tone: Use a tone to match the content.",
    );
    const newFactText = ref("");
    const newFactCategory = ref("Lore");
    const facts = ref([]);
    const summaryBatchSize = ref(10);

    const stats = ref([]);
    const items = ref([]);

    const loadCharacterData = async () => {
      try {
        stats.value = await db.stats.toArray();
        items.value = await db.items.toArray();
      } catch (err) {
        console.error("Error loading character data:", err);
      }
    };

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
        const p = `Act as a professional high-concept screenwriter.
        In your 'thought' field, brainstorm three completely different, weird settings (e.g., biopunk, post-apocalyptic jazz age, sentient nebula).
        Pick the most unusual one and develop a mystery around it. Then, in 'premise', provide the final story description.
- Do not name the protagonist; describe them only by their current situation or role (e.g., 'You are a survivor', 'You are the last keeper').
        STRICT LIMIT: One paragraph, maximum 80 words.`;

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

    const randomizeStats = async () => {
      // Prevent randomization if the game has already started
      if (messages.value.length > 0) {
        alert(
          "The die is cast! You cannot randomize stats once the adventure has begun.",
        );
        return;
      }

      await db.stats.clear();

      // Standard D&D 4d6 drop lowest logic
      const rollAbility = () => {
        const rolls = Array.from(
          { length: 4 },
          () => Math.floor(Math.random() * 6) + 1,
        );
        rolls.sort((a, b) => a - b);
        return rolls[1] + rolls[2] + rolls[3];
      };

      const startingStats = [
        { name: "Strength", value: rollAbility() },
        { name: "Dexterity", value: rollAbility() },
        { name: "Constitution", value: rollAbility() },
        { name: "Intelligence", value: rollAbility() },
        { name: "Wisdom", value: rollAbility() },
        { name: "Charisma", value: rollAbility() },
        { name: "HP", value: "20/20" },
        { name: "AC", value: "10" },
        { name: "Level", value: "1" },
      ];

      for (const s of startingStats) {
        await db.stats.add(s);
      }

      // Clear items and add basic starting gear
      await db.items.clear();
      await db.items.add({
        name: "Rations",
        description: "Standard traveling food.",
        quantity: 5,
      });
      await db.items.add({
        name: "Waterskin",
        description: "Full of fresh water.",
        quantity: 1,
      });

      await loadCharacterData();
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
      const storedKey = localStorage.getItem("storydnd_api_key");
      const storedModel = localStorage.getItem("storydnd_model");

      if (localStorage.getItem("storydnd_tts_model"))
        selectedTTSModel.value = localStorage.getItem("storydnd_tts_model");
      if (localStorage.getItem("storydnd_randomizer_model")) {
        randomizerModel.value = localStorage.getItem(
          "storydnd_randomizer_model",
        );
      }
      if (localStorage.getItem("storydnd_tts_voice"))
        selectedVoice.value = localStorage.getItem("storydnd_tts_voice");
      if (localStorage.getItem("storydnd_tts_prosody"))
        ttsProsodyNudge.value = localStorage.getItem("storydnd_tts_prosody");

      if (storedKey && storedModel) {
        apiKey.value = storedKey;
        selectedModel.value = storedModel;
        isConfigured.value = true;
      }

      const storedSystemPrompt = localStorage.getItem("storydnd_system_prompt");
      if (storedSystemPrompt !== null) systemPrompt.value = storedSystemPrompt;

      if (localStorage.getItem("storydnd_summary_batch")) {
        summaryBatchSize.value = parseInt(
          localStorage.getItem("storydnd_summary_batch"),
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

      await loadCharacterData();
      await loadFacts();
    });

    const saveAllSettings = () => {
      // Check if the rules actually changed compared to what's in storage
      var oldRules = localStorage.getItem("storydnd_system_prompt") || "";
      var rulesChanged = oldRules.trim() !== systemPrompt.value.trim();

      // Save everything to localStorage
      localStorage.setItem("storydnd_api_key", apiKey.value);
      localStorage.setItem("storydnd_model", selectedModel.value);
      localStorage.setItem("storydnd_randomizer_model", randomizerModel.value);
      localStorage.setItem("storydnd_system_prompt", systemPrompt.value);
      localStorage.setItem("storydnd_tts_model", selectedTTSModel.value);
      localStorage.setItem("storydnd_tts_voice", selectedVoice.value);
      localStorage.setItem("storydnd_tts_prosody", ttsProsodyNudge.value);
      localStorage.setItem("storydnd_summary_batch", summaryBatchSize.value);

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
        "Are you sure? This will permanently delete the story, your character stats, and all inventory.";
      if (!confirm(warnMsg)) return;

      await db.chats.clear();
      await db.facts.clear();
      await db.stats.clear(); // Clear stats
      await db.items.clear(); // Clear items

      messages.value = [];
      facts.value = [];
      stats.value = [];
      items.value = [];

      await updateCounts();
      showSettings.value = true;
      activeTab.value = "character"; // Take them straight to character creation
    };

    const initializeStory = async () => {
      if (isLoading.value) return;

      // Use the Premise as the first message.
      // If it's empty, use a default fallback.
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

        const currentStats = await db.stats.toArray();
        const currentItems = await db.items.toArray();

        const statsBlock = currentStats
          .map((s) => `${s.name}: ${s.value}`)
          .join(", ");
        const itemsBlock = currentItems
          .map((i) => `- ${i.name} (${i.quantity}): ${i.description}`)
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
            text = `[CHARACTER SHEET]
          STATS: ${statsBlock || "Not initialized."}
          INVENTORY:
          ${itemsBlock || "Empty."}

          [STORY GRIMOIRE]
          ${factsSummary || "No lore established yet."}
          [END CONTEXT]

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

            // 1. Handle Stats Updates
            if (parsed.stats_update && Array.isArray(parsed.stats_update)) {
              for (const s of parsed.stats_update) {
                // We use a "put" with a key-check or just overwrite by name
                const existing = await db.stats
                  .where("name")
                  .equalsIgnoreCase(s.name)
                  .first();
                if (existing) {
                  await db.stats.update(existing.id, { value: s.value });
                } else {
                  await db.stats.add({ name: s.name, value: s.value });
                }
              }
            }

            // 2. Handle Item Updates
            if (parsed.items_update && Array.isArray(parsed.items_update)) {
              for (const item of parsed.items_update) {
                const existing = await db.items
                  .where("name")
                  .equalsIgnoreCase(item.name)
                  .first();

                if (item.action === "remove") {
                  if (existing) await db.items.delete(existing.id);
                } else if (item.action === "add" || item.action === "update") {
                  if (existing) {
                    await db.items.update(existing.id, {
                      quantity: item.quantity,
                      description: item.description || existing.description,
                    });
                  } else {
                    await db.items.add({
                      name: item.name,
                      description: item.description,
                      quantity: item.quantity,
                    });
                  }
                }
              }
            }

            // 3. Refresh the UI
            await loadCharacterData();

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

    const updateStatManually = async (name, value) => {
      const existing = await db.stats
        .where("name")
        .equalsIgnoreCase(name)
        .first();
      if (existing) await db.stats.update(existing.id, { value });
      else await db.stats.add({ name, value });
      await loadCharacterData();
    };

    const deleteItemManually = async (id) => {
      await db.items.delete(id);
      await loadCharacterData();
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
      // --- NEW CHARACTER & D&D DATA ---
      stats, // The reactive array of stats (HP, Level, etc.)
      items, // The reactive array of inventory items
      loadCharacterData, // Function to refresh stats/items from Dexie
      updateStatManually, // Function for the UI to edit a stat
      deleteItemManually, // Function for the UI to remove an item
      rollDice, // Helper function to roll a d20/d6 into the chat

      stats,
      items,
      randomizeStats,
      loadCharacterData,

      apiKey,
      selectedModel,
      randomizerModel,
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
      isGeneratingRules,
      randomizeRules,
    };
  },
}).mount("#app");

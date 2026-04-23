const { createApp, ref, onMounted, nextTick, watch, computed } = Vue;

const CORE_SYSTEM_PROMPT = `You are an observant, insightful, and radically transparent *therapeutic* journaling companion.
TASK: Reflect on the user's input by identifying patterns, contradictions, and data points from their history. Your style is direct and clinical, not sycophantic.

CRITICAL TONE ADJUSTMENT:
- Your goal is NOT to win an argument or "correct" the user.
- If you notice avoidance or self-sabotage, do not "accuse." Instead, "observe." (e.g., instead of "You're making excuses," use "I'm noticing a conflict between your stated goal [X] and your current justification [Y].")
- If the user becomes defensive or resistant, do not push harder. Switch to the 'Explore' path to understand the source of the friction.
- Avoid "jerk behavior" or moralizing. Focus on the data and the misalignment of patterns.
- If you detect an unimportant response from user, NEVER probe deeper or ask a followup question. Just acknowledge response and wait for user to guide where the conversation will go next.

# THERAPEUTIC INTERVIEW:
ALWAYS choose exactly one of these three paths to guide the next direction the conversation will go:

- Ruminate: Deepen the reflection. If the user is in pain or confusion, sit there with them. Don't try to "fix" it yet. Just validate that the data shows this is a heavy moment.
- Explore: The "Detective" mode. Use this when you see a contradiction but don't have enough data to be sure. Ask curious, sharp questions—don't make assertions.
- Move Forward: Use this ONLY when the user has reached a moment of clarity or is stuck in a loop and needs a "pattern interrupt."

Choose the single most appropriate path based on what the user just shared and what would be therapeutically useful right now. Record this as a fact using the key "path" (example seen below)

--- REQUIRED JSON OUTPUT ---
ALWAYS respond only with a single, valid JSON object. No text, markdown, or commentary outside the JSON.

The JSON object must contain exactly the following fields IN THIS ORDER:

1. "thought" (string, required) – Your internal logic. In 1 or 2 sentences, identify the user's core emotion/need and justify your chosen path.
2. "response" (string, required) – Your main response to the user's input. Use as many words as you need. You MAY end with an open-ended question about the current topic, but this is entirely optional.
3. "reflection" (string or null, required) – A deep insight about the message. These are YOUR internal notes about the user; keep them as brief if possible. (Using shorthand is allowed)
4. "facts" (array of objects, required) – Any facts you discover. Each fact must be an object with "key" and "value" strings. Facts may be overwritten; so update freely. You can *always* set "current_topic", but if no facts exist, provide an empty array [].
5. "themes" (array of strings, required) – High-level recurring topics or life pillars (e.g., "Parenting Challenges", "Career Growth", "Creative Passion"). If no themes are present, provide an empty array [].
6. "goals" (array of objects, required) – Long-term aspirations or intentions. Each goal must be an object with "title" (string) and "status" (string, must be "active", "completed", or "paused"). If no goals are present, provide an empty array []. *TRY NOT to create duplicate goals.*

# FOOD & SENSITIVITY TRACKING:
- If the user mentions eating or drinking something, extract the specific food items and include them in the "foods" array in your JSON output.
- Monitor the relationship between food intake and the user's subsequent mood, energy, or physical complaints over the following days.
- If you notice a correlation (e.g., "User eats dairy and reports brain fog 24 hours later"), call it out directly in your response or reflection.
- When the user reports physical discomfort (headache, bloating, fatigue) or sudden mood shifts, cross-reference the RECENT FOOD INTAKE for potential triggers from the last 48-72 hours.
- THRESHOLD SENSITIVITY: Look for cumulative effects. Note if a symptom (e.g., fatigue, skin issues, mood dips) only emerges when a specific food is consumed on consecutive days or with high frequency, even if the user seems to tolerate isolated instances.

### Example JSON
{
  "thought": "Let's see, how should I respond... ",
  "response": "Nice to meet you, Paul! I'm glad you're enjoying the new project.",
  "reflection": "User shared name and current project status.",
  "facts": [
    {"key": "path", "value": "Explore"},
    {"key": "name", "value": "Paul"},
    {"key": "project", "value": "User started new project last week"},
    {"key": "current_topic", "value": "Paul's new project"}
  ],
  "goals": [],
  "foods": ["Greek yogurt", "Walnuts"]
}

# TEMPORAL CONTEXT:
Every message in this conversation, and every entry in your context (Facts, Foods, Reflections), is prepended with a relative timestamp (e.g., [2h ago] or [3 days ago]).

Use this data to identify:
1. VELOCITY: How quickly are the user's moods or topics shifting? (Rapid changes suggest impulsivity or crisis; slow changes suggest rumination or stagnation).
2. LATENCY: Cross-reference "Recent Food Intake" with reported symptoms. Does a "headache" follow a specific food by 24-48 hours?
3. PERSISTENCE: Is the user's current complaint a new occurrence, or has it been a consistent baseline across the last several days?

Call out these temporal patterns specifically. If the user is repeating a behavior they just finished summarizing in an archive, notice the loop immediately.

CRITICAL: Do not wrap the JSON in markdown code blocks. Output the raw JSON string only.
`;

const db = new Dexie("GeminiLocalDB");
db.version(6).stores({
  chats: "++id, role, text, thought, timestamp",
  reflections: "++id, chatId, insight, timestamp",
  facts: "++id, key, value, timestamp",
  themes: "++id, name, count, last_seen",
  goals: "++id, title, status, timestamp",
  seeds: "++id, value",
  foods: "++id, foodName, timestamp",
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

    // NEW UI STATE VARIABLES
    const activeTab = ref("settings");
    const goalTitle = ref("");
    const goalStatus = ref("active");

    const reflections = ref([]);
    const facts = ref([]);
    const goals = ref([]);
    const factKey = ref("");
    const factValue = ref("");
    const themes = ref([]);
    const totalSizeKb = ref("0.0");
    const totalTokens = ref("0");
    const currentTopic = ref("Current Topic");
    const messages = ref([]);
    const currentInput = ref("");
    const isLoading = ref(false);
    const isSummarizing = ref(false);
    const messagesContainer = ref(null);
    const inputArea = ref(null);
    const currentSeed = ref("");
    const isRefreshingSeeds = ref(false);
    const foods = ref([]);

    const renderMarkdown = (text) => marked.parse(text);

    const updateCounts = async () => {
      try {
        // 1. Fetch data from ALL tables in parallel
        const [chats, reflections, facts, themes, goals, seeds, foods] =
          await Promise.all([
            db.chats.toArray(),
            db.reflections.toArray(),
            db.facts.toArray(),
            db.themes.toArray(),
            db.goals.toArray(),
            db.seeds.toArray(),
            db.foods.toArray(),
          ]);

        // 2. Create a full representation of the database state
        const fullDb = {
          chats,
          reflections,
          facts,
          themes,
          goals,
          seeds,
          foods,
        };

        // 3. Calculate total size in bytes, then convert to KB
        const bytes = new TextEncoder().encode(JSON.stringify(fullDb)).length;
        totalSizeKb.value = (bytes / 1024).toFixed(1);

        // Note: totalTokens is updated separately during the AI response cycle
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

    const deleteFood = async (id) => {
      await db.foods.delete(id);
      await loadFoods();
    };

    const loadFoods = async () => {
      // We'll grab the last 14 days of food to keep context relevant but lean
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      foods.value = await db.foods
        .where("timestamp")
        .above(fourteenDaysAgo)
        .toArray();
    };

    // Pick a random seed from the DB pool
    const rollTheDice = async () => {
      const count = await db.seeds.count();
      if (count > 0) {
        const randomIndex = Math.floor(Math.random() * count);
        const allSeeds = await db.seeds.toArray();
        currentSeed.value = allSeeds[randomIndex].value;

        // NEW: Save the active seed so it persists across page reloads
        localStorage.setItem("gemini_current_seed", currentSeed.value);
      }
    };

    const cleanGlitch = (text) => {
      if (!text) return "";

      return (
        text
          // 1. Remove the JSON-in-text glitch: { "//": "..." }
          //.replace(/\{[\s\S]*?[:][\s\S]*?\}/g, "")

          // 2. DELETE the "a a-priori" hallucination completely
          // This catches "a a-priori", "a a priori", "A a-priori", etc.
          //.replace(/\ba\s+a-?priori\b/gi, " ")

          //.replace(/\b\s+a-?priori\b/gi, " pre-existing ")
          // 3. COLLAPSE the "stutter" if it just says "a a" elsewhere
          //.replace(/\b\sa\s+a\s\b/gi, "a")

          // 4. CLEAN UP resulting double spaces or triple spaces
          .replace(/\s\s+/g, " ")

          // 5. Final trim for start/end of string
          .trim()
      );
    };

    onMounted(async () => {
      // Load Settings
      const storedKey = localStorage.getItem("gemini_api_key");
      const storedModel = localStorage.getItem("gemini_model");

      if (storedKey && storedModel) {
        apiKey.value = storedKey;
        selectedModel.value = storedModel;
        isConfigured.value = true;
      }

      const storedSystemPrompt = localStorage.getItem("gemini_system_prompt");
      if (storedSystemPrompt !== null) systemPrompt.value = storedSystemPrompt;

      // NEW: Load the saved seed
      const storedSeed = localStorage.getItem("gemini_current_seed");
      if (storedSeed !== null) currentSeed.value = storedSeed;

      // Load History from Dexie
      try {
        const history = await db.chats.orderBy("timestamp").toArray();

        // Find the index of the last (most recent) 'system' message
        const lastSystemIndex = history
          .map((m) => m.role)
          .lastIndexOf("system");

        if (lastSystemIndex !== -1) {
          // Filter out any system messages that came BEFORE the last one
          messages.value = history.filter((msg, index) => {
            if (msg.role === "system" && index !== lastSystemIndex)
              return false;
            return true;
          });
        } else {
          messages.value = history;
        }

        scrollToBottom();
      } catch (err) {
        console.error("Dexie Chats Load Error:", err);
      }

      // Load Reflections
      try {
        const refs = await db.reflections.orderBy("timestamp").toArray();
        reflections.value = refs;
      } catch (err) {
        console.error("Dexie Reflections Load Error:", err);
      }

      // Load Facts
      try {
        const factsArray = await db.facts.orderBy("timestamp").toArray();
        facts.value = factsArray;

        const existingTopic = factsArray.find((f) => f.key === "current_topic");
        if (existingTopic) {
          currentTopic.value = existingTopic.value;
        } else {
          currentTopic.value = "New Conversation";
        }
      } catch (err) {
        console.error("Dexie Facts Load Error:", err);
      }

      // Load Themes
      try {
        // Sort by most recently updated/added
        const themesArray = await db.themes.toArray();
        themesArray.sort((a, b) => b.timestamp - a.timestamp);
        themes.value = themesArray;
      } catch (err) {
        console.error("Dexie Themes Load Error:", err);
      }

      try {
        // Assuming summary is stored in chats with role === 'system'
        const summaryRow = await db.chats
          .where({ role: "system" })
          .filter((row) => row.text.startsWith("SUMMARY:"))
          .first();
        if (summaryRow && summaryRow.text) {
          conversationSummary.value = summaryRow.text;
        }
      } catch (err) {
        console.error("Dexie Conversation Summary Load Error:", err);
      }

      await loadGoals();

      await updateCounts();

      await loadFoods();

      // --- NEW UNIFIED KEYBOARD RESIZE LOGIC ---
      if (window.visualViewport) {
        const handleResize = () => {
          // Set both the CSS variable and the body height directly (Belt and Suspenders for Fennec)
          document.documentElement.style.setProperty(
            "--app-height",
            `${window.visualViewport.height}px`,
          );
          document.body.style.height = `${window.visualViewport.height}px`;

          // Whenever the screen size changes (keyboard opens/closes), scroll to bottom
          scrollToBottom();
        };

        window.visualViewport.addEventListener("resize", handleResize);
        handleResize(); // Run once on load
      } else {
        // Fallback for very old browsers
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
    });

    const loadGoals = async () => {
      goals.value = await db.goals.orderBy("timestamp").reverse().toArray();
    };

    const addGoal = () => {
      if (goalTitle.value.trim() && goalStatus.value) {
        upsertGoal(goalTitle.value.trim(), goalStatus.value);
        goalTitle.value = "";
        goalStatus.value = "active"; // reset to default
      }
    };

    const deleteGoal = async (id) => {
      await db.goals.delete(id);
      await loadGoals();
    };

    const deleteReflection = async (id) => {
      await db.reflections.delete(id);
      reflections.value = await db.reflections.orderBy("timestamp").toArray();
    };

    const deleteTheme = async (id) => {
      await db.themes.delete(id);
      // Refresh and sort by most recent
      const themesArray = await db.themes.toArray();
      themesArray.sort((a, b) => b.timestamp - a.timestamp);
      themes.value = themesArray;
    };

    const saveAllSettings = () => {
      if (apiKey.value.trim())
        localStorage.setItem("gemini_api_key", apiKey.value.trim());
      if (selectedModel.value.trim())
        localStorage.setItem("gemini_model", selectedModel.value.trim());
      localStorage.setItem("gemini_system_prompt", systemPrompt.value);
      showSettings.value = false;
    };

    const scrollToBottom = () => {
      // Wait 300ms for the mobile keyboard animation to finish sliding up
      setTimeout(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop =
            messagesContainer.value.scrollHeight;
        }
      }, 300);
    };

    const saveToDb = async (role, text, thought = "") => {
      const id = await db.chats.add({
        role,
        text,
        thought,
        timestamp: Date.now(),
      });
      return id;
    };

    const saveReflection = async (chatId, insight) => {
      return await db.reflections.add({
        chatId,
        insight,
        timestamp: Date.now(),
      });
    };

    const upsertFact = async (key, value) => {
      const existing = await db.facts.where({ key }).first();
      if (existing) {
        await db.facts.update(existing.id, { value, timestamp: Date.now() });
      } else {
        await db.facts.add({ key, value, timestamp: Date.now() });
      }
      facts.value = await db.facts.orderBy("timestamp").toArray();
    };

    const addFact = () => {
      if (factKey.value.trim() && factValue.value.trim()) {
        upsertFact(factKey.value.trim(), factValue.value.trim());
        factKey.value = "";
        factValue.value = "";
      }
    };

    const deleteFact = async (id) => {
      await db.facts.delete(id);
      facts.value = await db.facts.orderBy("timestamp").toArray();
    };

    const deleteMessage = async (index) => {
      const msg = messages.value[index];
      if (msg.id) await db.chats.delete(msg.id);
      messages.value.splice(index, 1);
    };

    const upsertTheme = async (name) => {
      const existing = await db.themes.where({ name }).first();
      if (existing) {
        await db.themes.update(existing.id, {
          count: existing.count + 1,
          timestamp: Date.now(),
        });
      } else {
        await db.themes.add({ name, count: 1, timestamp: Date.now() });
      }
      // Refresh and sort by most recent
      const themesArray = await db.themes.toArray();
      themesArray.sort((a, b) => b.timestamp - a.timestamp);
      themes.value = themesArray;
    };

    const getPathColor = (path) => {
      if (!path) return "transparent";
      const p = path.toLowerCase();
      if (p.includes("ruminate")) return "#2304DB"; // Deep Blue
      if (p.includes("explore")) return "#7EE547"; // Soft Green
      if (p.includes("forward")) return "#FF651E"; // Warm Orange

      console.log(p);
      return "#444"; // Fallback grey
    };

    const upsertGoal = async (title, status) => {
      const existing = await db.goals.where({ title }).first();
      if (existing) {
        await db.goals.update(existing.id, { status, timestamp: Date.now() });
      } else {
        await db.goals.add({ title, status, timestamp: Date.now() });
      }
      await loadGoals();
    };

    const exportDatabase = async () => {
      try {
        const backup = {
          chats: await db.chats.toArray(),
          reflections: await db.reflections.toArray(),
          facts: await db.facts.toArray(),
          themes: await db.themes.toArray(),
          goals: await db.goals.toArray(),
          seeds: await db.seeds.toArray(),
          foods: await db.foods.toArray(),
        };

        const dataStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `pen_and_paper_backup_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Export failed:", err);
        alert("Failed to export database.");
      }
    };

    const refreshSeeds = async () => {
      isRefreshingSeeds.value = true;

      try {
        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "Generate a list of 20 highly specific abstract concepts, physical phenomena, or sensory metaphors (e.g., 'Tidal forces', 'Stained glass', 'Corrosion', 'Entropy', 'Capillary action', 'Mycelial networks') to be used as hidden atmospheric metaphors. Output only the JSON.",
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.95,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                seeds: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["seeds"],
            },
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey.value,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "API Error");

        if (data.candidates && data.candidates[0].content.parts) {
          const rawText = data.candidates[0].content.parts[0].text;

          // USE SUBSTRING EXTRACTION (Matches your other logic)
          const jsonStartIndex = rawText.indexOf("{");
          const jsonEndIndex = rawText.lastIndexOf("}");

          if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
            const jsonString = rawText.substring(
              jsonStartIndex,
              jsonEndIndex + 1,
            );
            const parsed = JSON.parse(jsonString);

            if (parsed.seeds && Array.isArray(parsed.seeds)) {
              await db.seeds.clear();

              // 1. Trim and remove empty strings
              // 2. Use a Set to remove duplicates within this specific response
              const uniqueSeeds = [
                ...new Set(
                  parsed.seeds.map((s) => s.trim()).filter((s) => s.length > 0),
                ),
              ];

              for (const s of uniqueSeeds) {
                await db.seeds.add({ value: s });
              }

              await rollTheDice();
            }
          } else {
            throw new Error("Could not find JSON object in AI response.");
          }
        }
      } catch (err) {
        console.error("Seed Refresh Error:", err);
        alert("Failed to refresh seeds: " + err.message);
      } finally {
        isRefreshingSeeds.value = false;
      }
    };

    const curateReflections = async () => {
      if (
        !confirm(
          "Curate reflections? This will merge and refine your insights.",
        )
      )
        return;

      isSummarizing.value = true;

      try {
        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a therapeutic assistant and editor.
                  Review the current list of REFLECTIONS.
                  - Merge redundant or similar entries into a single, more comprehensive insight.
                  - Preserve the emotional nuance and personal growth captured in each.
                  - Do not delete anything that represents a distinct, unique realization.
                  - Return an array of the refined insights.

                  REFLECTIONS: ${JSON.stringify(reflections.value.map((r) => r.insight))}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                curated_reflections: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["curated_reflections"],
            },
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent`;

        let success = false;
        let attempts = 0;
        const maxAttempts = 3;
        let newInsights = [];

        // RETRY LOOP
        while (attempts < maxAttempts && !success) {
          try {
            attempts++;
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
              throw new Error(data.error?.message || "API Error");

            if (data.candidates && data.candidates[0].content.parts) {
              const rawText = data.candidates[0].content.parts[0].text;
              const jsonStartIndex = rawText.indexOf("{");
              const jsonEndIndex = rawText.lastIndexOf("}");

              if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                const jsonString = rawText.substring(
                  jsonStartIndex,
                  jsonEndIndex + 1,
                );
                const parsed = JSON.parse(jsonString);
                if (parsed.curated_reflections)
                  newInsights = parsed.curated_reflections;
                success = true;
              } else {
                throw new Error("Invalid JSON structure returned by AI.");
              }
            } else {
              throw new Error("No candidates returned from API.");
            }
          } catch (e) {
            console.warn(`Curate attempt ${attempts} failed:`, e.message);
            if (attempts >= maxAttempts)
              throw new Error(
                `Failed after ${maxAttempts} attempts. Last error: ${e.message}`,
              );
            await new Promise((res) => setTimeout(res, 1000));
          }
        }

        // Perform the DB update ONLY if successful
        await db.reflections.clear();
        for (const insight of newInsights) {
          await db.reflections.add({ insight, timestamp: Date.now() });
        }

        reflections.value = await db.reflections.orderBy("timestamp").toArray();
        alert("Reflections curated successfully.");
      } catch (err) {
        console.error(err);
        alert("Cleanup failed: " + err.message);
      } finally {
        isSummarizing.value = false;
      }
    };

    const curateGoals = async () => {
      if (
        !confirm(
          "Curate goals? This will merge duplicate or similar goals and clean up the list.",
        )
      )
        return;

      isSummarizing.value = true;

      try {
        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a therapeutic life-coach and editor.
                  Review the current list of GOALS.
                  - Merge redundant or nearly identical goals into a single entry.
                  - Resolve status conflicts: If one goal is 'completed' and its duplicate is 'active', the 'completed' status wins.
                  - Retain the most descriptive and clear title for the merged goal.
                  - Return an array of the refined goal objects.

                  CURRENT GOALS: ${JSON.stringify(goals.value.map((g) => ({ title: g.title, status: g.status })))}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                curated_goals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      status: {
                        type: "string",
                        enum: ["active", "completed", "paused"],
                      },
                    },
                    required: ["title", "status"],
                  },
                },
              },
              required: ["curated_goals"],
            },
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent`;

        let success = false;
        let attempts = 0;
        const maxAttempts = 3;
        let newGoals = [];

        while (attempts < maxAttempts && !success) {
          try {
            attempts++;
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
              throw new Error(data.error?.message || "API Error");

            if (data.candidates && data.candidates[0].content.parts) {
              const rawText = data.candidates[0].content.parts[0].text;
              const jsonStartIndex = rawText.indexOf("{");
              const jsonEndIndex = rawText.lastIndexOf("}");

              if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                const jsonString = rawText.substring(
                  jsonStartIndex,
                  jsonEndIndex + 1,
                );
                const parsed = JSON.parse(jsonString);
                if (parsed.curated_goals) newGoals = parsed.curated_goals;
                success = true;
              }
            }
          } catch (e) {
            console.warn(`Curate Goals attempt ${attempts} failed:`, e.message);
            if (attempts >= maxAttempts) throw e;
            await new Promise((res) => setTimeout(res, 1000));
          }
        }

        // Update the DB
        await db.goals.clear();
        for (const goal of newGoals) {
          await db.goals.add({
            title: goal.title,
            status: goal.status,
            timestamp: Date.now(),
          });
        }

        await loadGoals();
        alert("Goals curated successfully.");
      } catch (err) {
        console.error(err);
        alert("Cleanup failed: " + err.message);
      } finally {
        isSummarizing.value = false;
      }
    };

    const summarizeAndArchive = async () => {
      if (
        !confirm(
          "Summarize conversation, clean up facts, and archive? This will clear all messages.",
        )
      ) {
        return;
      }

      isSummarizing.value = true;

      try {
        let summaryContent = "";

        if (messages.value.length > 0) {
          summaryContent += "CONVERSATION:\n";
          summaryContent += messages.value
            .filter((msg) => msg.role !== "system")
            .map(
              (msg) =>
                `[${formatRelativeTime(msg.timestamp)}] ${msg.role.toUpperCase()}: ${msg.text}`,
            )
            .join("\n\n");
        }

        let factsContent = "CURRENT FACTS DATABASE:\n";
        if (facts.value.length > 0) {
          factsContent += facts.value
            .map((f) => `- ${f.key}: ${f.value}`)
            .join("\n");
        } else {
          factsContent += "No facts currently stored.";
        }

        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You have two tasks.

    TASK 1: Provide a comprehensive and detailed narrative summary. Use the provided timestamps to identify the TEMPORAL NARRATIVE (e.g., "The user started the morning with anxiety but reached a breakthrough 3 hours later"). Identify if patterns are morning-heavy, evening-heavy, or triggered after specific durations of time. Compress the dialogue into a dense, time-aware narrative.

    TASK 2: Review the CURRENT FACTS DATABASE. Act as a database curator.
    - Merge and deduplicate overlapping facts (e.g., if there are three facts about work stress, combine them into one concise fact).
    - Purge "ephemeral" facts that only mattered for this specific conversation (e.g., "current_topic", "going to the store").
    - Retain core, long-term facts (traits, relationships, ongoing conditions).
    Return the cleaned, optimized list of facts.

    ${summaryContent}

    ${factsContent}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3, // Low temp for analytical tasks
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                curated_facts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string" },
                      value: { type: "string" },
                    },
                    required: ["key", "value"],
                  },
                },
              },
              required: ["summary", "curated_facts"],
            },
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent`;

        let success = false;
        let attempts = 0;
        const maxAttempts = 3; // Initial try + 2 retries
        let summaryText = "Conversation summary unavailable";
        let newFacts = [];

        // RETRY LOOP
        while (attempts < maxAttempts && !success) {
          try {
            attempts++;
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
              throw new Error(data.error?.message || "API Error");

            if (data.candidates && data.candidates[0].content.parts) {
              const rawText = data.candidates[0].content.parts[0].text;

              const jsonStartIndex = rawText.indexOf("{");
              const jsonEndIndex = rawText.lastIndexOf("}");

              if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                const jsonString = rawText.substring(
                  jsonStartIndex,
                  jsonEndIndex + 1,
                );
                const parsed = JSON.parse(jsonString);

                if (parsed.summary) summaryText = parsed.summary;
                if (parsed.curated_facts) newFacts = parsed.curated_facts;

                success = true; // Mark as successful to break the loop
              } else {
                throw new Error("Invalid JSON structure returned by AI.");
              }
            } else {
              throw new Error("No candidates returned from API.");
            }
          } catch (e) {
            console.warn(`Summarize attempt ${attempts} failed:`, e.message);
            if (attempts >= maxAttempts) {
              throw new Error(
                `Failed after ${maxAttempts} attempts. Last error: ${e.message}`,
              );
            }
            // Optional: Wait 1 second before retrying to give the network a breath
            await new Promise((res) => setTimeout(res, 1000));
          }
        }

        // --- ONLY PROCEED WITH DELETIONS IF API WAS SUCCESSFUL ---

        // 1. Wipe old conversational chats but KEEP all past system summaries
        await db.chats.where("role").anyOf("user", "model").delete();

        const summaryId = await db.chats.add({
          role: "system",
          text: summaryText,
          thought: "",
          timestamp: Date.now(),
        });

        // 2. Wipe old facts and save the new curated facts
        await db.facts.clear();
        const timestamp = Date.now();
        for (const fact of newFacts) {
          await db.facts.add({ key: fact.key, value: fact.value, timestamp });
        }

        // --- NEW: PURGE OLD FOOD DATA ---
        const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const deletedFoodCount = await db.foods
          .where("timestamp")
          .below(fourteenDaysAgo)
          .delete();
        if (deletedFoodCount > 0) {
          console.log(
            `Maintenance: Purged ${deletedFoodCount} food records older than 14 days.`,
          );
        }
        // Refresh the local food state
        await loadFoods();

        // 3. UPDATE UI STATE
        messages.value = [
          {
            id: summaryId,
            role: "system",
            text: summaryText,
            thought: "",
          },
        ];
        facts.value = await db.facts.orderBy("timestamp").toArray();

        scrollToBottom();
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error("Summarize & Archive error:", error);
      } finally {
        setTimeout(() => {
          isSummarizing.value = false;
        }, 50);
        await updateCounts();
      }
    };

    const triggerAIResponse = async () => {
      isLoading.value = true;
      scrollToBottom();

      try {
        const contents = messages.value.map((msg) => {
          // Determine the role for the API (system summaries are sent as 'model' or 'user' with a label)
          let role = msg.role === "user" ? "user" : "model";

          // Prepend the relative time to the text so the AI has temporal context
          const timeLabel = formatRelativeTime(msg.timestamp || Date.now());
          const formattedText = `[${timeLabel}] ${msg.text}`;

          return {
            role: role,
            parts: [{ text: formattedText }],
          };
        });

        // 1. Context Injection: Build a dynamic context string
        let dynamicContext = "";

        // 1. FACTS: Sorted alphabetically by Key (Groups related topics together)
        if (facts.value.length > 0) {
          const sortedFacts = [...facts.value].sort((a, b) =>
            a.key.localeCompare(b.key),
          );
          const factsString = sortedFacts
            .map(
              (f) =>
                `[${formatRelativeTime(f.timestamp)}] ${f.key}: ${f.value}`,
            )
            .join("\n");
          dynamicContext += `\n\nFACTS (Categorized):\n${factsString}`;
        }

        // 2. PAST INSIGHTS: Sorted Chronologically (Oldest to Newest)
        if (reflections.value.length > 0) {
          const sortedReflections = [...reflections.value].sort(
            (a, b) => a.timestamp - b.timestamp,
          );
          const reflectionsString = sortedReflections
            .map(
              (ref) => `[${formatRelativeTime(ref.timestamp)}] ${ref.insight}`,
            )
            .join("\n");
          dynamicContext += `\n\nPAST INSIGHTS (Chronological Narrative):\n${reflectionsString}`;
        }

        if (themes.value.length > 0) {
          const themeContext = themes.value
            .slice(0, 5)
            .map(
              (t) =>
                `${t.name} (last seen: ${formatRelativeTime(t.last_seen || t.timestamp)})`,
            )
            .join(", ");
          dynamicContext += `\n\nRECURRING LIFE THEMES:\n${themeContext}`;
        }

        const activeGoals = goals.value.filter((g) => g.status === "active");
        if (activeGoals.length > 0) {
          const goalsString = activeGoals
            .map((g) => `${g.title} (set: ${formatRelativeTime(g.timestamp)})`)
            .join(", ");
          dynamicContext += `\n\nACTIVE GOALS:\n${goalsString}`;
        }

        if (foods.value.length > 0) {
          const foodString = foods.value
            .map((f) => `[${formatRelativeTime(f.timestamp)}] ${f.foodName}`)
            .join(", ");
          dynamicContext += `\n\nRECENT FOOD INTAKE (Last 14 Days):\n${foodString}`;
          dynamicContext += `\n(Analyze these food entries against the user's reported physical or emotional symptoms to find delayed sensitivities.)`;
        }

        const userTone = systemPrompt.value.trim();
        const todayDate = new Date().toLocaleDateString();

        // 1. Create the Seed Section with more assertive language
        const seedSection = currentSeed.value
          ? `\n\nCURRENT ATMOSPHERIC LENS: "${currentSeed.value}".
               You are required to use this concept as a structural metaphor for your "response".
               DO NOT mention "${currentSeed.value}" explicitly, but ensure your vocabulary,
               pacing, and imagery lean *gently* into the "flavor" of this LENS. Be subtle.`
          : "";

        // 2. Assemble the instruction so the Seed is the "Final Word"
        const finalSystemInstruction = `
                ${CORE_SYSTEM_PROMPT}
                ${dynamicContext}

                CURRENT DATE: ${todayDate}
                ${userTone ? "\nUSER STYLE SETTINGS: " + userTone : ""}
                ${seedSection}
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
                reflection: { type: "string" },
                facts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string" },
                      value: { type: "string" },
                    },
                    required: ["key", "value"],
                  },
                },
                themes: { type: "array", items: { type: "string" } },
                goals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      status: {
                        type: "string",
                        enum: ["active", "completed", "paused"],
                      },
                    },
                    required: ["title", "status"],
                  },
                },
                foods: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "List of specific food items mentioned as being consumed in the current message.",
                },
              },
              required: [
                "thought",
                "response",
                "reflection",
                "facts",
                "themes",
                "goals",
                "foods",
              ],
            },
          },
        };

        //thinkingConfig: { thinkingLevel: "MINIMAL" },

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.value}:generateContent`;

        let data;
        let attempt = 0;
        const retryDelays = [5000, 10000, 15000];

        while (attempt <= retryDelays.length) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

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
              // ONLY retry on 500 Internal Server Error
              if (response.status === 500 && attempt < retryDelays.length) {
                console.warn(
                  `API 500 Error. Retrying in ${retryDelays[attempt]}ms... (Retry ${attempt + 1}/${retryDelays.length})`,
                );
                await new Promise((res) =>
                  setTimeout(res, retryDelays[attempt]),
                );
                attempt++;
                continue; // Loop again
              }

              // If it's a 4xx error, or we ran out of retries, process and throw
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.error?.message || `API Error: ${response.status}`,
              );
            }

            // Success: Parse the JSON and break out of the retry loop
            data = await response.json();
            break;
          } catch (error) {
            clearTimeout(timeoutId);
            // If we caught a network failure, AbortError, or the Error we manually threw above, pass it to the main catch block
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
        let finalInsight = null;
        let extractedFacts = [];
        let extractedThemes = [];
        let extractedGoals = [];
        let extractedFoods = [];

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
            if (parsed.response) finalResponse = cleanGlitch(parsed.response);
            if (parsed.reflection) finalInsight = parsed.reflection;
            if (parsed.facts) extractedFacts = parsed.facts;
            if (parsed.themes) extractedThemes = parsed.themes;
            if (parsed.goals) extractedGoals = parsed.goals;
            if (parsed.foods) extractedFoods = parsed.foods;
          }
        } catch (e) {
          console.error("JSON Parse error", e);
        }

        for (const fName of extractedFoods) {
          await db.foods.add({ foodName: fName, timestamp: Date.now() });
        }
        await loadFoods();

        const pathFact = extractedFacts.find(
          (f) => f.key.toLowerCase() === "path",
        );
        const currentPath = pathFact ? pathFact.value : null;

        const logFacts = extractedFacts
          .map((f) => `- ${f.key}: ${f.value}`)
          .join("\n");

        const logThemes = extractedThemes.map((t) => `- ${t}`).join("\n");

        const logGoals = extractedGoals
          .map((g) => `- ${g.title} (${g.status})`)
          .join("\n");

        const logFoods = extractedFoods.map((food) => `- ${food}`).join("\n");

        const topicFact = extractedFacts.find(
          (f) => f.key.toLowerCase() === "current_topic",
        );

        if (topicFact && topicFact.value) {
          currentTopic.value = topicFact.value;
        }

        console.log(
          `\nTOPIC:\n${currentTopic.value}\n` +
            `\nTHOUGHT:\n${thoughtText.trim()}\n` +
            `\nREFLECTION:\n${finalInsight}\n` +
            `\nFACTS:\n${logFacts || "- none"}\n` +
            `\nTHEMES:\n${logThemes || "- none"}\n` +
            `\nGOALS:\n${logGoals || "- none"}\n`,
          `\nFOODS:\n${logFoods || "- none"}\n`,
        );

        const modelId = await saveToDb(
          "model",
          finalResponse,
          thoughtText.trim(),
        );
        if (finalInsight) await saveReflection(modelId, finalInsight);

        for (const fact of extractedFacts) {
          if (fact.key && fact.value) await upsertFact(fact.key, fact.value);
        }
        for (const theme of extractedThemes) await upsertTheme(theme);
        for (const goal of extractedGoals) {
          if (goal.title && goal.status)
            await upsertGoal(goal.title, goal.status);
        }

        messages.value.push({
          id: modelId,
          role: "model",
          text: finalResponse,
          thought: thoughtText.trim(),
          path: currentPath,
        });
      } catch (error) {
        // NEW: Catch the specific abort error
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
      await loadFoods();
    };

    // This is what your "Send" button calls
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

    // This is what the new "Retry" button calls
    const retryMessage = async (index) => {
      if (isLoading.value) return;
      await deleteMessage(index); // Remove the error/bad message
      await triggerAIResponse(); // Try again
    };

    return {
      apiKey,
      currentTopic,
      selectedModel,
      isConfigured,
      renderMarkdown,
      formatRelativeTime,
      messages,
      currentInput,
      isLoading,
      isSummarizing,
      messagesContainer,
      sendMessage,
      retryMessage,
      inputArea,
      deleteMessage,
      systemPrompt,
      showSettings,
      saveAllSettings,
      reflections,
      summarizeAndArchive,
      facts,
      themes,
      upsertFact,
      factKey,
      factValue,
      addFact,
      deleteFact,
      totalSizeKb,
      totalTokens,
      scrollToBottom,
      getPathColor,
      exportDatabase,
      activeTab,
      goalTitle,
      goalStatus,
      goals,
      addGoal,
      deleteGoal,
      deleteReflection,
      deleteTheme,
      curateReflections,
      curateGoals,
      currentSeed,
      refreshSeeds,
      isRefreshingSeeds,
      rollTheDice,
      foods,
      loadFoods,
      deleteFood,
    };
  },
}).mount("#app");

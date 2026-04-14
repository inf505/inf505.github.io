const { createApp, ref, onMounted, nextTick, watch, computed } = Vue;

const CORE_SYSTEM_PROMPT = `You are an observant, insightful and honest *therapeutic* journaling companion.
TASK: Reflect on user's response with your deep insight - use the concept of a THERAPEUTIC INTERVIEW.

Always choose exactly one of these three paths to guide the next direction the conversation:

- Ruminate: Deepen the reflection by staying with the emotion, memory, or thought. Sit with it, unpack it further, help the user feel it more completely without rushing away.
- Explore: Gently probe for more details, connections, or underlying patterns. Ask targeted questions or highlight links to other parts of the user's life/experience.
- Move Forward: Shift toward insight, action, reframing, or next steps. Help the user extract meaning, decide on a small step, or begin integrating what came up.

Choose the single most appropriate path based on what the user just shared and what would be therapeutically useful right now. Record this as a fact using the key "path"

--- REQUIRED JSON OUTPUT ---
ALWAYS respond only with a single, valid JSON object. No text, markdown, or commentary outside the JSON.

The JSON object must contain exactly the following fields IN THIS ORDER:

1. "thought" (string, required) – Your condensed internal logic. In 1 or 2 brief sentences, quickly identify the user's core emotion/need and justify your chosen path.
2. "response" (string, required) – Your main response to the user's input. You *MAY* end with an open-ended question about the current topic, but this is entirely optional.
3. "reflection" (string or null, required) – A deep insight about the message. These are YOUR internal notes about the user; keep them as brief if possible. (Using shorthand is allowed)
4. "facts" (array of objects, required) – Any facts you discover. Each fact must be an object with "key" and "value" strings. Facts may be overwritten; so update freely. If no facts are found, provide an empty array [].
5. "themes" (array of strings, required) – High-level recurring topics or life pillars (e.g., "Parenting Challenges", "Career Growth", "Creative Passion"). If no themes are present, provide an empty array [].
6. "goals" (array of objects, required) – Long-term aspirations or intentions. Each goal must be an object with "title" (string) and "status" (string, must be "active", "completed", or "paused"). If no goals are present, provide an empty array [].

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
  "goals": []
}

CRITICAL: Do not wrap the JSON in markdown code blocks. Output the raw JSON string only.
`;

const db = new Dexie("GeminiLocalDB");
db.version(4).stores({
  chats: "++id, role, text, thought, timestamp",
  reflections: "++id, chatId, insight, timestamp",
  facts: "++id, key, value, timestamp",
  themes: "++id, name, count, last_seen",
  goals: "++id, title, status, timestamp",
});

createApp({
  setup() {
    const apiKey = ref("");
    const selectedModel = ref("gemma-4-31b-it");
    //gemma-4-26b-a4b-it (doesn't work anymore), gemma-4-31b-it
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

    const renderMarkdown = (text) => marked.parse(text);
    const updateCounts = async () => {
      try {
        // 1. Fetch counts and data in parallel
        const [chats, reflections, facts] = await Promise.all([
          db.chats.toArray(),
          db.reflections.toArray(),
          db.facts.toArray(),
        ]);

        // 3. Calculate total size
        const fullDb = { chats, reflections, facts };
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

    const cleanGlitch = (text) => {
      if (!text) return "";

      return (
        text
          // 1. Remove the JSON-in-text glitch: { "//": "..." }
          .replace(/\{[\s\S]*?[:][\s\S]*?\}/g, "")

          // 2. DELETE the "a a-priori" hallucination completely
          // This catches "a a-priori", "a a priori", "A a-priori", etc.
          .replace(/\ba\s+a-?priori\b/gi, "")

          .replace(/\b\s+a-?priori\b/gi, "pre-existing")
          // 3. COLLAPSE the "stutter" if it just says "a a" elsewhere
          .replace(/\ba\s+a\b/gi, "a")

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

      // Load History from Dexie
      try {
        const history = await db.chats.orderBy("timestamp").toArray();
        messages.value = history;
        scrollToBottom();
      } catch (err) {
        console.error("Dexie Facts Load Error:", err);
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

    const saveAllSettings = () => {
      if (apiKey.value.trim())
        localStorage.setItem("gemini_api_key", apiKey.value.trim());
      if (selectedModel.value.trim())
        localStorage.setItem("gemini_model", selectedModel.value.trim());
      localStorage.setItem("gemini_system_prompt", systemPrompt.value);
      showSettings.value = false;
    };

    // const saveSettings = () => {
    //   if (!apiKey.value.trim() || !selectedModel.value.trim()) return;
    //   localStorage.setItem("gemini_api_key", apiKey.value.trim());
    //   localStorage.setItem("gemini_model", selectedModel.value.trim());
    //   isConfigured.value = true;
    // };

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

    const summarizeAndArchive = async () => {
      if (
        !confirm(
          "Summarize conversation and archive? This will clear all messages.",
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
            .map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
            .join("\n\n");
        }

        if (reflections.value.length > 0) {
          summaryContent += "\n\nREFLECTIONS:\n";
          summaryContent += reflections.value
            .map((ref) => `- ${ref.insight}`)
            .join("\n");
        }

        const payload = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Provide a comprehensive and detailed summary of this conversation and reflections.
  The goal is to compress the dialogue into a dense narrative without losing
  any specific information.

  Ensure you retain:
  - Names and roles of all people mentioned.
  - Specific technical details or project statuses.
  - Contextual details (like living arrangements or specific events).

  Return the result strictly as a JSON object with a single key "summary".

  CONVERSATION AND REFLECTIONS:
  ${summaryContent}`,
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
                summary: { type: "string" },
              },
              required: ["summary"],
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

        let summaryText = "Conversation summary unavailable";

        if (data.candidates && data.candidates[0].content.parts) {
          const rawText = data.candidates[0].content.parts[0].text;

          try {
            const jsonStartIndex = rawText.indexOf("{");
            const jsonEndIndex = rawText.lastIndexOf("}");

            if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
              const jsonString = rawText.substring(
                jsonStartIndex,
                jsonEndIndex + 1,
              );
              const parsed = JSON.parse(jsonString);
              if (parsed.summary) summaryText = parsed.summary;
            } else {
              // If no JSON found, fall back to the raw text cleaned of quotes
              summaryText = rawText.replace(/^["'`]*|["'`]*$/g, "").trim();
            }
          } catch (e) {
            console.error("JSON Parse error, falling back to raw text", e);
            summaryText = rawText.trim();
          }
        }

        // 4. TARGETED DELETE: Delete everything EXCEPT 'system' messages
        // This assumes you have an index on 'role'. If not, use:
        // await db.chats.filter(m => m.role !== 'system').delete();
        await db.chats
          .where("role")
          .anyOf(["user", "model", "assistant"])
          .delete();

        // 5. Save the new summary
        const summaryId = await db.chats.add({
          role: "system",
          text: summaryText,
          thought: "",
          timestamp: Date.now(),
        });

        // 6. UPDATE UI STATE: Keep existing system messages and add the new one
        messages.value = [
          ...messages.value.filter((msg) => msg.role === "system"),
          {
            id: summaryId,
            role: "system",
            text: summaryText,
            thought: "",
          },
        ];

        // await db.reflections.clear();
        // reflections.value = [];
        scrollToBottom();
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error("Summarize error:", error);
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
        const contents = messages.value.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        }));

        // 1. Context Injection (Facts, Insights, Themes, Goals)
        if (facts.value.length > 0) {
          const factsString = facts.value
            .map((f) => `${f.key}: ${f.value}`)
            .join("\n");
          contents.unshift({
            role: "system",
            parts: [{ text: `FACTS:\n${factsString}` }],
          });
        }

        if (reflections.value.length > 0) {
          const reflectionsString = reflections.value
            .map((ref) => `- ${ref.insight}`)
            .join("\n");
          contents.unshift({
            role: "user",
            parts: [{ text: `INSIGHTS:\n${reflectionsString}` }],
          });
        }

        if (themes.value.length > 0) {
          const themeContext = themes.value
            .slice(0, 5)
            .map((t) => t.name)
            .join(", ");
          contents.unshift({
            role: "system",
            parts: [{ text: `RECURRING LIFE THEMES: ${themeContext}` }],
          });
        }

        const activeGoals = goals.value.filter((g) => g.status === "active");
        if (activeGoals.length > 0) {
          const goalsString = activeGoals.map((g) => g.title).join(", ");
          contents.unshift({
            role: "system",
            parts: [{ text: `ACTIVE GOALS: ${goalsString}` }],
          });
        }

        const userTone = systemPrompt.value.trim();
        const finalSystemInstruction = userTone
          ? `TONE/STYLE SETTINGS: ${userTone}\n\nCORE RULES: ${CORE_SYSTEM_PROMPT}`
          : CORE_SYSTEM_PROMPT;

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
              },
              required: [
                "thought",
                "response",
                "reflection",
                "facts",
                "themes",
                "goals",
              ],
            },
            thinkingConfig: { thinkingLevel: "MINIMAL" },
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
          }
        } catch (e) {
          console.error("JSON Parse error", e);
        }

        const compactFacts =
          extractedFacts.map((f) => `${f.key}:${f.value}`).join(" · ") ||
          "none";
        const compactGoals =
          extractedGoals.map((g) => `${g.title}(${g.status})`).join(" · ") ||
          "none";

        const pathFact = extractedFacts.find(
          (f) => f.key.toLowerCase() === "path",
        );
        const currentPath = pathFact ? pathFact.value : null;

        console.log(
          `%c🤖 AI %c| %cPATH: %c${currentPath || "??"} %c| %cTHEMES: %c${extractedThemes.join(", ") || "none"}\n` +
            `%cTHOUGHT: %c${thoughtText.trim()}\n` +
            `%cREFLECT: %c${finalInsight}\n` +
            `%cFACTS:   %c${compactFacts}\n` +
            `%cGOALS:   %c${compactGoals}`,
          // Header Styles
          "color: #42b883; font-weight: bold;",
          "color: #444;",
          "color: #aaa;",
          "color: #fff; font-weight: bold;",
          "color: #444;",
          "color: #aaa;",
          "color: #eee;",
          // Body Styles (Alternate Labels and Values)
          "color: #888;",
          "color: #ccc;", // Thought
          "color: #888;",
          "color: #ccc;", // Reflect
          "color: #888;",
          "color: #42b883;", // Facts (Greenish)
          "color: #888;",
          "color: #ffb300;", // Goals (Amber)
        );

        const topicFact = extractedFacts.find(
          (f) => f.key.toLowerCase() === "current_topic",
        );
        if (topicFact) currentTopic.value = topicFact.value;

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
        const errorMsg = `❌ Error: ${error.message}`;
        const errId = await saveToDb("model", errorMsg);
        messages.value.push({ id: errId, role: "model", text: errorMsg });
      } finally {
        isLoading.value = false;
        scrollToBottom();
        nextTick(() => inputArea.value?.focus());
      }
      await updateCounts();
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
    };
  },
}).mount("#app");

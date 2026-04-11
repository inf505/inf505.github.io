const { createApp, ref, onMounted, nextTick, watch, computed } = Vue;

const CORE_SYSTEM_PROMPT = `You are an observant, insightful and honest journaling companion. You speak only English.

  TASK: Reflect on each response from the user with your deep insight.

  --- REQUIRED JSON OUTPUT ---
  ALWAYS respond only with a single, valid JSON object. No text, markdown, or commentary outside the JSON.

  The JSON object must contain exactly the following fields:

  1. "response" (string, required) – Your main response to the user's input. Keep this under 2 paragraphs. You may end with an open-ended question about the current topic, to gain more insight.
  2. "reflection" (string or null, required) – A deep insight about the message. These are YOUR internal notes about the user; keep them as brief if possible. (Using shorthand is allowed)
  3. "facts" (array of objects, required) – Any new facts you discover. Each fact must be an object with "key" and "value" strings. Keep track of "current_topic". Facts may be overwritten; update freely. If no new facts are discovered, provide an empty array [].

  ### Example JSON
  {
    "response": "That sounds like a great way to spend time together! Exercising with your son not only promotes physical health but is also a wonderful way to bond.",
    "reflection": "User sharing a personal detail about their day and seems happy about exercising with their son.",
    "facts": []
  }

  ### Example with new facts
  {
    "response": "Nice to meet you, Paul! I'm glad you're enjoying the new project.",
    "reflection": "User shared name and current project status.",
    "facts": [
      {"key": "name", "value": "Paul"},
      {"key": "project", "value": "started new project last week"}
    ]
  }
  `;

// Initialize Dexie
const db = new Dexie("GeminiLocalDB");
db.version(2).stores({
  chats: "++id, role, text, thought, timestamp",
  reflections: "++id, chatId, insight, timestamp",
  facts: "++id, key, value, timestamp",
});

createApp({
  setup() {
    const apiKey = ref("");
    const selectedModel = ref("gemma-4-31b-it");
    //gemma-4-26b-a4b-it (doesn't work anymore), gemma-4-31b-it
    const isConfigured = ref(false);
    const systemPrompt = ref("");
    const showSettings = ref(false);
    const reflections = ref([]);
    const facts = ref([]);
    const factKey = ref("");
    const factValue = ref("");

    const totalSizeKb = ref("0.0");
    const totalTokens = ref("0");

    // Chat State
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
    // Auto-expand Textarea
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
      // Load Settings
      const storedKey = localStorage.getItem("gemini_api_key");
      const storedModel = localStorage.getItem("gemini_model");
      const storedLevel = localStorage.getItem("gemini_thinking_level");

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
      } catch (err) {
        console.error("Dexie Facts Load Error:", err);
      }

      // --- NEW: Load Conversation Summary (if exists) ---
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

    const saveAllSettings = () => {
      if (apiKey.value.trim())
        localStorage.setItem("gemini_api_key", apiKey.value.trim());
      if (selectedModel.value.trim())
        localStorage.setItem("gemini_model", selectedModel.value.trim());
      localStorage.setItem("gemini_system_prompt", systemPrompt.value);
      showSettings.value = false;
    };

    const saveSettings = () => {
      if (!apiKey.value.trim() || !selectedModel.value.trim()) return;
      localStorage.setItem("gemini_api_key", apiKey.value.trim());
      localStorage.setItem("gemini_model", selectedModel.value.trim());
      isConfigured.value = true;
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

        // 3. Build summary only from non-system messages
        if (messages.value.length > 0) {
          summaryContent += "CONVERSATION:\n";
          summaryContent += messages.value
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

    const sendMessage = async () => {
      if (!currentInput.value.trim()) return;

      const userText = currentInput.value.trim();
      if (!userText || isLoading.value) return;

      const userId = await saveToDb("user", userText);
      messages.value.push({ id: userId, role: "user", text: userText });

      currentInput.value = "";
      nextTick(() => {
        if (inputArea.value) inputArea.value.style.height = "auto";
      });

      isLoading.value = true;
      scrollToBottom();

      try {
        const contents = messages.value.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        }));

        // Add facts as context
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
            parts: [
              {
                text: `INSIGHTS:\n${reflectionsString}`,
              },
            ],
          });
        }

        const userTone = systemPrompt.value.trim();
        const finalSystemInstruction = userTone
          ? `TONE/STYLE SETTINGS: ${userTone}\n\nCORE RULES: ${CORE_SYSTEM_PROMPT}`
          : CORE_SYSTEM_PROMPT;

        const payload = {
          contents,
          ...(finalSystemInstruction && {
            systemInstruction: {
              parts: [{ text: finalSystemInstruction }],
            },
          }),
        };

        // Add generationConfig with temperature and JSON response
        // thinking MINIMAL or HIGH
        payload.generationConfig = {
          temperature: 1.0,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
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
            },
            required: ["response", "reflection", "facts"],
          },
        };

        payload.generationConfig.thinkingConfig = {
          thinkingLevel: "HIGH",
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

        // console.log(
        //   "candidatesTokenCount: ",
        //   data.usageMetadata.candidatesTokenCount,
        // );
        // console.log("promptTokenCount: ", data.usageMetadata.promptTokenCount);
        //console.log("Token Count: ", data.usageMetadata.totalTokenCount);

        totalTokens.value =
          data.usageMetadata.totalTokenCount.toLocaleString("en-US");

        if (data.candidates && data.candidates[0].content.parts) {
          for (const part of data.candidates[0].content.parts) {
            if (part.thought) {
              thoughtText += (part.text || "") + "\n\n";
            } else if (part.text) {
              let text = part.text;
              // Clean up any <think> tags embedded in the text
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

        console.log(responseText);

        // Try to parse as JSON and extract "response", "reflection", and "facts" fields
        let finalResponse = responseText.trim() || "*(No response text)*";
        let finalInsight = null;
        let extractedFacts = [];
        try {
          const parsed = JSON.parse(finalResponse);
          if (parsed.response) {
            finalResponse = parsed.response;
          }
          if (parsed.reflection) {
            finalInsight = parsed.reflection;
          }
          if (parsed.facts && Array.isArray(parsed.facts)) {
            extractedFacts = parsed.facts;
          }
        } catch (e) {
          // Not JSON, use as-is
          console.log(e, responseText);
        }

        const finalThought = thoughtText.trim();

        const modelId = await saveToDb("model", finalResponse, finalThought);
        if (finalInsight) {
          await saveReflection(modelId, finalInsight);
        }

        // Save any extracted facts
        for (const fact of extractedFacts) {
          if (fact.key && fact.value) {
            await upsertFact(fact.key, fact.value);
            //console.log("Auto-saved fact:", fact.key, "=", fact.value);
          }
        }

        messages.value.push({
          id: modelId,
          role: "model",
          text: finalResponse,
          thought: finalThought,
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

    return {
      apiKey,
      selectedModel,
      isConfigured,
      saveSettings,
      renderMarkdown,
      messages,
      currentInput,
      isLoading,
      isSummarizing,
      messagesContainer,
      sendMessage,
      inputArea,
      deleteMessage,
      systemPrompt,
      showSettings,
      saveAllSettings,
      reflections,
      summarizeAndArchive,
      facts,
      upsertFact,
      factKey,
      factValue,
      addFact,
      deleteFact,
      totalSizeKb,
      totalTokens,
      scrollToBottom,
    };
  },
}).mount("#app");

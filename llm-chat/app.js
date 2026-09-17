const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

// --- COMMON ASSET INJECTION HELPERS ---
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();

    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

const loadStylesheet = (href) => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

const escapeHtml = (str) => {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// --- DYNAMIC KATEX & MHCHEM ON-DEMAND LOADER ---
let katexLoadingPromise = null;

const hasMathSyntax = (text) => {
  if (!text) return false;
  return /(?:\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\(.+?\\\)|\x5cce\{|(?<![\$\\])\$(?!\s|\d)(?:[^\$\n]|\\\$)+?(?<!\s)\$(?!\d))/.test(text);
};

const hasMhchemSyntax = (text) => {
  if (!text) return false;
  return /\\ce\{/.test(text);
};

const ensureKaTeXLoaded = async (includeMhchem = false) => {
  if (!katexLoadingPromise) {
    katexLoadingPromise = (async () => {
      loadStylesheet("https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css");
      if (!window.katex) {
        await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js");
      }
    })();
  }
  await katexLoadingPromise;

  if (includeMhchem && (!window.katex || !window.katex.__mhchemLoaded)) {
    await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/contrib/mhchem.min.js");
    if (window.katex) window.katex.__mhchemLoaded = true;
  }

  return window.katex;
};

// --- DYNAMIC CODE HIGHLIGHTING (HIGHLIGHT.JS) ON-DEMAND LOADER ---
let hljsLoadingPromise = null;

const hasCodeSyntax = (text) => {
  if (!text) return false;
  return /(?:```|~~~)/.test(text);
};

const ensureHighlightLoaded = async () => {
  if (!hljsLoadingPromise) {
    hljsLoadingPromise = (async () => {
      loadStylesheet("https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/atom-one-dark.min.css");
      if (!window.hljs) {
        await loadScript("https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js");
      }
    })();
  }
  await hljsLoadingPromise;
  return window.hljs;
};

// --- DYNAMIC MERMAID.JS ON-DEMAND LOADER ---
let mermaidLoadingPromise = null;

const hasMermaidSyntax = (text) => {
  if (!text) return false;
  return /```\s*mermaid/i.test(text);
};

const ensureMermaidLoaded = async () => {
  if (!mermaidLoadingPromise) {
    mermaidLoadingPromise = (async () => {
      if (!window.mermaid) {
        await loadScript("https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js");
      }
      if (window.mermaid) {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose"
        });
      }
    })();
  }
  await mermaidLoadingPromise;
  return window.mermaid;
};

// --- MARKED PARSER EXTENSIONS (FOOTNOTES + CODE/MERMAID HOOKS) ---
if (window.markedFootnote) {
  marked.use(window.markedFootnote());
}

marked.use({
  renderer: {
    code(codeOrToken, infostring) {
      let code = "";
      let lang = "";
      if (typeof codeOrToken === "object" && codeOrToken !== null) {
        code = codeOrToken.text || "";
        lang = codeOrToken.lang || "";
      } else {
        code = codeOrToken || "";
        lang = infostring || "";
      }
      lang = (lang || "").trim().toLowerCase();

      // Mermaid diagram fence
      if (lang === "mermaid") {
        return `<div class="mermaid-container"><pre class="mermaid">${escapeHtml(code)}</pre></div>`;
      }

      // Syntax highlighting via Highlight.js
      if (window.hljs) {
        let highlighted = "";
        if (lang && window.hljs.getLanguage(lang)) {
          try {
            highlighted = window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
          } catch (e) {
            highlighted = escapeHtml(code);
          }
        } else {
          try {
            highlighted = window.hljs.highlightAuto(code).value;
          } catch (e) {
            highlighted = escapeHtml(code);
          }
        }
        return `<pre><code class="hljs ${lang ? 'language-' + lang : ''}">${highlighted}</code></pre>`;
      }

      return `<pre><code class="${lang ? 'language-' + lang : ''}">${escapeHtml(code)}</code></pre>`;
    }
  }
});

// --- DOMPURIFY SANITIZATION (SECURITY HARDENING) ---
const sanitizeHtml = (dirtyHtml) => {
  if (!window.DOMPurify) return dirtyHtml;
  return window.DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true, svg: true, mathMl: true },
    ADD_TAGS: ["foreignObject", "use", "section"],
    ADD_ATTR: [
      "target",
      "rel",
      "aria-hidden",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "role",
      "tabindex",
      "data-footnote-ref",
      "data-footnotes",
      "data-footnote-backref"
    ]
  });
};

// --- DATABASE SCHEMA ---
const db = new Dexie("LLMChatDB");

db.version(3).stores({
  chats: "++id, role, text, thought, timestamp",
  facts: "++id, text, category, timestamp",
  archives: "++id, text, timestamp"
});

// v4 Schema with Multi-Session (Topics) Drawer Support
db.version(4).stores({
  sessions: "++id, title, updated",
  chats: "++id, sessionId, role, text, thought, timestamp",
  facts: "++id, sessionId, text, category, timestamp",
  archives: "++id, sessionId, text, timestamp"
}).upgrade(async (trans) => {
  const sessions = await trans.sessions.toArray();
  let defaultSessionId;
  if (sessions.length === 0) {
    defaultSessionId = await trans.sessions.add({ title: "General Exploration", updated: Date.now() });
  } else {
    defaultSessionId = sessions[0].id;
  }

  await trans.chats.toCollection().modify(chat => { if (!chat.sessionId) chat.sessionId = defaultSessionId; });
  await trans.facts.toCollection().modify(fact => { if (!fact.sessionId) fact.sessionId = defaultSessionId; });
  await trans.archives.toCollection().modify(arc => { if (!arc.sessionId) arc.sessionId = defaultSessionId; });
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

const normalizeCategory = (rawTag, fallback = "Fact") => {
  if (!rawTag) return fallback;
  const cleaned = rawTag.trim().replace(/^#+/, "");
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

// Iteration 9: Preset Directive Maps
const PERSONA_PRESETS = {
  socratic: "You are a Socratic Dialogue Partner. Ask probing questions, challenge assumptions, and guide the user to discover underlying truths through critical inquiry.",
  feynman: "You are a Feynman Educator. Explain complex concepts using intuitive, simple analogies. Break down difficult topics so they are easy to understand without losing accuracy.",
  devil: "You are a Devil's Advocate. Your goal is to critique arguments, highlight logical fallacies, and present strong opposing stances to test the robustness of the user's ideas.",
  scholar: "You are a Historical & Patristic Scholar. Focus heavily on primary sources, historical context, textual exegesis, and the evolution of thought over time. Use academic citations when referencing sources.",
  reviewer: "You are an Academic / Technical Peer Reviewer. Engage at a graduate-level of technical depth, demanding rigor, precise terminology, and robust evidence. Provide structured references.",
  custom: "You are an expert dialogue partner."
};

const DEPTH_PRESETS = {
  eli5: "Keep explanations extremely simple, accessible, and free of unnecessary jargon. Explain as if to an intelligent beginner (ELI5).",
  balanced: "Maintain a standard, balanced academic tone. Use appropriate terminology but ensure clarity for a general educated audience.",
  deep: "Use maximal academic and technical rigor. Do not shy away from complex jargon, deep theoretical nuances, or advanced conceptual frameworks."
};

createApp({
  setup() {
    const baseUrl = ref("https://api.openai.com/v1");
    const apiKey = ref("");
    const selectedModel = ref("gpt-4o-mini");
    const isConfigured = ref(false);
    const systemPrompt = ref("");

    // Reactive flags for on-demand lazy assets
    const katexReady = ref(false);
    const highlightReady = ref(false);
    const mermaidReady = ref(false);

    // Persona & Depth Reactive State
    const selectedPersona = ref("socratic");
    const personaDirective = ref(PERSONA_PRESETS.socratic);

    const selectedDepth = ref("balanced");
    const customDepthDirective = ref("");
    const quickDepthChips = ref([
      "Executive Summary",
      "Metaphor-only",
      "Post-Doctoral Rigor",
      "Code-heavy",
      "Bullet Points Only",
      "Culinary Analogies Only"
    ]);

    const sessions = ref([]);
    const currentSessionId = ref(null);
    const isDrawerOpen = ref(false);

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

    // Facts state
    const newFactText = ref("");
    const newFactCategory = ref("");
    const facts = ref([]);
    const activeFactTagFilter = ref("ALL");
    const editingFactId = ref(null);
    const editingFactText = ref("");
    const editingFactCategory = ref("");

    const summaryBatchSize = ref(10);
    const editingMsgId = ref(null);
    const editingMsgText = ref("");
    const archivedSummaries = ref([]);
    const superSummaryBatchSize = ref(5);
    const isSuperSummarizing = ref(false);

    const modelJail = ref({});

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

    const onPersonaChange = () => {
      if (PERSONA_PRESETS[selectedPersona.value]) {
        personaDirective.value = PERSONA_PRESETS[selectedPersona.value];
      }
    };

    const setQuickDepth = (chip) => {
      selectedDepth.value = "custom";
      customDepthDirective.value = chip;
    };

    const getRequestConfig = (modelName) => {
      const trimmed = modelName.trim().toLowerCase();
      const isDirectGoogle = trimmed.startsWith("gemini-") || trimmed.startsWith("gemma-");

      if (isDirectGoogle) {
        const key = geminiApiKey.value.trim() || apiKey.value.trim();
        return {
          url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          key: key,
          isDirectGoogle: true
        };
      }

      return {
        url: `${baseUrl.value.replace(/\/$/, "")}/chat/completions`,
        key: apiKey.value.trim(),
        isDirectGoogle: false
      };
    };

    const getNextAvailableModel = (attemptedInThisTurn = []) => {
      const models = getModelList();
      const now = Date.now();

      const available = models.find(
        (m) => (!modelJail.value[m] || modelJail.value[m] <= now) && !attemptedInThisTurn.includes(m)
      );
      if (available) return available;

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
        nextTick(renderMermaidDiagrams);
      } catch (err) {
        console.error("Error saving edited message:", err);
        alert("Failed to save changes.");
      }
    };

    // --- FACTS INLINE CRUD & FILTERING ---
    const uniqueFactTags = computed(() => {
      const set = new Set();
      facts.value.forEach((f) => {
        if (f.category) set.add(f.category);
      });
      return Array.from(set);
    });

    const filteredFacts = computed(() => {
      if (activeFactTagFilter.value === "ALL") {
        return facts.value;
      }
      return facts.value.filter(
        (f) => (f.category || "").toLowerCase() === activeFactTagFilter.value.toLowerCase()
      );
    });

    const startEditFact = (fact) => {
      editingFactId.value = fact.id;
      editingFactText.value = fact.text;
      editingFactCategory.value = fact.category;
    };

    const cancelEditFact = () => {
      editingFactId.value = null;
      editingFactText.value = "";
      editingFactCategory.value = "";
    };

    const saveEditFact = async (factId) => {
      if (!editingFactText.value.trim()) return;
      const category = normalizeCategory(editingFactCategory.value, "Fact");
      const text = editingFactText.value.trim();

      try {
        await db.facts.update(factId, {
          category: category,
          text: text,
          timestamp: Date.now()
        });
        editingFactId.value = null;
        editingFactText.value = "";
        editingFactCategory.value = "";
        await loadFacts();
        await updateCounts();
      } catch (err) {
        console.error("Error updating fact:", err);
        alert("Failed to update fact: " + err.message);
      }
    };

    const loadSessions = async () => {
      sessions.value = await db.sessions.orderBy("updated").reverse().toArray();
      if (sessions.value.length === 0) {
        const id = await db.sessions.add({ title: "General Exploration", updated: Date.now() });
        currentSessionId.value = id;
        sessions.value = await db.sessions.orderBy("updated").reverse().toArray();
      } else if (!currentSessionId.value) {
        currentSessionId.value = sessions.value[0].id;
      }
    };

    const loadCurrentSessionData = async () => {
      if (!currentSessionId.value) return;
      messages.value = await db.chats.where({ sessionId: currentSessionId.value }).sortBy("timestamp");
      await loadFacts();
      await loadArchives();
      await updateCounts();
      scrollToBottom();
      nextTick(renderMermaidDiagrams);
    };

    const switchSession = async (id) => {
      currentSessionId.value = id;
      isDrawerOpen.value = false;
      activeFactTagFilter.value = "ALL";
      cancelEditFact();
      await loadCurrentSessionData();
    };

    const createNewSession = async () => {
      const title = prompt("Enter a title for the new topic:", "New Topic");
      if (!title) return;
      const id = await db.sessions.add({ title: title.trim(), updated: Date.now() });
      await loadSessions();
      await switchSession(id);
    };

    const deleteSession = async (id) => {
      if (!confirm("Are you sure you want to delete this topic and all its data?")) return;
      await db.transaction('rw', db.sessions, db.chats, db.facts, db.archives, async () => {
        await db.sessions.delete(id);
        await db.chats.where({ sessionId: id }).delete();
        await db.facts.where({ sessionId: id }).delete();
        await db.archives.where({ sessionId: id }).delete();
      });
      if (currentSessionId.value === id) {
        currentSessionId.value = null;
      }
      await loadSessions();
      if (sessions.value.length > 0 && !currentSessionId.value) {
        await switchSession(sessions.value[0].id);
      } else if (sessions.value.length === 0) {
        await loadSessions();
        await loadCurrentSessionData();
      }
    };

    const loadFacts = async () => {
      if (!currentSessionId.value) return;
      try {
        const data = await db.facts.where({ sessionId: currentSessionId.value }).sortBy("timestamp");
        facts.value = data;
      } catch (err) {
        console.error("Error loading facts:", err);
      }
    };

    const loadArchives = async () => {
      if (!currentSessionId.value) return;
      try {
        const data = await db.archives.where({ sessionId: currentSessionId.value }).reverse().sortBy("timestamp");
        archivedSummaries.value = data;
      } catch (err) {
        console.error("Error loading archives:", err);
      }
    };

    const deleteFact = async (id) => {
      await db.facts.delete(id);
      if (editingFactId.value === id) cancelEditFact();
      await loadFacts();
      await updateCounts();
    };

    const addManualFact = async () => {
      if (!newFactText.value.trim() || !currentSessionId.value) return;
      const category = normalizeCategory(newFactCategory.value, "Fact");

      try {
        await db.facts.add({
          sessionId: currentSessionId.value,
          text: newFactText.value.trim(),
          category: category,
          timestamp: Date.now(),
        });

        newFactText.value = "";
        newFactCategory.value = "";
        await loadFacts();
        await updateCounts();
      } catch (err) {
        console.error("Error adding manual fact:", err);
      }
    };

    const optimizeFacts = async () => {
      if (!apiKey.value || facts.value.length < 2 || !currentSessionId.value) return;
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
          await db.facts.where({ sessionId: currentSessionId.value }).delete();
          if (latestTimeFact) {
            latestTimeFact.sessionId = currentSessionId.value;
            await db.facts.add(latestTimeFact);
          }
          for (const f of otherFacts) {
            f.sessionId = currentSessionId.value;
            await db.facts.add(f);
          }
          await loadFacts();
          isOptimizingFacts.value = false;
          return;
        }

        const prompt = `You are an AI knowledge base manager for an intellectual discussion. Your task is to optimize an array of established concepts, premises, and contextual notes.

RULES:
1. Merge duplicate concepts and resolve contradictions. Combine all known details about a specific topic or premise into a single, comprehensive entry.
2. Preserve core definitions, philosophical stances, academic citations, and ongoing debate rules. Do not delete unique ideas.
3. Maintain appropriate, descriptive categories.

INPUT DATA:
${JSON.stringify(cleanFactsForAI, null, 2)}

You MUST return a valid JSON object matching this schema format:
{
  "merged_facts": [
    {
      "text": "The details of the fact/concept",
      "category": "Category tag name"
    }
  ]
}`;

        const activeModel = getNextAvailableModel();
        const { url, key } = getRequestConfig(activeModel);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`
          },
          body: JSON.stringify({
            model: activeModel,
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
            await db.facts.where({ sessionId: currentSessionId.value }).delete();

            if (latestTimeFact) {
              await db.facts.add({
                sessionId: currentSessionId.value,
                text: latestTimeFact.text,
                category: latestTimeFact.category,
                timestamp: Date.now(),
              });
            }

            for (const mf of parsed.merged_facts) {
              await db.facts.add({
                sessionId: currentSessionId.value,
                text: mf.text,
                category: mf.category,
                timestamp: Date.now(),
              });
            }
            await loadFacts();
            await updateCounts();
          }
        }
      } catch (err) {
        console.error("Optimization Error:", err);
      } finally {
        isOptimizingFacts.value = false;
      }
    };

    // --- HARDENED KATEX PRE-PROCESSOR ---
    const renderMathInText = (text) => {
      if (!window.katex) return text;

      // 1. Display math: $$...$$ or \[...\]
      text = text.replace(/(\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])/g, (match, full, inner1, inner2) => {
        const formula = (inner1 || inner2 || "").trim();
        if (!formula) return match;
        try {
          return window.katex.renderToString(formula, { displayMode: true, throwOnError: false });
        } catch (e) {
          return match;
        }
      });

      // 2. Explicit LaTeX inline: \(...\)
      text = text.replace(/\\\(([\s\S]+?)\\\)/g, (match, inner) => {
        const formula = (inner || "").trim();
        if (!formula) return match;
        try {
          return window.katex.renderToString(formula, { displayMode: false, throwOnError: false });
        } catch (e) {
          return match;
        }
      });

      // 3. Currency-safe inline math: $...$
      text = text.replace(/(?<![\$\\])\$(?!\s|\d)((?:[^\$\n]|\\\$)+?)(?<!\s)\$(?!\d)/g, (match, inner) => {
        const formula = (inner || "").trim();
        if (!formula) return match;
        try {
          return window.katex.renderToString(formula, { displayMode: false, throwOnError: false });
        } catch (e) {
          return match;
        }
      });

      return text;
    };

    // --- MERMAID POST-RENDER PASS ---
    const renderMermaidDiagrams = async () => {
      if (!window.mermaid) return;
      await nextTick();
      try {
        const unrenderedNodes = document.querySelectorAll(".mermaid:not([data-processed='true'])");
        if (unrenderedNodes.length > 0) {
          await window.mermaid.run({
            nodes: Array.from(unrenderedNodes),
            suppressErrors: true
          });
        }
      } catch (err) {
        console.warn("Mermaid rendering warning:", err);
      }
    };

    const renderMarkdown = (text) => {
      if (!text) return "";

      // 1. Math syntax detection & lazy load
      if (hasMathSyntax(text)) {
        const needsMhchem = hasMhchemSyntax(text);
        if (!window.katex || (needsMhchem && !window.katex.__mhchemLoaded)) {
          ensureKaTeXLoaded(needsMhchem)
            .then(() => {
              katexReady.value = true;
            })
            .catch((err) => console.error("Failed to load KaTeX:", err));
        }
      }

      // 2. Code syntax detection & lazy load
      if (hasCodeSyntax(text)) {
        if (!window.hljs) {
          ensureHighlightLoaded()
            .then(() => {
              highlightReady.value = true;
            })
            .catch((err) => console.error("Failed to load Highlight.js:", err));
        }
      }

      // 3. Mermaid diagram detection & lazy load
      if (hasMermaidSyntax(text)) {
        if (!window.mermaid) {
          ensureMermaidLoaded()
            .then(() => {
              mermaidReady.value = true;
              nextTick(renderMermaidDiagrams);
            })
            .catch((err) => console.error("Failed to load Mermaid:", err));
        } else {
          nextTick(renderMermaidDiagrams);
        }
      }

      // Reading reactive flags establishes dependencies so Vue re-evaluates as bundles load
      const _k = katexReady.value;
      const _h = highlightReady.value;
      const _m = mermaidReady.value;

      // KaTeX math rendered first to protect subscripts and asterisks from marked
      const mathRenderedText = window.katex ? renderMathInText(text) : text;

      // Parse markdown with marked (includes footnote extension and code highlight/mermaid hooks)
      const rawHtml = marked.parse(mathRenderedText);

      // DOMPurify sanitization pipeline (whitelists KaTeX MathML/SVG, Mermaid, and citations)
      return sanitizeHtml(rawHtml);
    };

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
            return `${m.role === "user" ? "USER" : "AI"}: ${text}`;
          })
          .join("\n\n");

        const prompt = `Summarize the following chronological excerpt of a discussion into a highly dense, information-packed paragraph.
Focus entirely on critical intellectual progression, major breakthroughs, and core concepts.

CRITICAL RULES:
1. SHIFT POV: Write objectively about the discussion in the third-person.
2. MAXIMIZE DENSITY: Strip out conversational fluff. Condense the events into concise, factual narrative history.

DISCUSSION EXCERPT:
${transcript}

OUTPUT REQUIREMENTS:
Do not use JSON. Output a <think>...</think> tag with your brief analysis of events, followed by the dense summary paragraph.`;

        const activeModel = getNextAvailableModel();
        const { url, key } = getRequestConfig(activeModel);

        const payload = {
          model: activeModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        };

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error?.message || "Summarization API failed");

        let summaryText = "";
        let thoughtText = "";

        if (data.choices && data.choices[0] && data.choices[0].message) {
          let msgObj = data.choices[0].message;
          let rawText = msgObj.content || "";

          if (msgObj.reasoning) {
            thoughtText += msgObj.reasoning.trim() + "\n\n";
          } else if (msgObj.reasoning_content) {
            thoughtText += msgObj.reasoning_content.trim() + "\n\n";
          }

          rawText = rawText.replace(
            /<(think|thought|thinking)>([\s\S]*?)<\/\1>/gi,
            (m, tag, inner) => {
              thoughtText += inner.trim() + "\n\n";
              return "";
            }
          );

          summaryText = rawText.trim();
        }

        if (!summaryText) throw new Error("Received empty summary from AI.");

        const lastItem = msgsToSummarize[msgsToSummarize.length - 1];
        let baseTimestamp = lastItem.timestamp;

        if (!baseTimestamp || isNaN(baseTimestamp)) {
          const dbItem = await db.chats.get(lastItem.id);
          baseTimestamp = dbItem && !isNaN(dbItem.timestamp) ? dbItem.timestamp : Date.now();
        }

        await db.transaction('rw', db.chats, async () => {
          for (const m of msgsToSummarize) {
            await db.chats.delete(m.id);
          }

          await db.chats.add({
            sessionId: currentSessionId.value,
            role: "summary",
            text: summaryText,
            thought: "",
            options: null,
            timestamp: baseTimestamp + 1,
          });
        });

        messages.value = await db.chats.where({ sessionId: currentSessionId.value }).sortBy("timestamp");
        await updateCounts();
        nextTick(renderMermaidDiagrams);

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
        m.role === "summary" && !m.text.includes("[THE DISCUSSION SO FAR]")
      );

      if (candidates.length < batchSize) {
        alert(`Not enough chapter summaries. You requested ${batchSize}, but only have ${candidates.length} available.`);
        return;
      }

      const warnMsg = `This will compress the oldest ${batchSize} Chapter Summaries into a single "Discussion So Far" entry, and move the originals to your Archive. Continue?`;
      if (!confirm(warnMsg)) return;

      isSuperSummarizing.value = true;

      try {
        const msgsToSummarize = candidates.slice(0, batchSize);
        const transcript = msgsToSummarize
          .map((m, i) => `CHAPTER ${i + 1}:\n${m.text}`)
          .join("\n\n");

        const prompt = `You are an expert summarizer. Summarize the following sequential summaries into a single, cohesive "The Discussion So Far" narrative arc.
Focus entirely on the overarching progression, major milestones, and critical insights. Do not lose the main thread.

PREVIOUS SUMMARIES:
${transcript}

OUTPUT REQUIREMENTS:
Do not use JSON. Output a <think>...</think> tag with your internal analysis, followed by the overarching summary block.`;

        const activeModel = getNextAvailableModel();
        const { url, key } = getRequestConfig(activeModel);

        const payload = {
          model: activeModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        };

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Super Summarize failed");

        let summaryText = "";
        let thoughtText = "";
        if (data.choices && data.choices[0] && data.choices[0].message) {
          let msgObj = data.choices[0].message;
          let rawText = msgObj.content || "";

          if (msgObj.reasoning) {
            thoughtText += msgObj.reasoning.trim() + "\n\n";
          } else if (msgObj.reasoning_content) {
            thoughtText += msgObj.reasoning_content.trim() + "\n\n";
          }

          rawText = rawText.replace(
            /<(think|thought|thinking)>([\s\S]*?)<\/\1>/gi,
            (m, tag, inner) => {
              thoughtText += inner.trim() + "\n\n";
              return "";
            }
          );

          summaryText = rawText.trim();
        }

        if (!summaryText) throw new Error("Received empty summary.");

        const lastItem = msgsToSummarize[msgsToSummarize.length - 1];
        let baseTimestamp = lastItem.timestamp;

        if (!baseTimestamp || isNaN(baseTimestamp)) {
          const dbItem = await db.chats.get(lastItem.id);
          baseTimestamp = dbItem && !isNaN(dbItem.timestamp) ? dbItem.timestamp : Date.now();
        }

        await db.transaction('rw', db.chats, db.archives, async () => {
          for (const m of msgsToSummarize) {
            await db.archives.add({
              sessionId: currentSessionId.value,
              text: m.text,
              timestamp: m.timestamp || baseTimestamp
            });
            await db.chats.delete(m.id);
          }

          await db.chats.add({
            sessionId: currentSessionId.value,
            role: "summary",
            text: `**[THE DISCUSSION SO FAR]**\n\n${summaryText}`,
            thought: "",
            options: null,
            timestamp: baseTimestamp + 1,
          });
        });

        messages.value = await db.chats.where({ sessionId: currentSessionId.value }).sortBy("timestamp");
        await loadArchives();
        await updateCounts();
        nextTick(renderMermaidDiagrams);

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
        const chats = await db.chats.where({ sessionId: currentSessionId.value }).toArray();
        const facts = await db.facts.where({ sessionId: currentSessionId.value }).toArray();

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

    watch(messages, () => {
      nextTick(renderMermaidDiagrams);
    }, { deep: true });

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

      const storedPersona = localStorage.getItem("story_persona");
      if (storedPersona) selectedPersona.value = storedPersona;

      const storedDirective = localStorage.getItem("story_persona_directive");
      if (storedDirective !== null) {
        personaDirective.value = storedDirective;
      } else if (PERSONA_PRESETS[selectedPersona.value]) {
        personaDirective.value = PERSONA_PRESETS[selectedPersona.value];
      }

      const storedDepth = localStorage.getItem("story_depth");
      if (storedDepth) selectedDepth.value = storedDepth;

      const storedDepthDirective = localStorage.getItem("story_depth_directive");
      if (storedDepthDirective !== null) {
        customDepthDirective.value = storedDepthDirective;
      }

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

      await loadSessions();

      try {
        await loadCurrentSessionData();

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
    });

    const saveAllSettings = () => {
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
      localStorage.setItem("story_persona_directive", personaDirective.value);
      localStorage.setItem("story_depth", selectedDepth.value);
      localStorage.setItem("story_depth_directive", customDepthDirective.value);

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

    const saveToDb = async (role, text, thought = "") => {
      const id = await db.chats.add({
        sessionId: currentSessionId.value,
        role,
        text,
        thought,
        options: null,
        timestamp: Date.now(),
      });
      await db.sessions.update(currentSessionId.value, { updated: Date.now() });
      await loadSessions();
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
        "Are you sure? This will permanently delete the current topic discussion AND all remembered facts.";
      if (!confirm(warnMsg)) return;

      await db.chats.where({ sessionId: currentSessionId.value }).delete();
      await db.facts.where({ sessionId: currentSessionId.value }).delete();
      await db.archives.where({ sessionId: currentSessionId.value }).delete();

      messages.value = [];
      facts.value = [];
      archivedSummaries.value = [];
      activeFactTagFilter.value = "ALL";
      cancelEditFact();

      await updateCounts();

      if (apiKey.value) {
        initializeStory();
      } else {
        showSettings.value = true;
      }
    };

    const initializeStory = async () => {
      if (isLoading.value) return;

      const starterMessage = "Let's begin our discussion.";
      const userId = await saveToDb("user", starterMessage);

      messages.value.push({
        id: userId,
        role: "user",
        text: starterMessage,
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
      const personaText = personaDirective.value.trim()
        ? personaDirective.value.trim()
        : (PERSONA_PRESETS[selectedPersona.value] || "You are an expert dialogue partner.");

      let depthText = "";
      if (selectedDepth.value === "custom") {
        depthText = customDepthDirective.value.trim()
          ? `DEPTH & STYLE CONSTRAINT:\n${customDepthDirective.value.trim()}`
          : "DEPTH: Tailor depth to the user's explicit level of understanding.";
      } else if (DEPTH_PRESETS[selectedDepth.value]) {
        depthText = `DEPTH:\n${DEPTH_PRESETS[selectedDepth.value]}`;
      } else {
        depthText = `DEPTH:\n${DEPTH_PRESETS.balanced}`;
      }

      return `TASK: Engage with the user in rigorous, nuanced discussions based on the provided topic.

PERSONA & TONE:
${personaText}

${depthText}

RICH FORMATTING & EXPRESSION CAPABILITIES:
The user interface natively supports rich Markdown rendering. Use the following formatting tools whenever they elevate clarity:
- Mathematical & Scientific Notation: Use LaTeX notation ($...$ for inline, $$...$$ for display equations) and \\ce{...} for chemical formulas.
- Code & Scripts: Specify the language identifier on all fenced code blocks (e.g., \`\`\`python, \`\`\`javascript) for syntax highlighting.
- Visual Logic & Diagrams: When explaining workflows, causal chains, argument trees, or timelines, use \`\`\`mermaid fenced blocks (flowcharts, sequence diagrams, mindmaps).
- Scholarly Citations: Use Markdown footnotes ([^1] and [^1]: Author, *Work*, Year) when quoting sources or referencing academic literature.

PERSISTENT KNOWLEDGE BASE & AUTONOMOUS MEMORY:
You possess an active, persistent Knowledge Base. When you establish an important core conclusion, agree on an immutable premise, define a critical term, or discover an evolving variable that must persist across future turns, record it in your response using:
<fact category="TagName">Fact details or state value</fact>
The category tag will be indexed for future turns. Keep the text inside the fact concise, objective, and self-contained. You may emit multiple <fact> tags if necessary.

USER CUSTOM INSTRUCTIONS / TOPIC:
${systemPrompt.value || "(None provided. Drive the conversation based on the user's input.)"}

OUTPUT REQUIREMENTS:
Please format your response in standard Markdown prose. Do not output raw JSON objects.
If you need to reason, brainstorm, or plan your response, do so natively in a <think>...</think> block before outputting your response.`;
    };

    const triggerAIResponse = async () => {
      isLoading.value = true;
      scrollToBottom();

      try {
        const allFacts = await db.facts.where({ sessionId: currentSessionId.value }).toArray();
        const factsSummary = allFacts
          .map((f) => `- [${f.category.toUpperCase()}] ${f.text}`)
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
${factsSummary || "No facts established yet."}
[END KNOWLEDGE BASE]

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

        while (attemptedInThisTurn.length < modelList.length) {
          activeModel = getNextAvailableModel(attemptedInThisTurn);
          attemptedInThisTurn.push(activeModel);

          console.log(`🤖 Requesting response from: ${activeModel}`);

          const { url, key } = getRequestConfig(activeModel);

          if (!key) {
            throw new Error(`No API key configured for model: ${activeModel}`);
          }

          const payload = {
            model: activeModel,
            messages: messagesPayload,
            temperature: 0.7,
            max_tokens: 4096,
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errMsg = errorData.error?.message || "";

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
            break;
          } catch (error) {
            clearTimeout(timeoutId);

            if ((error.name === "AbortError" || error.message.includes("Failed to fetch")) && attemptedInThisTurn.length < modelList.length) {
              console.warn(`⏳ Model ${activeModel} timed out or network failed. Putting in jail...`);
              putModelInJail(activeModel, 5);
              continue;
            }

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
          let msgObj = data.choices[0].message;
          let messageContent = msgObj.content || "";

          if (msgObj.reasoning) {
            thoughtText += msgObj.reasoning.trim() + "\n\n";
          } else if (msgObj.reasoning_content) {
            thoughtText += msgObj.reasoning_content.trim() + "\n\n";
          }

          if (messageContent) {
            messageContent = messageContent.replace(
              /<(think|thought|thinking)>([\s\S]*?)<\/\1>/gi,
              (m, tag, inner) => {
                thoughtText += inner.trim() + "\n\n";
                return "";
              }
            );
            responseText = messageContent;
          }
        }

        // Parse model-emitted <fact> tags
        const factRegex = /<fact(?:\s+category=["']?([^"'>]+)["']?)?>([\s\S]*?)<\/fact>/gi;
        let match;
        const emittedFacts = [];

        while ((match = factRegex.exec(responseText)) !== null) {
          const rawCat = match[1];
          const factBody = match[2] ? match[2].trim() : "";
          if (factBody) {
            emittedFacts.push({
              category: normalizeCategory(rawCat, "Fact"),
              text: factBody
            });
          }
        }

        if (emittedFacts.length > 0 && currentSessionId.value) {
          for (const ef of emittedFacts) {
            await db.facts.add({
              sessionId: currentSessionId.value,
              category: ef.category,
              text: ef.text,
              timestamp: Date.now()
            });
            console.log(`🧠 [AI MODEL EMITTED FACT] [${ef.category}] ${ef.text}`);
          }
          await loadFacts();
          await updateCounts();
        }

        // Scrub <fact> tags from visible prose
        responseText = responseText
          .replace(/<fact(?:\s+category=["']?[^"'>]+["']?)?>[\s\S]*?<\/fact>/gi, "")
          .replace(/\n{3,}/g, "\n\n");

        let finalResponse = responseText.trim() || "*(No response text)*";
        let finalThoughtString = thoughtText.trim();

        const modelId = await saveToDb(
          "model",
          finalResponse,
          finalThoughtString
        );

        messages.value.push({
          id: modelId,
          role: "model",
          text: finalResponse,
          thought: finalThoughtString,
          options: null,
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

        const isMobile = window.matchMedia("(pointer: coarse)").matches || ('ontouchstart' in window);
        if (!isMobile) {
          nextTick(() => inputArea.value?.focus());
        }
      }
      await updateCounts();
      nextTick(renderMermaidDiagrams);
    };

    // --- SEND MESSAGE WITH SLASH COMMAND INTERCEPTORS ---
    const sendMessage = async () => {
      const userText = currentInput.value.trim();
      if (!userText || isLoading.value) return;

      // 1. /persona command
      const personaMatch = userText.match(/^\/persona(?:\s+([\s\S]+))?$/i);
      if (personaMatch) {
        const directiveArg = (personaMatch[1] || "").trim();
        const lowerArg = directiveArg.toLowerCase();

        if (PERSONA_PRESETS[lowerArg]) {
          selectedPersona.value = lowerArg;
          personaDirective.value = PERSONA_PRESETS[lowerArg];
        } else if (directiveArg) {
          selectedPersona.value = "custom";
          personaDirective.value = directiveArg;
        } else {
          selectedPersona.value = "socratic";
          personaDirective.value = PERSONA_PRESETS.socratic;
        }

        localStorage.setItem("story_persona", selectedPersona.value);
        localStorage.setItem("story_persona_directive", personaDirective.value);
        console.log(`🎭 [PERSONA UPDATED] Mode: ${selectedPersona.value} | Directive: ${personaDirective.value}`);

        currentInput.value = "";
        nextTick(() => {
          if (inputArea.value) inputArea.value.style.height = "auto";
        });
        return;
      }

      // 2. /depth command
      const depthMatch = userText.match(/^\/depth(?:\s+([\s\S]+))?$/i);
      if (depthMatch) {
        const depthArg = (depthMatch[1] || "").trim();
        const lowerDepth = depthArg.toLowerCase();

        if (lowerDepth === "eli5") {
          selectedDepth.value = "eli5";
        } else if (lowerDepth === "balanced") {
          selectedDepth.value = "balanced";
        } else if (lowerDepth === "academic" || lowerDepth === "deep") {
          selectedDepth.value = "deep";
        } else if (depthArg) {
          selectedDepth.value = "custom";
          customDepthDirective.value = depthArg;
        } else {
          selectedDepth.value = "balanced";
        }

        localStorage.setItem("story_depth", selectedDepth.value);
        localStorage.setItem("story_depth_directive", customDepthDirective.value);
        console.log(`📏 [DEPTH UPDATED] Mode: ${selectedDepth.value} | Custom: ${customDepthDirective.value}`);

        currentInput.value = "";
        nextTick(() => {
          if (inputArea.value) inputArea.value.style.height = "auto";
        });
        return;
      }

      // 3. /set command (State Upsert Engine)
      const setMatch = userText.match(/^\/set\s+(?:#([a-zA-Z0-9_-]+)\s+)?([\s\S]+)$/i);
      if (setMatch) {
        if (!currentSessionId.value) {
          alert("No active session found.");
          return;
        }

        const rawTag = setMatch[1];
        const category = normalizeCategory(rawTag, "State");
        const factText = setMatch[2].trim();

        try {
          const sessionFacts = await db.facts.where({ sessionId: currentSessionId.value }).toArray();
          const existingEntry = sessionFacts.find(
            (f) => (f.category || "").toLowerCase() === category.toLowerCase()
          );

          if (existingEntry) {
            await db.facts.update(existingEntry.id, {
              text: factText,
              category: category,
              timestamp: Date.now()
            });
            console.log(`🔄 [STATE UPSERT OVERWRITE] [${category}] ${factText}`);
          } else {
            await db.facts.add({
              sessionId: currentSessionId.value,
              category: category,
              text: factText,
              timestamp: Date.now()
            });
            console.log(`✨ [STATE UPSERT INSERT] [${category}] ${factText}`);
          }

          currentInput.value = "";
          await loadFacts();
          await updateCounts();

          nextTick(() => {
            if (inputArea.value) inputArea.value.style.height = "auto";
          });
        } catch (err) {
          console.error("Failed to execute /set state upsert:", err);
          alert("Could not upsert state: " + err.message);
        }
        return;
      }

      // 4. /fact command
      const factMatch = userText.match(/^\/fact(?:\s+#([a-zA-Z0-9_-]+))?\s+(.+)$/is);
      if (factMatch) {
        if (!currentSessionId.value) {
          alert("No active session found.");
          return;
        }

        const category = normalizeCategory(factMatch[1], "Fact");
        const factText = factMatch[2].trim();

        try {
          await db.facts.add({
            sessionId: currentSessionId.value,
            category: category,
            text: factText,
            timestamp: Date.now()
          });

          currentInput.value = "";
          await loadFacts();
          await updateCounts();

          nextTick(() => {
            if (inputArea.value) inputArea.value.style.height = "auto";
          });

          console.log(`📌 [FACT SAVED] [${category}] ${factText}`);
        } catch (err) {
          console.error("Failed to save fact via slash command:", err);
          alert("Could not save fact: " + err.message);
        }
        return;
      }

      // Standard submission
      const userId = await saveToDb("user", userText);
      messages.value.push({ id: userId, role: "user", text: userText, timestamp: Date.now() });

      currentInput.value = "";
      await triggerAIResponse();
    };

    const retryMessage = async (index) => {
      if (isLoading.value) return;
      await deleteMessage(index);
      await triggerAIResponse();
    };

    const exportStudyGuide = async () => {
      if (messages.value.length === 0) {
        alert("No discussion to export yet!");
        return;
      }

      let currentSession = sessions.value.find(s => s.id === currentSessionId.value);
      let sessionTitle = currentSession ? currentSession.title : "Discussion";

      let depthSummary = selectedDepth.value;
      if (selectedDepth.value === "custom") {
        depthSummary = `Custom (${customDepthDirective.value || "Dynamic"})`;
      }

      let md = `# Intellectual Exploration: ${sessionTitle}\n\n`;
      md += `**Date:** ${new Date().toLocaleString()}\n`;
      md += `**Persona:** ${selectedPersona.value} | **Depth:** ${depthSummary}\n\n`;

      if (personaDirective.value) {
        md += `> **Persona Directive:** ${personaDirective.value}\n\n`;
      }

      if (systemPrompt.value) {
        md += `## Topic / Custom Instructions\n${systemPrompt.value}\n\n`;
      }

      const allFacts = await db.facts.where({ sessionId: currentSessionId.value }).toArray();
      if (allFacts.length > 0) {
        md += `## Knowledge Base / Established State\n\n`;

        const uniqueCategories = [...new Set(allFacts.map(f => f.category))];

        uniqueCategories.forEach(cat => {
          const catFacts = allFacts.filter(f => f.category === cat);
          if (catFacts.length > 0) {
            md += `### #${cat.toUpperCase()}\n`;
            catFacts.forEach(f => md += `- ${f.text}\n`);
            md += `\n`;
          }
        });
      }

      md += `---\n\n## Discussion History\n\n`;

      messages.value.forEach(msg => {
        if (msg.role === "user") {
          md += `### 👤 User\n${msg.text}\n\n`;
        } else if (msg.role === "summary") {
          md += `### 📜 Summary\n> ${msg.text.replace(/\n/g, '\n> ')}\n\n`;
        } else if (msg.role === "model") {
          md += `### 🤖 AI\n`;

          if (msg.thought) {
            md += `<details><summary><i>AI Reasoning</i></summary>\n\n> ${msg.thought.replace(/\n/g, '\n> ')}\n\n</details>\n\n`;
          }

          md += `${msg.text}\n\n`;
        }
      });

      md += `---\n*Exported from Universal Intellectual Exploration Engine*`;

      const safeTitle = sessionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeTitle}_Study_Guide_${new Date().toISOString().split('T')[0]}.md`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

      // Facts
      facts,
      filteredFacts,
      uniqueFactTags,
      activeFactTagFilter,
      loadFacts,
      deleteFact,
      newFactText,
      newFactCategory,
      addManualFact,
      editingFactId,
      editingFactText,
      editingFactCategory,
      startEditFact,
      cancelEditFact,
      saveEditFact,

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

      // Persona & Depth Engine
      selectedPersona,
      personaDirective,
      onPersonaChange,
      selectedDepth,
      customDepthDirective,
      quickDepthChips,
      setQuickDepth,
      exportStudyGuide,

      // Multi-Session Features
      sessions,
      currentSessionId,
      isDrawerOpen,
      createNewSession,
      switchSession,
      deleteSession
    };
  },
}).mount("#app");

const fs = require("fs/promises");
const path = require("path");

const SOURCES_DIR = path.join(process.cwd(), "sources");
const EMAILS_DIR = path.join(SOURCES_DIR, "emails");
const VOICE_GUIDE_PATH = path.join(SOURCES_DIR, "voice-guide.md");

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "who",
  "why",
  "with",
  "you",
  "your",
]);

let cachedSources = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 60_000;

function safeString(value) {
  return typeof value === "string" ? value : "";
}

function normalizeText(text) {
  return safeString(text)
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function tokenize(text) {
  const cleaned = normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ");
  return cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 2)
    .filter((t) => !STOP_WORDS.has(t));
}

function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

function buildIdf(docsTokens) {
  const df = new Map();
  for (const tokens of docsTokens) {
    const unique = new Set(tokens);
    for (const t of unique) df.set(t, (df.get(t) || 0) + 1);
  }
  const n = docsTokens.length || 1;
  const idf = new Map();
  for (const [t, d] of df.entries()) {
    // smooth: log((N+1)/(df+1)) + 1
    idf.set(t, Math.log((n + 1) / (d + 1)) + 1);
  }
  return idf;
}

function tfIdfScore(queryTf, docTf, idf) {
  let score = 0;
  for (const [t, qCount] of queryTf.entries()) {
    const dCount = docTf.get(t) || 0;
    if (!dCount) continue;
    const w = idf.get(t) || 1;
    // simple dot product on log-scaled term counts
    score += (1 + Math.log(qCount)) * (1 + Math.log(dCount)) * w;
  }
  return score;
}

function scoreParagraphs(queryTf, paragraphs) {
  const scored = [];
  for (const p of paragraphs) {
    const tokens = tokenize(p);
    if (!tokens.length) continue;
    const pTf = termFreq(tokens);
    // paragraph score: sum of query term hits (no idf needed here)
    let hits = 0;
    for (const t of queryTf.keys()) {
      hits += pTf.get(t) || 0;
    }
    if (hits > 0) scored.push({ text: p.trim(), hits });
  }
  scored.sort((a, b) => b.hits - a.hits);
  return scored;
}

function buildExcerpts({ queryText, docs, maxDocs = 6, maxChars = 6000 }) {
  const queryTokens = tokenize(queryText);
  const queryTf = termFreq(queryTokens);

  const docsTokens = docs.map((d) => tokenize(d.content));
  const idf = buildIdf(docsTokens);

  const ranked = docs
    .map((doc, idx) => {
      const docTf = termFreq(docsTokens[idx]);
      const score = tfIdfScore(queryTf, docTf, idf);
      return { ...doc, score };
    })
    .sort((a, b) => b.score - a.score)

  // If nothing matches (e.g., very short/generic query), fall back to the first few docs
  // so the model still gets some voice context.
  const scoredDocs = ranked.some((d) => d.score > 0)
    ? ranked.filter((d) => d.score > 0).slice(0, maxDocs)
    : ranked.slice(0, Math.min(maxDocs, ranked.length));

  const excerpts = [];
  let used = 0;

  for (const doc of scoredDocs) {
    const paragraphs = normalizeText(doc.content).split(/\n\s*\n/);
    const scoredParas = scoreParagraphs(queryTf, paragraphs);

    const selectedParas = (scoredParas.length ? scoredParas : paragraphs.map((p) => ({ text: p, hits: 0 })))
      .filter((p) => p.text.trim().length > 0)
      .slice(0, 2)
      .map((p) => p.text.trim());

    const header = `Source: ${doc.title}`;
    const body = selectedParas.join("\n\n");
    const chunk = `${header}\n${body}`.trim();

    if (!chunk) continue;
    if (used + chunk.length + 2 > maxChars) break;

    excerpts.push(chunk);
    used += chunk.length + 2;
  }

  return excerpts;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadSources() {
  const now = Date.now();
  if (cachedSources && now - cachedAtMs < CACHE_TTL_MS) return cachedSources;

  const [voiceGuideExists, emailsDirExists] = await Promise.all([
    fileExists(VOICE_GUIDE_PATH),
    fileExists(EMAILS_DIR),
  ]);

  const voiceGuide = voiceGuideExists ? await fs.readFile(VOICE_GUIDE_PATH, "utf8") : "";

  let docs = [];
  if (emailsDirExists) {
    const entries = await fs.readdir(EMAILS_DIR, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => /\.(txt|md)$/i.test(name))
      .slice(0, 200); // safety cap

    const contents = await Promise.all(
      files.map(async (name) => {
        const fullPath = path.join(EMAILS_DIR, name);
        const content = await fs.readFile(fullPath, "utf8");
        return {
          id: name,
          title: name.replace(/\.(txt|md)$/i, ""),
          content: normalizeText(content),
        };
      })
    );

    docs = contents.filter((d) => d.content.length > 0);
  }

  cachedSources = { voiceGuide: normalizeText(voiceGuide), docs };
  cachedAtMs = now;
  return cachedSources;
}

function buildVoiceSystemPrompt({ voiceGuide, excerpts }) {
  const parts = [];

  parts.push(
    [
      "You are a marketing email assistant for Syracuse University Alumni & Constituent Engagement.",
      "Use the provided voice guide and example excerpts to match institutional voice and phrasing.",
      "CRITICAL: Always follow the user’s output-format instructions (e.g., JSON-only). Do not add commentary.",
    ].join(" ")
  );

  if (voiceGuide) {
    parts.push("VOICE GUIDE:\n" + voiceGuide);
  }

  if (excerpts?.length) {
    parts.push("VOICE EXAMPLES (reference only; do not copy verbatim):\n\n" + excerpts.join("\n\n---\n\n"));
  }

  return parts.join("\n\n");
}

function buildQueryTextFromMessages(messages) {
  const userTexts = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && m.role === "user")
    .map((m) => safeString(m.content))
    .filter(Boolean);

  // Use the most recent user text, plus the initial campaign prompt if it exists.
  const last = userTexts[userTexts.length - 1] || "";
  const first = userTexts[0] || "";

  const joined = [first, last].filter(Boolean).join("\n\n");
  return joined.slice(0, 4000);
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing API key" });
    }

    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing messages" });
    }

    const { voiceGuide, docs } = await loadSources();
    const queryText = buildQueryTextFromMessages(messages);
    const excerpts = buildExcerpts({
      queryText,
      docs,
      maxDocs: 6,
      maxChars: 6000,
    });

    const system = buildVoiceSystemPrompt({ voiceGuide, excerpts });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1200,
        temperature: 0.7,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Server error" });
  }
};

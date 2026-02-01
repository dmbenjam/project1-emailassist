const API_ENDPOINT = "/api/generate";

const formSection = document.getElementById("step-form");
const resultsSection = document.getElementById("step-results");
const form = document.getElementById("campaign-form");
const generateBtn = document.getElementById("generate-btn");
const campaignNameInput = document.getElementById("campaign-name");
const campaignCounter = document.getElementById("campaign-counter");
const audienceInput = document.getElementById("audience");
const lengthSelect = document.getElementById("email-length");
const contextInput = document.getElementById("context");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const resultsContent = document.getElementById("results-content");
const subjectList = document.getElementById("subject-list");
const emailBody = document.getElementById("email-body");
const copySubjectsBtn = document.getElementById("copy-subjects");
const copyBodyBtn = document.getElementById("copy-body");
const refineInput = document.getElementById("refine-input");
const refineBtn = document.getElementById("refine-btn");
const startOverBtn = document.getElementById("start-over-btn");
const startOverWarning = document.getElementById("start-over-warning");
const confirmStartOverBtn = document.getElementById("confirm-start-over");
const cancelStartOverBtn = document.getElementById("cancel-start-over");
const themeOptions = document.querySelectorAll('input[name="theme"]');
const themeSwitch = document.getElementById("theme-switch");
const themeSwitchText = document.getElementById("theme-switch-text");
const toneInputs = {
  formal: document.getElementById("tone-formal"),
  serious: document.getElementById("tone-serious"),
  enthusiastic: document.getElementById("tone-enthusiastic"),
};

let conversation = [];

const requiredInputs = [campaignNameInput, audienceInput, lengthSelect];

const lengthDescriptions = {
  short: "100-150 words",
  medium: "200-300 words",
  long: "400+ words",
};

const applyTheme = (theme) => {
  const nextTheme = theme || "light";
  document.body.dataset.theme = nextTheme;
  themeOptions.forEach((option) => {
    option.checked = option.value === nextTheme;
  });

  const themeIndex = { light: 0, dark: 1, otto: 2 }[nextTheme] ?? 0;
  if (themeSwitch) {
    themeSwitch.style.setProperty("--theme-index", themeIndex);
    themeSwitch.dataset.active = nextTheme;
  }
  if (themeSwitchText) {
    themeSwitchText.textContent =
      { light: "Light", dark: "Dark", otto: "Otto" }[nextTheme] || "Light";
  }
};

if (themeOptions.length) {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  themeOptions.forEach((option) => {
    option.addEventListener("change", (event) => {
      const nextTheme = event.target.value;
      localStorage.setItem("theme", nextTheme);
      applyTheme(nextTheme);
    });
  });
}

const setLoading = (isLoading) => {
  loading.classList.toggle("hidden", !isLoading);
  resultsContent.classList.toggle("hidden", isLoading);
};

const setError = (message) => {
  if (message) {
    errorBox.classList.remove("hidden");
    errorBox.querySelector("p").textContent = message;
  } else {
    errorBox.classList.add("hidden");
  }
};

const updateCounter = () => {
  campaignCounter.textContent = `${campaignNameInput.value.length}/50`;
};

const requiredFilled = () =>
  requiredInputs.every((input) => input.value.trim() !== "");

const updateSubmitState = () => {
  generateBtn.disabled = !requiredFilled();
};

const getToneDescription = () => {
  const toneValues = {
    formal: Number(toneInputs.formal.value),
    serious: Number(toneInputs.serious.value),
    enthusiastic: Number(toneInputs.enthusiastic.value),
  };

  const toneLabel = (value, low, mid, high) => {
    if (value < 40) return low;
    if (value > 60) return high;
    return mid;
  };

  return {
    formal: toneLabel(toneValues.formal, "casual", "balanced", "formal"),
    serious: toneLabel(toneValues.serious, "playful", "balanced", "serious"),
    enthusiastic: toneLabel(
      toneValues.enthusiastic,
      "reserved",
      "balanced",
      "enthusiastic"
    ),
  };
};

const buildUserPrompt = (data) => {
  const tone = getToneDescription();
  return `Create marketing email draft content for Syracuse University Alumni & Constituent Engagement.

Campaign name: ${data.campaignName}
Audience: ${data.audience}
Length target: ${lengthDescriptions[data.emailLength]}
Tone: formal/casual ${tone.formal}, serious/playful ${tone.serious}, reserved/enthusiastic ${tone.enthusiastic}
Additional context: ${data.context || "None provided"}

Requirements:
- Provide 2-3 subject line options with variety in style.
- Provide an email draft body that aligns to the length target.
- Avoid markdown in the email body; plain text only.

Return JSON with:
{
  "subject_lines": ["...", "..."],
  "email_body": "..."
}
Only return JSON.`;
};

const buildRefinePrompt = (request) => {
  return `Refinement request: ${request}

Update the subject lines and email body. Return JSON only with:
{
  "subject_lines": ["...", "..."],
  "email_body": "..."
}`;
};

const parseResponse = (text) => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw error;
  }
};

const renderResults = (data) => {
  subjectList.innerHTML = "";
  data.subject_lines.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    subjectList.appendChild(li);
  });
  emailBody.textContent = data.email_body.trim();
};

const callClaude = async (messages) => {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API request failed");
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text || "";
  return parseResponse(text);
};

const handleGenerate = async (event) => {
  event.preventDefault();
  setError("");
  setLoading(true);
  resultsSection.classList.remove("hidden");
  formSection.classList.add("hidden");

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const prompt = buildUserPrompt(data);
  conversation = [{ role: "user", content: prompt }];

  try {
    const result = await callClaude(conversation);
    conversation = [
      ...conversation,
      { role: "assistant", content: JSON.stringify(result) },
    ];
    renderResults(result);
    resultsContent.classList.remove("hidden");
  } catch (error) {
    const message =
      error.message?.includes("Missing API key")
        ? "Missing server API key. Please set it in your deployment."
        : "Unable to generate a draft. Please try again.";
    setError(message);
  } finally {
    setLoading(false);
  }
};

const handleRefine = async () => {
  const request = refineInput.value.trim();
  if (!request) return;
  refineInput.value = "";
  setError("");
  setLoading(true);

  conversation = [
    ...conversation,
    { role: "user", content: buildRefinePrompt(request) },
  ];

  try {
    const result = await callClaude(conversation);
    conversation = [...conversation, { role: "assistant", content: JSON.stringify(result) }];
    renderResults(result);
  } catch (error) {
    const message =
      error.message?.includes("Missing API key")
        ? "Missing server API key. Please set it in your deployment."
        : "Unable to apply the refinement. Please try again.";
    setError(message);
  } finally {
    setLoading(false);
  }
};

const copyToClipboard = async (text, button) => {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  } catch (error) {
    button.textContent = "Copy failed";
  }
};

form.addEventListener("submit", handleGenerate);
refineBtn.addEventListener("click", handleRefine);
refineInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleRefine();
  }
});

campaignNameInput.addEventListener("input", () => {
  updateCounter();
  updateSubmitState();
});

audienceInput.addEventListener("input", updateSubmitState);
lengthSelect.addEventListener("change", updateSubmitState);

copySubjectsBtn.addEventListener("click", () => {
  const subjects = Array.from(subjectList.querySelectorAll("li"))
    .map((item) => item.textContent)
    .join("\n");
  copyToClipboard(subjects, copySubjectsBtn);
});

copyBodyBtn.addEventListener("click", () => {
  copyToClipboard(emailBody.textContent, copyBodyBtn);
});

startOverBtn.addEventListener("click", () => {
  startOverWarning.classList.toggle("hidden");
});

cancelStartOverBtn.addEventListener("click", () => {
  startOverWarning.classList.add("hidden");
});

confirmStartOverBtn.addEventListener("click", () => {
  startOverWarning.classList.add("hidden");
  resultsSection.classList.add("hidden");
  formSection.classList.remove("hidden");
  form.reset();
  updateCounter();
  updateSubmitState();
  setError("");
});

updateCounter();
updateSubmitState();

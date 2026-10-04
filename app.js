const topics = {
  "ai-systems": {
    title: "AI Systems Thinking",
    summary:
      "Learn how models, tools, workflows, data, and human decisions become one adaptive system.",
    boundary:
      "You know what AI can do, but the next edge is understanding how to design reliable loops around it.",
    confidence: "92% fit",
    modes: {
      deeper: {
        title: "Go deeper",
        body:
          "Study feedback loops, evaluation methods, and agentic workflow design. Your next exercise is to map one real task into inputs, decisions, actions, and review points.",
      },
      explore: {
        title: "Explore wider",
        body:
          "Connect AI systems thinking to operations, education, product strategy, and personal knowledge management.",
      },
      why: {
        title: "Why this matters",
        body:
          "The value of AI does not come from prompts alone. It comes from designing a system where humans and machines improve each other over time.",
      },
      soWhat: {
        title: "So what now",
        body:
          "Build a small AI workflow for one recurring decision, then define how you will judge whether the result is trustworthy.",
      },
    },
  },
  "learning-design": {
    title: "Learning Architecture",
    summary:
      "Turn scattered interests into a structured route with prerequisites, examples, practice, and reflection.",
    boundary:
      "Your curiosity is broad. The next boundary is choosing the order that compounds fastest.",
    confidence: "88% fit",
    modes: {
      deeper: {
        title: "Go deeper",
        body:
          "Learn curriculum scaffolding, retrieval practice, spaced repetition, and mastery checks for self-directed learning.",
      },
      explore: {
        title: "Explore wider",
        body:
          "Compare how schools, games, coaching systems, and creator communities guide people through complex domains.",
      },
      why: {
        title: "Why this matters",
        body:
          "A good learning path reduces wasted effort and turns motivation into visible progress.",
      },
      soWhat: {
        title: "So what now",
        body:
          "Pick one skill and split it into five levels: vocabulary, core models, guided practice, independent project, and teaching someone else.",
      },
    },
  },
  "decision-science": {
    title: "Decision Science",
    summary:
      "Understand uncertainty, tradeoffs, incentives, and judgment so knowledge becomes better choices.",
    boundary:
      "You can gather information quickly. The next edge is knowing which evidence should change your mind.",
    confidence: "84% fit",
    modes: {
      deeper: {
        title: "Go deeper",
        body:
          "Study probabilistic thinking, expected value, cognitive bias, decision journals, and pre-mortems.",
      },
      explore: {
        title: "Explore wider",
        body:
          "Connect decision science to investing, product roadmaps, hiring, negotiation, and personal planning.",
      },
      why: {
        title: "Why this matters",
        body:
          "Knowledge only expands your life when it changes what you notice, choose, and avoid.",
      },
      soWhat: {
        title: "So what now",
        body:
          "Write down one decision you are facing, list three assumptions, then mark which assumption is easiest to test this week.",
      },
    },
  },
  "creative-tech": {
    title: "Creative Technology",
    summary:
      "Use code, AI, design, and media tools to turn mental models into interactive experiences.",
    boundary:
      "You have ideas and taste. The next boundary is developing a repeatable build rhythm.",
    confidence: "81% fit",
    modes: {
      deeper: {
        title: "Go deeper",
        body:
          "Study interface prototyping, generative media, interaction design, and fast feedback loops for creative tools.",
      },
      explore: {
        title: "Explore wider",
        body:
          "Look at how museums, games, dashboards, learning apps, and creator tools make abstract ideas tangible.",
      },
      why: {
        title: "Why this matters",
        body:
          "Creative technology lets you test an idea in the world before you can fully explain it.",
      },
      soWhat: {
        title: "So what now",
        body:
          "Prototype a tiny interactive explanation of one concept you care about, then ask where users hesitate.",
      },
    },
  },
};

const profiles = {
  builder: {
    title: "AI Builder with Strategic Curiosity",
    summary:
      "You prefer useful systems, clear mental models, and ideas that can quickly become experiments.",
    depth: 64,
    range: 78,
    goal: 86,
    topic: "ai-systems",
  },
  thinker: {
    title: "Concept Navigator with Deep Pattern Sense",
    summary:
      "You learn by connecting ideas across fields and testing whether a model explains the world better.",
    depth: 72,
    range: 84,
    goal: 80,
    topic: "decision-science",
  },
  creator: {
    title: "Creative Technologist with Systems Taste",
    summary:
      "You are strongest when ideas become prototypes, stories, visual maps, or tools others can use.",
    depth: 59,
    range: 88,
    goal: 82,
    topic: "creative-tech",
  },
};

let activeTopic = "ai-systems";
let activeMode = "deeper";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function setTopic(topicId) {
  const topic = topics[topicId];
  if (!topic) return;

  activeTopic = topicId;
  $("#topic-title").textContent = topic.title;
  $("#topic-summary").textContent = topic.summary;
  $("#topic-boundary").textContent = topic.boundary;
  $("#confidence").textContent = topic.confidence;

  $$(".map-node").forEach((node) => {
    node.classList.toggle("active", node.dataset.topic === topicId);
  });

  setMode(activeMode);
}

function setMode(mode) {
  activeMode = mode;
  const topic = topics[activeTopic];
  const content = topic.modes[mode];
  $("#mode-output").innerHTML = `<h4>${content.title}</h4><p>${content.body}</p>`;
  $$(".mode-tab").forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function updateProfile(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const goal = form.get("goal") || "builder";
  const depth = form.get("depth") || "intermediate";
  const interests = form.getAll("interest");
  const profile = profiles[goal];

  let depthOffset = 0;
  if (depth === "beginner") depthOffset = -10;
  if (depth === "advanced") depthOffset = 12;

  $("#profile-title").textContent = profile.title;
  $("#profile-summary").textContent =
    profile.summary +
    ` ROBOV noticed your strongest current signals: ${interests.slice(0, 3).join(", ")}.`;
  $("#metric-depth").textContent = `${Math.min(96, profile.depth + depthOffset)}%`;
  $("#metric-range").textContent = `${Math.min(96, profile.range + interests.length * 2)}%`;
  $("#metric-goal").textContent = `${profile.goal}%`;

  setTopic(profile.topic);
  $("#map").scrollIntoView({ behavior: "smooth", block: "start" });
}

function init() {
  $$("[data-scroll-to='scan']").forEach((button) => {
    button.addEventListener("click", () => $("#scan").scrollIntoView());
  });
  $$("[data-scroll-to='map']").forEach((button) => {
    button.addEventListener("click", () => $("#map").scrollIntoView());
  });

  $$("#profile-form").forEach((form) => form.addEventListener("submit", updateProfile));
  $$("[data-topic]").forEach((node) => {
    node.addEventListener("click", () => {
      setTopic(node.dataset.topic);
      $("#explore").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  $$(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => setMode(tab.dataset.mode));
  });

  setTopic(activeTopic);
}

init();

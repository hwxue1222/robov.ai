const progressKey = "robov-progress-v1";
const knowledgeVisits = {};
let lastVisit = "";
function saveProgress() {
  try {
    localStorage.setItem(progressKey, JSON.stringify({
      version: 1, description, activeTopic, activeMode, selectedNode,
      answers, questionIndex, score, levels, networks, reflections, knowledgeVisits
    }));
  } catch {
    $("#profile-storage").textContent = "探索记录不等于已掌握。当前浏览器无法保存记录，本次关闭页面后进度将丢失。";
  }
}
function recordKnowledge(id) {
  const node = getNetwork().find(n => n.id === id);
  if (!node) return;
  if (lastVisit !== id) {
    const previous = knowledgeVisits[id];
    knowledgeVisits[id] = { title: node.title, topic: activeTopic, depth: node.depth, count: (previous?.count || 0) + 1, lastAt: Date.now() };
    lastVisit = id;
  }
  renderLivingProfile();
  saveProgress();
}
function renderLivingProfile() {
  const visits = Object.values(knowledgeVisits);
  const breadth = new Set(visits.map(v => v.topic)).size;
  const depth = Math.max(0, ...visits.map(v => v.depth));
  $("#open-profile").hidden = !description;
  $("#live-summary").textContent = "你目前关注「" + topics[activeTopic].title + "」。这份画像会随着你的自我描述和知识探索持续更新。";
  $("#live-description").textContent = "你说：「" + description + "」";
  const interests = Object.keys(topics).filter(id => topics[id].keywords.test(description));
  $("#signal-interests").replaceChildren();
  (interests.length ? interests : [activeTopic]).forEach((id, i) => {
    const span = document.createElement("span"); span.textContent = topics[id].title;
    if (i) $("#signal-interests").append(document.createTextNode(" / "));
    $("#signal-interests").append(span);
  });
  const goalMatch = description.match(/(?:希望|想要|想学|想|目标是|want to|hope to|my goal is)[^。！？.!?\n]*/i);
  $("#signal-goal").textContent = goalMatch ? goalMatch[0].trim() : "尚未明确，可以在自我描述中补充";
  const timeMatch = description.match(/(?:每天|每日|每周|daily|each day|per day)?\s*(?:\d+|[零一二两三四五六七八九十百]+|ten|twenty|thirty|one|two|half)\s*(?:分钟|小时|minutes?|hours?)(?:\s*(?:a day|each day|daily|per day))?/i);
  $("#signal-time").textContent = timeMatch ? timeMatch[0].trim() : "尚未提供";
  const start = /初学|入门|不太懂|不懂|beginner|new to/i.test(description) ? "从基础开始" : /熟练|专业|精通|advanced|expert/i.test(description) ? "有深入经验" : "在探索中继续了解";
  $("#signal-start").textContent = start;
  $("#live-breadth").textContent = String(breadth);
  $("#live-depth").textContent = String(depth);
  $("#live-count").textContent = String(visits.length);
  $("#metric-depth").textContent = String(depth);
  $("#metric-range").textContent = String(breadth);
  $("#metric-goal").textContent = String(visits.length);
  $("#resume-learning").hidden = !selectedNode || !networks[activeTopic];
  $("#profile-history").replaceChildren();
  const recent = visits.sort((a, b) => b.lastAt - a.lastAt).slice(0, 8);
  if (!recent.length) {
    const li = document.createElement("li"); li.textContent = "选择一个知识点，你的第一条知识路径会在这里留下足迹。"; $("#profile-history").append(li);
  }
  recent.forEach(visit => {
    const li = document.createElement("li"); li.textContent = visit.title + " · " + visit.count + " 次打开"; $("#profile-history").append(li);
  });
}
$("#open-profile").addEventListener("click", () => { renderLivingProfile(); showScreen("profile-review"); });
$("#begin-check").addEventListener("click", () => {
  setTopic(activeTopic); showScreen("learning");
});
$("#resume-learning").addEventListener("click", () => {
  const previousNode = selectedNode;
  setTopic(activeTopic);
  if (getNetwork().some(n => n.id === previousNode)) { selectNode(previousNode); renderNetwork(); }
  showScreen("learning");
});
$("#update-profile").addEventListener("click", () => {
  $("#self-description").value = description; showScreen("intro"); $("#self-description").focus();
});
$("#clear-progress").addEventListener("click", () => {
  const message = document.documentElement.lang === "en" ? "Clear your profile and learning history from this browser?" : "清除当前浏览器中的画像和学习记录？";
  if (window.confirm(message)) {
    try { localStorage.removeItem(progressKey); } catch {}
    window.location.reload();
  }
});
try {
  const saved = JSON.parse(localStorage.getItem(progressKey) || "null");
  if (saved?.version === 1 && typeof saved.description === "string" && saved.description.length >= 10 && saved.description.length <= 2000 && topics[saved.activeTopic]) {
    description = saved.description; activeTopic = saved.activeTopic;
    activeMode = ["deeper", "explore", "why", "soWhat"].includes(saved.activeMode) ? saved.activeMode : "deeper";
    answers = Array.isArray(saved.answers) ? saved.answers.slice(0, 3).filter(a => Number.isInteger(a) && a >= 0 && a <= 3) : [];
    score = Number.isInteger(saved.score) && saved.score >= 0 && saved.score <= 3 ? saved.score : 0;
    questionIndex = Math.min(2, answers.length);
    for (const id of Object.keys(topics)) {
      if (Number.isInteger(saved.levels?.[id]) && saved.levels[id] >= 0 && saved.levels[id] <= 2) levels[id] = saved.levels[id];
      const rows = saved.networks?.[id];
      if (Array.isArray(rows) && rows.length <= 50 && rows.every(n => typeof n.id === "string" && n.id.startsWith(id) && typeof n.title === "string" && typeof n.body === "string" && Number.isInteger(n.depth) && n.depth >= 0 && n.depth <= 3 && (n.depth === 0 || Number.isInteger(n.index) && n.index >= 0 && n.index <= 2))) {
        const ids = new Set(rows.map(n => n.id));
        if (ids.size === rows.length && rows.some(n => n.id === id && n.parent === null && n.depth === 0) && rows.every(n => n.parent === null ? n.id === id : rows.some(parent => parent.id === n.parent && parent.depth === n.depth - 1))) networks[id] = rows;
      }
    }
    if (saved.reflections && typeof saved.reflections === "object") {
      for (const [key, value] of Object.entries(saved.reflections)) if (typeof value === "string" && value.length <= 1000) reflections[key] = value;
    }
    if (saved.knowledgeVisits && typeof saved.knowledgeVisits === "object") {
      for (const [key, value] of Object.entries(saved.knowledgeVisits).slice(0, 200)) {
        if (topics[value?.topic] && typeof value.title === "string" && Number.isInteger(value.depth) && value.depth >= 0 && value.depth <= 3 && Number.isFinite(value.count) && Number.isFinite(value.lastAt)) knowledgeVisits[key] = value;
      }
    }
    $("#self-description").value = description;
    setTopic(activeTopic);
    if (getNetwork().some(n => n.id === saved.selectedNode)) { selectNode(saved.selectedNode); renderNetwork(); }
    $("#profile-title").textContent = topics[activeTopic].title;
    $("#profile-summary").textContent = "你说：「" + description + "」";
    $("#result-guidance").textContent = "你的知识地图会随着探索更新。选择一个知识点，继续你的学习路径。";
    renderLivingProfile(); showScreen("profile-review");
  }
} catch {
  // Ignore an unreadable local snapshot so a new journey can still start.
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const topics = {
  "ai-systems": {
    title: "AI 系统思维", keywords: /人工智能|AI|模型|产品|编程|代码|工具|自动化/i,
    summary: "把 AI 从一个回答问题的工具，变成可以检查、改进的工作流程。",
    concepts: [
      ["先定义成功，再选择工具", "一个 AI 流程包含输入、处理、输出和检查。比如写客户回复：输入是客户的问题与订单信息，处理是整理事实和拟定回复，输出是可发送的文字，检查则确认价格、时间和承诺是否准确。让模型写得流畅，不等于让流程可靠。", "拿你最近的一项工作，写下输入是什么、结果要给谁用，以及什么情况算失败。"],
      ["用反馈闭环降低错误", "闭环意味着结果会被检查，检查结果又能改变下一次行动。比如自动整理资料时，先让模型给每条结论附原始出处，再人工抽查。发现引用不符，就修改资料来源或指令，而不是只要求模型更认真。", "给你的流程加一道检查：谁来核对？用什么证据？不通过时退回哪一步？"],
      ["让评估成为日常习惯", "准备几个真实任务作为固定样本。每次改变指令或模型后，对比准确性、耗时和遗漏。一次漂亮演示只能说明一个例子成功；在不同样本上持续通过，才说明流程更可靠。", "收集三个普通案例和一个容易出错的案例，写下每个案例的通过标准。"]
    ],
    questions: [
      ["探索一个新的 AI 概念时，怎样检查自己是否理解？", ["只要记住术语就足够", "用真实例子解释原理，并检查适用条件", "阅读更多相同的解释"], 1],
      ["一个自动回复流程怎样才算形成闭环？", ["发送后检查结果，并用反馈调整流程", "回复越快越好", "换一个更大的模型"], 0],
      ["怎样判断新指令是否比旧指令更好？", ["只看一次最好的结果", "比较文字长度", "在相同真实案例上按标准对比"], 2]
    ], adjacent: "decision-science", why: "当 AI 的输出会影响工作时，判断可靠性比得到一个漂亮答案更有价值。"
  },
  "learning-design": {
    title: "学习架构", keywords: /学习|读书|教育|记忆|考试|知识|研究/i,
    summary: "把想学的东西拆成能检验、能实践、能连接的学习路线。",
    concepts: [
      ["理解，从主动提取开始", "看懂一段解释和独立说清它，是两种不同的能力。读完之后合上材料，用自己的话解释概念，再回去找遗漏。这种主动提取让你看见真正的空白，也比反复浏览更容易发现误解。", "选一个你刚读过的概念，不看原文写出解释和一个例子，然后对照检查。"],
      ["让练习沿着前置知识生长", "复杂技能通常依赖更小的技能。例如做数据分析，先要理解问题、变量和比较方式，再学习工具。若总卡在同一个环节，先检查缺少的前置知识，避免重复硬做整项任务。", "把一个目标拆成三项前置能力，找到最容易验证的一项先练。"],
      ["用迁移检查真正的掌握", "会做刚见过的题，可能只是记住了样式。把同一个原理放进不同情境，才能检验你是否理解。例如用反馈原理同时解释学习计划和客户服务流程。迁移不顺畅时，回到原理与条件。", "把今天学到的原理用到一个不同领域，写出哪些条件一样，哪些不同。"]
    ],
    questions: [
      ["读完一篇文章后，哪种方式更能检验理解？", ["马上再读一遍", "收藏文章", "合上文章，用自己的话解释并举例"], 2],
      ["一个复杂技能总是学不动，你会先？", ["检查卡点需要哪些前置能力", "买更多课程", "直接跳到最难的项目"], 0],
      ["怎样知道自己不只是记住了一个例子？", ["能复述原句", "能在新情境中运用同一原理", "笔记写得很完整"], 1]
    ], adjacent: "creative-tech", why: "明确顺序和检查点，让你的时间转化为可见的能力，而不只是更多收藏。"
  },
  "decision-science": {
    title: "决策科学", keywords: /商业|投资|决策|管理|创业|business|finance/i,
    summary: "用证据、假设和小实验，把信息变成更好的选择。",
    concepts: [
      ["把事实和假设分开", "做决定时，我们常把判断当成事实。例如客户会愿意购买，是假设；五位客户付费，是观察。把两者分开，才知道需要验证什么。好的判断不是消除所有不确定性，而是找到影响最大的未知。", "写下一个近期决定，分别列出已经观察到的事实，以及仍未验证的假设。"],
      ["优先验证最关键的未知", "如果一个假设既影响结果、又很不确定，它值得优先测试。比如做新产品，先用简单原型确认有人需要它，再花时间打磨界面。小实验的价值在于改变判断，而不只是证明自己没错。", "选择一条关键假设，设计一个本周能做的小实验，并预先写下什么结果会让你改变计划。"],
      ["区分好决定和好运气", "一次结果好，不一定代表决策过程好。记录做决定时的证据、预期和风险，事后比较预期与实际，能看到是判断有效还是运气。复盘应检查当时能知道的信息，避免事后把未知当成理所当然。", "记录一次决定的预期结果与理由，一周后对照，并挑出一个需要更新的判断。"]
    ],
    questions: [
      ["朋友说一个项目肯定成功，你最需要先弄清什么？", ["有多少人点赞", "结论基于哪些证据和假设", "演示是否精彩"], 1],
      ["应该优先测试哪条假设？", ["最容易证明的", "最不影响结果的", "最影响结果且最不确定的"], 2],
      ["一次投资赚钱，能说明什么？", ["这次结果好，还需要检查决策依据", "决策方法一定正确", "以后可以忽略风险"], 0]
    ], adjacent: "learning-design", why: "知识的价值会体现在你如何选择、验证和修正判断。"
  },
  "creative-tech": {
    title: "创意技术", keywords: /设计|创作|艺术|视频|写作|design|creative/i,
    summary: "把想法变成可以体验的小作品，让反馈帮你改进。",
    concepts: [
      ["先做最小的可体验版本", "一个想法变成作品，不必一次做完整。例如想做互动课程，先做一个问题和一段反馈。这个版本要让人体验到最核心的价值，才能检验想法，而不是只有精美封面。", "用一句话写出作品最重要的体验，再做一个只包含这项体验的小样。"],
      ["观察行为，比听赞美更有用", "用户说喜欢，并不代表会使用。请对方完成一项真实任务，观察他们在哪里犹豫、退出或误解。先记录行为，再问原因。这样可以把抽象的好不好看变成明确的改进点。", "找一个人体验你的作品，记录一个停顿的位置和一个未达到预期的行为。"],
      ["让每次迭代只验证一个问题", "同时改内容、布局和操作方式，很难知道哪个变化有效。挑一个关键问题，例如用户不知道下一步，先改提示与动作，再观察。迭代的目标是累积可以解释的进步。", "选一个观察到的卡点，只改一个相关因素，写出你希望看到的行为变化。"]
    ],
    questions: [
      ["验证一个互动产品想法，最好先做？", ["核心体验的可点击小样", "一份完整品牌手册", "全部功能的需求清单"], 0],
      ["用户说很好看，下一步最值得观察什么？", ["是否愿意再夸一次", "是否能完成目标任务", "喜欢哪个颜色"], 1],
      ["怎样知道一次修改为什么有效？", ["同时改所有地方", "只看自己是否喜欢", "围绕一个问题改动并比较行为"], 2]
    ], adjacent: "ai-systems", why: "可体验的作品能把你的想法变成别人可以理解和回应的东西。"
  }
};
let activeTopic = "ai-systems";
let activeMode = "deeper";
let questionIndex = 0;
let answers = [];
let description = "";
let score = 0;
const levels = {};
const reflections = {};
function showScreen(id) {
  const ids = ["intro", "profile-review", "assessment", "results", "learning"];
  ids.forEach(name => $("#" + name).hidden = name !== id);
  $$(".journey-progress li").forEach((li, i) => {
    if (i === Math.max(0, ids.indexOf(id) - (id === "intro" ? 0 : 1))) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "instant" });
  $("#" + id + " h1").focus({ preventScroll: true });
  if (id === "learning") requestAnimationFrame(drawEdges);
  if (id === "learning") recordKnowledge(selectedNode);
  if (description) saveProgress();
}
function inferTopic(text) {
  // Route using explicit interest signals; users can adjust the proposed topic.
  const matched = Object.keys(topics).filter(id => topics[id].keywords.test(text));
  return matched[0] || "learning-design";
}
function renderQuestion() {
  const question = topics[activeTopic].questions[questionIndex];
  $("#question-count").textContent = "认知小测 · " + (questionIndex + 1) + " / 3";
  $("#question-title").textContent = question[0];
  $("#question-context").textContent = "我们先从「" + topics[activeTopic].title + "」了解你的起点。不确定也没关系，选出最接近你想法的一项。";
  $("#question-options").replaceChildren();
  question[1].concat("我还不确定").forEach((text, i) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio"; input.name = "answer"; input.value = String(i);
    input.checked = answers[questionIndex] === i;
    label.append(input, document.createTextNode(text));
    $("#question-options").append(label);
  });
  $("#question-error").textContent = "";
  $("#question-next").textContent = questionIndex === 2 ? "看看我的学习方向 →" : "下一题 →";
  showScreen("assessment");
}
function renderResults() {
  score = answers.reduce((n, a, i) => n + (a === topics[activeTopic].questions[i][2] ? 1 : 0), 0);
  levels[activeTopic] = score === 3 ? 1 : 0;
  $("#profile-title").textContent = topics[activeTopic].title + " · " + (score === 3 ? "准备进阶" : "建立基础");
  $("#profile-summary").textContent = "你说：「" + description + "」";
  $("#metric-depth").textContent = score + " / 3";
  $("#metric-range").textContent = score === 3 ? "实践与反馈" : "核心概念";
  $("#metric-goal").textContent = topics[activeTopic].title;
  $("#result-guidance").textContent = "根据你提到的兴趣，我们从「" + topics[activeTopic].title + "」出发。你答对了 " + score + " 道题，接下来我会带你学一个概念，并用你自己的场景练习。";
  setTopic(activeTopic);
  renderLivingProfile();
  showScreen("results");
}
function setTopic(id) {
  activeTopic = id;
  const topic = topics[id];
  $("#topic-title").textContent = topic.title;
  $("#topic-summary").textContent = topic.summary;
  $("#topic-boundary").textContent = "下一步：" + topic.concepts[levels[id] || 0][0] + "。读懂之后，用你的真实场景检查理解。";
  $("#confidence").textContent = "第 " + ((levels[id] || 0) + 1) + " 段";
  $("#route-title").textContent = topic.concepts[levels[id] || 0][0];
  $("#route-reason").textContent = topic.why;
  $$(".map-node").forEach(node => {
    node.classList.toggle("active", node.dataset.topic === id);
    node.setAttribute("aria-pressed", String(node.dataset.topic === id));
  });
  $("#reflection").value = reflections[id + ":" + (levels[id] || 0)] || "";
  $("#reflection-error").textContent = "";
  $("#learning-feedback").textContent = "";
  $("#complete-learning").textContent = "记录想法，展开知识方向 →";
  setMode(activeMode);
  selectNode(id + "-" + (levels[id] || 0));
  renderNetwork();
  $("#learning > .eyebrow").textContent = "学习阶段 " + ((levels[id] || 0) + 1) + " · 约 3 分钟";
}
function setMode(mode) {
  activeMode = mode;
  const topic = topics[activeTopic];
  const node = getNetwork().find(n => n.id === selectedNode);
  const concept = node ? [node.title, node.body, node.exercise || "选择一个真实场景，写出一个行动和一个验证结果的方法。"] : topic.concepts[levels[activeTopic] || 0];
  const content = {
    deeper: [concept[0], concept[1], "你的场景", "你提到：「" + description + "」。试着把上面的原理放进这件事：先选一个具体问题，再找一个能够检查结果的例子。"],
    explore: ["连接到「" + topics[topic.adjacent].title + "」", topics[topic.adjacent].concepts[0][1], "两个方向如何连接", topic.summary + " 与此同时，" + topics[topic.adjacent].summary],
    why: ["为什么现在值得学", topic.why, "与你的目标连接", "回到你描述的情况：「" + description + "」。这段知识提供了一种做事方式，先拿一个小问题验证它是否有用。"],
    soWhat: ["现在就做一个小练习", concept[2], "完成标准", "写出一个具体场景、一个行动和一个检查结果的方法。读完不算完成，能够用自己的话应用，才是下一步的起点。"]
  }[mode];
  $("#mode-output").replaceChildren();
  content.forEach((text, i) => {
    const el = document.createElement(i % 2 === 0 ? "h4" : "p");
    el.textContent = text; $("#mode-output").append(el);
  });
  $$(".mode-tab").forEach(tab => tab.setAttribute("aria-selected", String(tab.dataset.mode === mode)));
  $$(".mode-tab").forEach(tab => {
    tab.id = "tab-" + tab.dataset.mode;
    tab.setAttribute("aria-controls", "mode-output");
    tab.tabIndex = tab.dataset.mode === mode ? 0 : -1;
  });
  $("#mode-output").setAttribute("aria-labelledby", "tab-" + mode);
  $$(".mode-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.mode === mode));
}
$("#intro-form").addEventListener("submit", event => {
  event.preventDefault();
  description = $("#self-description").value.trim();
  if (description.length < 10) { $("#intro-error").textContent = "再多说一点吧，至少 10 个字，让我更了解你的起点。"; return; }
  activeTopic = inferTopic(description); answers = []; questionIndex = 0;
  renderLivingProfile();
  showScreen("profile-review");
});
$$(".journey-screen h1").forEach(heading => heading.tabIndex = -1);
$("#question-form").addEventListener("submit", event => {
  event.preventDefault();
  const answer = new FormData(event.currentTarget).get("answer");
  if (answer === null) { $("#question-error").textContent = "选一项再继续，也可以选择「我还不确定」。"; return; }
  answers[questionIndex] = Number(answer);
  if (questionIndex < 2) { questionIndex++; renderQuestion(); } else renderResults();
});
$("#question-back").addEventListener("click", () => {
  const selected = $("#question-options input:checked");
  if (selected) answers[questionIndex] = Number(selected.value);
  if (questionIndex === 0) showScreen("intro"); else { questionIndex--; renderQuestion(); }
});
$("#edit-description").addEventListener("click", () => showScreen("intro"));
$("#extend-node").addEventListener("click", extendNode);
window.addEventListener("resize", drawEdges);
$("#start-learning").addEventListener("click", () => { activeMode = "deeper"; setTopic(activeTopic); showScreen("learning"); });
$("#back-map").addEventListener("click", () => showScreen("results"));
$$("[data-topic]").forEach(node => node.addEventListener("click", () => setTopic(node.dataset.topic)));
$$(".mode-tab").forEach(tab => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
  tab.addEventListener("keydown", event => {
    const tabs = $$(".mode-tab");
    let index = tabs.indexOf(tab);
    if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") index = (index + tabs.length - 1) % tabs.length;
    else return;
    event.preventDefault(); tabs[index].focus(); setMode(tabs[index].dataset.mode);
  });
});
$("#reflection").addEventListener("input", () => { reflections[activeTopic + ":" + (levels[activeTopic] || 0)] = $("#reflection").value; saveProgress(); });
$("#widen").addEventListener("click", () => {
  activeMode = "deeper"; setTopic(topics[activeTopic].adjacent); showScreen("learning");
  $("#learning-feedback").textContent = "我们来到相邻领域。先读这个概念，再把它与你刚才学的知识连接。";
});
$("#complete-learning").addEventListener("click", () => {
  if ($("#reflection").value.trim().length < 5) {
    $("#reflection-error").textContent = "先写下一个具体的小行动（至少 5 个字），我们再继续。";
    $("#reflection").focus(); setMode("soWhat"); return;
  }
  extendNode();
  $("#learning-feedback").textContent = "已记录你的想法。选择一个分支，继续延伸你的知识链。";
  $("#branch-choices").scrollIntoView({ behavior: "smooth", block: "center" });
});

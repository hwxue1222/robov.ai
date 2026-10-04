const networks = {};
let selectedNode = "";
const nodeLibrary = {
  "ai-systems": [
    [["任务边界", "明确哪些动作可以自动完成，哪些必须由人确认。例如退款承诺应由有权限的人核准，而不是让模型自行决定。"], ["成功标准", "把成功写成可核对的条件：事实有出处、关键字段不遗漏、承诺符合权限。流畅的文字不能替代检查。"]],
    [["人工检查点", "在影响最大的动作之前检查。例如发邮件前核对收件人与承诺。检查点要说明谁负责、核对什么、失败时怎么办。"], ["错误回退", "信息不足时补资料，事实不符时重新核对，风险过高时交给人。保留失败原因，避免下一轮重复同样错误。"]],
    [["测试样本", "用常见案例、罕见案例和容易误解的案例测试同一流程。测试应覆盖真实情况，而不仅是演示中最顺利的情况。"], ["错误分类", "区分事实错误、信息遗漏与不当动作。优先修复影响最大的类别，再比较同一组案例是否改善。"]]
  ],
  "learning-design": [
    [["主动回忆", "合上资料尝试解释，卡住的位置就是需要补足的知识。然后对照原文检查，而不是只重复阅读。"], ["间隔复习", "在不同日期主动回忆同一个概念，根据是否能独立解释调整复习间隔。"]],
    [["前置能力", "把复杂任务拆成必需的小能力，分别用简单任务检查，先补最薄弱的一项。"], ["练习难度", "选择需要思考但能得到反馈的任务。太简单无法暴露问题，太难则难以定位卡点。"]],
    [["类比迁移", "比较两个场景中的关系和约束，而不只是表面相似。比如学习与产品迭代都需要反馈，但反馈速度可能不同。"], ["反例检查", "找一个原理不适用的场景，说明缺少什么条件。知道边界能避免把一个模型用到所有问题。"]]
  ],
  "decision-science": [
    [["证据质量", "区分实际行为、他人转述与主观猜测。检查样本来源、数量和是否只看到了成功案例。"], ["可证伪假设", "把判断写成可能被观察推翻的句子。例如三位客户愿意付费，比用户会喜欢更容易检验。"]],
    [["信息价值", "优先获得能够改变行动的信息。如果无论调查结果如何你都采取同一行动，这项调查可能不是最优先的投入。"], ["低成本实验", "用小样或预订测试需求，先得到能改变判断的反馈，再投入完整开发。注意意向与付费是不同证据。"]],
    [["决策日志", "在结果出现前记录理由、预期和风险，事后对照，避免只记得与结果一致的理由。"], ["概率校准", "积累多次预测，比较预期发生的频率与实际频率。不要凭一次成败判断方法有效。"]]
  ],
  "creative-tech": [
    [["核心体验", "用一个动词描述用户要完成什么，例如理解或比较，保留支撑这个动作的最少内容。"], ["快速原型", "用低成本工具做出关键交互，让用户实际体验。原型只需足够验证想法，不必提前达到发布质量。"]],
    [["行为观察", "让用户完成真实任务，记录停顿、误操作与退出。不要在卡住时马上解释，否则会遮住问题。"], ["开放提问", "问你刚才期待发生什么，避免问你是不是喜欢。让用户用自己的话说明困惑。"]],
    [["单变量迭代", "围绕一个问题改动一个主要因素，在相似条件下对比行为，才能解释变化为什么有效。"], ["反馈优先级", "先处理阻止任务完成的问题，再处理效率，最后处理偏好。顺序要与作品目标一致。"]]
  ]
};
function getNetwork() {
  if (!networks[activeTopic]) {
    networks[activeTopic] = [{ id: activeTopic, parent: null, title: topics[activeTopic].title, body: topics[activeTopic].summary, depth: 0 }];
    topics[activeTopic].concepts.forEach((c, i) => networks[activeTopic].push({ id: activeTopic + "-" + i, parent: activeTopic, title: c[0], body: c[1], exercise: c[2], depth: 1, index: i }));
  }
  return networks[activeTopic];
}
function selectNode(id) {
  selectedNode = id;
  const nodes = getNetwork(), node = nodes.find(n => n.id === id);
  if (node.depth > 0) levels[activeTopic] = node.index;
  $("#confidence").textContent = "第 " + ((levels[activeTopic] || 0) + 1) + " 段";
  $("#learning > .eyebrow").textContent = "学习阶段 " + ((levels[activeTopic] || 0) + 1) + " · 约 3 分钟";
  $("#topic-boundary").textContent = "下一步：" + node.title + "。读懂之后，用你的真实场景检查理解。";
  $("#node-detail").replaceChildren();
  const title = document.createElement("h2"); title.textContent = node.title;
  const body = document.createElement("p"); body.textContent = node.body;
  const exercise = document.createElement("p"); exercise.textContent = "联系你的情况：「" + description + "」。" + (node.exercise || "找一个真实例子，用这个知识点解释它，再写下一个需要验证的条件。");
  $("#node-detail").append(title, body, exercise);
  $("#node-path").replaceChildren();
  const path = []; let current = node;
  while (current) { path.unshift(current); current = nodes.find(n => n.id === current.parent); }
  path.forEach(n => {
    const b = document.createElement("button"); b.textContent = n.title + (n.id === id ? "" : " →");
    b.addEventListener("click", () => { selectNode(n.id); renderNetwork(); }); $("#node-path").append(b);
  });
  $("#extend-node").textContent = nodes.some(n => n.parent === id) ? "查看延伸方向 →" : node.depth < 3 ? "延伸这个知识点 →" : "连接到相邻领域 →";
  const choices = $("#branch-choices");
  choices.replaceChildren();
  const children = nodes.filter(n => n.parent === id);
  if (children.length || node.depth === 3) {
    const heading = document.createElement("h3"); heading.textContent = "你想朝哪个方向延伸？"; choices.append(heading);
    children.forEach(child => {
      const button = document.createElement("button"); button.className = "branch-choice"; button.textContent = child.title + " →";
      button.addEventListener("click", () => { activeMode = "deeper"; selectNode(child.id); renderNetwork(); $("#node-detail").scrollIntoView({ behavior: "smooth", block: "center" }); });
      choices.append(button);
    });
    if (node.depth === 3) {
      const adjacent = topics[activeTopic].adjacent;
      const button = document.createElement("button"); button.className = "branch-choice"; button.textContent = "连接到「" + topics[adjacent].title + "」";
      button.addEventListener("click", () => { activeMode = "deeper"; setTopic(adjacent); showScreen("learning"); }); choices.append(button);
    }
  }
  setMode(activeMode);
  if (!$("#learning").hidden) recordKnowledge(id);
}
function renderNetwork() {
  const nodes = getNetwork();
  $("#knowledge-network").replaceChildren();
  for (let depth = 0; depth <= Math.max(...nodes.map(n => n.depth)); depth++) {
    const row = document.createElement("div"); row.className = "network-row";
    nodes.filter(n => n.depth === depth).forEach(node => {
      const b = document.createElement("button"); b.className = "knowledge-point"; b.dataset.node = node.id; b.textContent = node.title;
      b.setAttribute("aria-pressed", String(node.id === selectedNode));
      const tag = document.createElement("small"); tag.textContent = node.id === selectedNode ? "正在探索" : node.depth === 1 ? "阶段关键点" : "关联知识"; b.append(tag);
      b.addEventListener("click", () => { selectNode(node.id); renderNetwork(); }); row.append(b);
    }); $("#knowledge-network").append(row);
  }
  $("#network-guidance").textContent = "已连接 " + nodes.length + " 个知识点。当前知识点：" + nodes.find(n => n.id === selectedNode).title;
  requestAnimationFrame(drawEdges);
}
function drawEdges() {
  window.robovScene?.sync();
}
function extendNode() {
  const nodes = getNetwork(), node = nodes.find(n => n.id === selectedNode);
  let children = nodes.filter(n => n.parent === node.id);
  if (!children.length && node.depth < 3) {
    const content = node.depth === 1 ? nodeLibrary[activeTopic][node.index] : [
      ["应用：" + node.title, node.body + " 实践：先描述一个真实任务，再选择一个具体行动，比较行动前后的结果。"],
      ["边界：" + node.title, "检查「" + node.title + "」的条件：信息是否足够？目标是否一致？是否能获得反馈？写出一个不适用的例子，并说明需要补足什么。"]
    ];
    children = content.map((c, i) => ({ id: node.id + "-" + i, parent: node.id, title: c[0], body: c[1], depth: node.depth + 1, index: node.index })); nodes.push(...children);
  }
  selectNode(node.id); renderNetwork();
  saveProgress();
  $("#branch-choices").scrollIntoView({ behavior: "smooth", block: "center" });
}

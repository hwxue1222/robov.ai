import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";

const host = document.querySelector("#network-scene");
const canvas = document.querySelector("#network-canvas");
const labels = document.querySelector("#scene-labels");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
} catch {
  document.querySelector("#scene-status").textContent = "三维视图暂不可用，可以从知识节点列表继续探索。";
  document.querySelector(".network-list").open = true;
}
if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x0d1118);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 2, 19);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 8; controls.maxDistance = 60;
  controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 0.3;
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(4, 8, 10); scene.add(light);
  const group = new THREE.Group(); scene.add(group);
  const sphere = new THREE.SphereGeometry(0.2, 24, 16);
  const colors = [0x56dcb5, 0x70a8ff, 0xffc168, 0xe991b8];
  const centers = [
    new THREE.Vector3(-4, 1.8, 0), new THREE.Vector3(3.8, 2, -1.5),
    new THREE.Vector3(-3.1, -2.4, -1), new THREE.Vector3(3.3, -2.3, 1)
  ];
  let visualNodes = [];
  let signature = "";
  let framed = false;
  function choose(topicId, id) {
    activeMode = "deeper";
    if (activeTopic !== topicId) setTopic(topicId, id);
    else { selectNode(id); renderNetwork(); }
  }
  function disposeGraph() {
    group.children.forEach(child => {
      if (child.isLine) child.geometry.dispose();
      child.material.dispose();
    });
    group.clear(); labels.replaceChildren(); visualNodes = [];
  }
  function build() {
    const rows = [];
    Object.keys(topics).forEach((topicId, i) => {
      const data = networks[topicId] || [];
      const angle = i * Math.PI * 2 / Object.keys(topics).length;
      const center = new THREE.Vector3(Math.cos(angle) * 4.2, Math.sin(angle) * 3, Math.sin(angle * 2) * 1.5);
      data.forEach(n => rows.push({ ...n, topicId, color: colors[i % colors.length], center }));
    });
    const nextSignature = rows.map(n => n.id).join("|");
    if (signature === nextSignature) { updateSelection(); return; }
    signature = nextSignature; disposeGraph(); framed = false;
    const positions = new Map();
    rows.sort((a, b) => a.depth - b.depth).forEach(n => {
      let position = n.center.clone();
      if (n.depth === 1) {
        const angle = n.index * Math.PI * 2 / rows.filter(r => r.parent === n.parent).length;
        position.add(new THREE.Vector3(Math.cos(angle) * 1.85, Math.sin(angle) * 1.65, n.index === 1 ? 1.5 : -0.8));
      } else if (n.depth > 1) {
        const parent = positions.get(n.parent);
        const angle = n.index * Math.PI * 2 / rows.filter(r => r.parent === n.parent).length;
        position = parent.clone().add(new THREE.Vector3(Math.cos(angle) * 1.8, Math.sin(angle) * 1.6 - 0.5, 1.2));
      }
      positions.set(n.id, position);
      const material = new THREE.MeshStandardMaterial({ color: n.color, emissive: n.color, emissiveIntensity: 0.25, roughness: 0.35 });
      const mesh = new THREE.Mesh(sphere, material); mesh.position.copy(position);
      mesh.scale.setScalar(n.depth === 0 ? 1.65 : 1);
      mesh.userData = { id: n.id, topicId: n.topicId };
      group.add(mesh);
      const label = document.createElement("button");
      label.className = "scene-node-label"; label.dataset.node = n.id; label.textContent = n.title;
      label.addEventListener("click", () => choose(n.topicId, n.id)); labels.append(label);
      visualNodes.push({ ...n, mesh, label });
    });
    rows.filter(n => n.parent).forEach(n => {
      const geometry = new THREE.BufferGeometry().setFromPoints([positions.get(n.parent), positions.get(n.id)]);
      group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: n.color, transparent: true, opacity: 0.45 })));
    });
    (personalizedGraph?.edges || []).forEach(edge => {
      if (!positions.has(edge.from) || !positions.has(edge.to) || rows.some(n => n.id === edge.to && n.parent === edge.from)) return;
      const geometry = new THREE.BufferGeometry().setFromPoints([positions.get(edge.from), positions.get(edge.to)]);
      group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })));
    });
    updateSelection();
  }
  function updateSelection() {
    visualNodes.forEach(n => {
      const selected = n.id === selectedNode;
      n.label.setAttribute("aria-pressed", String(selected));
      n.mesh.material.emissiveIntensity = selected ? 1.4 : 0.25;
      n.mesh.scale.setScalar(selected ? 1.6 : n.depth === 0 ? 1.65 : 1);
    });
  }
  function resize() {
    if (!host.clientWidth || !host.clientHeight) return;
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
    if (!framed && visualNodes.length) {
      const bounds = new THREE.Box3().setFromPoints(visualNodes.map(n => n.mesh.position));
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const distance = Math.max((size.x + 3) / (2 * Math.tan(halfFov) * camera.aspect), (size.y + 1.5) / (2 * Math.tan(halfFov))) + size.z / 2;
      controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(0, 1, Math.min(55, Math.max(12, distance))));
      framed = true;
    }
  }
  const observer = new ResizeObserver(() => { framed = false; resize(); }); observer.observe(host);
  const raycaster = new THREE.Raycaster();
  let pointerStart = null;
  canvas.addEventListener("pointerdown", event => { pointerStart = [event.clientX, event.clientY]; });
  canvas.addEventListener("pointermove", event => {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = raycaster.intersectObjects(visualNodes.map(n => n.mesh))[0];
    const node = hit && visualNodes.find(n => n.id === hit.object.userData.id);
    canvas.style.cursor = node ? "pointer" : "grab";
    canvas.title = node ? (document.documentElement.lang === "en" ? translate(node.title) : node.title) : "";
  });
  canvas.addEventListener("pointerup", event => {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = raycaster.intersectObjects(visualNodes.map(n => n.mesh))[0];
    if (hit) choose(hit.object.userData.topicId, hit.object.userData.id);
  });
  document.querySelector("#scene-home").addEventListener("click", () => { framed = false; resize(); controls.update(); });
  document.querySelector("#scene-in").addEventListener("click", () => { camera.position.sub(controls.target).multiplyScalar(0.85).clampLength(8, 60).add(controls.target); });
  document.querySelector("#scene-out").addEventListener("click", () => { camera.position.sub(controls.target).multiplyScalar(1.15).clampLength(8, 60).add(controls.target); });
  document.querySelector("#scene-rotate").addEventListener("change", event => controls.autoRotate = event.target.checked);
  controls.addEventListener("start", () => { controls.autoRotate = false; document.querySelector("#scene-rotate").checked = false; });
  window.robovScene = { sync: () => { build(); resize(); } };
  build(); resize();
  const projected = new THREE.Vector3();
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    if (document.querySelector("#learning").hidden || document.hidden) return;
    controls.update(delta);
    renderer.render(scene, camera);
    const occupied = [];
    // Preserve readable labels by prioritizing the selected node and domain roots.
    [...visualNodes].sort((a, b) => Number(b.id === selectedNode) - Number(a.id === selectedNode) || a.depth - b.depth).forEach(n => {
      projected.copy(n.mesh.position).project(camera);
      const x = (projected.x + 1) / 2 * host.clientWidth;
      const y = (1 - projected.y) / 2 * host.clientHeight + 12;
      const width = n.label.offsetWidth, height = n.label.offsetHeight;
      const area = { x: x - width / 2, y, width, height };
      const inFrame = projected.z < 1 && area.x >= 0 && area.x + width <= host.clientWidth && y > 0 && y + height < host.clientHeight - 68;
      const overlap = occupied.some(a => area.x < a.x + a.width + 4 && area.x + width + 4 > a.x && y < a.y + a.height + 4 && y + height + 4 > a.y);
      n.label.style.visibility = inFrame && !overlap ? "visible" : "hidden";
      n.label.style.transform = "translate(" + area.x + "px," + y + "px)";
      if (inFrame && !overlap) occupied.push(area);
    });
  });
}

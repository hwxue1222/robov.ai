import * as THREE from './vendor/three.module.js';

const canvas = document.querySelector('#home-canvas');
const hero = canvas.parentElement;
try {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(0, 0, 9);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.DirectionalLight(0xd8ffb2, 7);
  light.position.set(3, 5, 6);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xff856a, 5);
  rim.position.set(-4, -2, 2);
  scene.add(rim);
  const token = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xd1f982, metalness: 0.65, roughness: 0.3 }));
  face.rotation.x = Math.PI / 2;
  token.add(face);
  const textCanvas = document.createElement('canvas');
  textCanvas.width = textCanvas.height = 256;
  const ctx = textCanvas.getContext('2d');
  ctx.fillStyle = '#d1f982'; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#101b13'; ctx.font = 'bold 150px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('R', 128, 136);
  const texture = new THREE.CanvasTexture(textCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.CircleGeometry(1.19, 48), new THREE.MeshBasicMaterial({ map: texture }));
  label.position.z = 0.115;
  token.add(label);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.012, 8, 100), new THREE.MeshBasicMaterial({ color: 0x6e9690 }));
  ring.rotation.x = 0.65;
  token.add(ring);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.7, 3.7, 1)), new THREE.LineBasicMaterial({ color: 0x52605b, transparent: true, opacity: 0.45 }));
  outline.rotation.z = Math.PI / 4;
  token.add(outline);
  scene.add(token);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true, pointerX = 0, pointerY = 0, mobile = false;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(hero);
  hero.addEventListener('pointermove', event => {
    const bounds = hero.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
    pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
  });
  hero.addEventListener('pointerleave', () => { pointerX = pointerY = 0; });
  const resize = () => {
    const { width, height } = hero.getBoundingClientRect();
    if (!width || !height) return;
    mobile = width < 680;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    token.position.set(mobile ? 0.6 : 2.2, mobile ? 1.95 : 0.2, 0);
    token.scale.setScalar(mobile ? 0.46 : 1);
  };
  new ResizeObserver(resize).observe(hero);
  resize();
  renderer.setAnimationLoop(time => {
    if (!visible || document.hidden) return;
    const movement = reducedMotion.matches ? 0 : Math.sin(time * 0.00055) * 0.12;
    token.rotation.set(-0.12 + pointerY * 0.12, -0.36 + movement + pointerX * 0.15, 0.12);
    renderer.render(scene, camera);
  });
} catch {
  hero.classList.add('visual-unavailable');
}

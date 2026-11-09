import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* Prism Ludo — real-time 3D Ludo table.
   Board, pawns and die are built procedurally; no external models required. */

const $ = (id) => document.getElementById(id);
const app = $('app');
const NAMES = ['red', 'green', 'gold', 'blue'];
const LABELS = ['Red', 'Green', 'Gold', 'Blue'];
const COLORS = [0xff2d6b, 0x14e8b0, 0xffc21a, 0x4a63ff];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const STRINGS = {
  'loading.noWebgl': 'This table needs WebGL. Try a browser with hardware acceleration.',
  'hud.session': 'PASS & PLAY · {{players}} PLAYERS · {{bots}}',
  'hud.noBots': 'NO BOTS',
  'hud.oneBot': '1 BOT',
  'hud.manyBots': '{{count}} BOTS',
  'hud.yourTurn': 'Your turn',
  'hud.botEyebrow': 'Bot turn',
  'hud.rollDice': 'Roll dice',
  'hud.rolling': 'Rolling…',
  'hud.move': 'Move {{value}}',
  'hud.chooseToken': 'Choose a token',
  'hud.toRoll': '{{player}} to roll',
  'hud.botTurn': '{{player}} bot is thinking',
  'hud.botChoosing': '{{player}} bot is choosing',
  'hud.wins': '{{player}} wins',
  'hud.passing': 'No move · passing',
  'setup.botTag': 'BOT',
  'setup.you': 'YOU',
  'tutorial.stepLabel': 'How to play · {{index}}/{{total}}',
  'tutorial.back': 'Back',
  'tutorial.next': 'Next',
  'tutorial.start': "Let's play",
  'tutorial.setup': 'Set the table',
  'win.title': '{{player}} wins',
  'toast.rolled': 'Rolled {{value}} · choose a glowing token',
  'toast.noMove': '{{player}} rolled {{value}} · no legal move',
  'toast.capture': '{{player}} captured {{victim}}!',
  'toast.home': 'Home! {{player}} is one closer',
  'toast.out': '{{player}} left the yard',
  'toast.moved': '{{player}} moved {{value}} spaces',
  'toast.six': 'A six! {{player}} rolls again',
  'toast.threeSixes': 'Three sixes — turn forfeited',
  'toast.fresh': '{{player}} rolls first.'
};

const TUTORIAL = [
  {
    title: 'Six opens the gate',
    copy: 'Roll a 6 to bring a token out of your yard and onto its coloured start square. A 6 also earns you another roll.'
  },
  {
    title: 'One roll. One token.',
    copy: 'Move a single token by the number you rolled. Travel clockwise around the 52-square track, then turn into your own coloured lane.'
  },
  {
    title: 'Land. Capture. Repeat.',
    copy: 'Land exactly on a lone opponent on an unprotected square and it goes back to its yard, where it needs a 6 to return.'
  },
  {
    title: 'Stars are safe',
    copy: 'The four star squares and the four coloured start squares protect whatever stands on them. No capture happens there.'
  },
  {
    title: 'Three sixes is one too many',
    copy: 'A third 6 in a row is not played and your turn ends. The first two moves stay on the board.'
  },
  {
    title: 'The exact way home',
    copy: 'After the full circuit, turn into your own lane. Roll the exact number to reach the centre — an overshoot cannot move.'
  },
  {
    title: 'Bring your whole team home',
    copy: 'The first player to land all four tokens in the centre wins. Pass the device to the next player after each turn.'
  }
];

const t = (key, vars) => {
  const text = STRINGS[key] ?? '';
  if (!vars) return text;
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g,
    (_m, k) => (vars[k] == null ? '' : String(vars[k])));
};
const playerName = (p) => LABELS[p];

/* 52-square ring, [row, col] in a 15×15 grid */
const PATH = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0]
];

const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const START = [0, 13, 26, 39];

const HOMES = Array.from({ length: 4 }, (_, p) =>
  Array.from({ length: 6 }, (_, i) =>
    i === 5 ? [7, 7] : p === 0 ? [7, i + 1] : p === 1 ? [i + 1, 7] : p === 2 ? [7, 13 - i] : [13 - i, 7]
  )
);

const yardParts = [[], [], [], []];

const YARDS = [
  [[2, 2], [2, 4], [4, 2], [4, 4]],
  [[2, 10], [2, 12], [4, 10], [4, 12]],
  [[10, 10], [10, 12], [12, 10], [12, 12]],
  [[10, 2], [10, 4], [12, 2], [12, 4]]
];

/* --------------------------------------------------------------------------
   State
   -------------------------------------------------------------------------- */
let scene, renderer, camera, controls;
let dieRenderer, dieScene, dieCamera, dieGroup;
let board, animateFrame = 0;
let ready = false, disposed = false;

const pawns = [];
const ringTiles = [];
const laneTiles = [];
const halos = [];
const tweens = [];

const SEAT_SETS = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };

let seats = [0, 1, 2, 3];
let bots = new Set();
let setupOpen = false;
let introMode = false;
let setupPlayers = 2;
let setupBots = 0;
let matchStarted = false;
let botTimer = null;
let botSig = '';

let current = 0;
let rollValue = 1;
let sixes = 0;
let phase = 'idle';
let positions = Array.from({ length: 4 }, () => [-1, -1, -1, -1]);
let legal = [];
let rollingStart = 0;
let tutorialStep = -1;
let topView = false;
let hintFaded = false;
let hintTimer;
let lastNarrow = null;
const timers = [];
let toastTimer;

const delay = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
function clearTimers() {
  while (timers.length) clearTimeout(timers.pop());
  clearTimeout(botTimer);
  botTimer = null;
  botSig = '';
}

/* --------------------------------------------------------------------------
   Audio
   -------------------------------------------------------------------------- */
const audio = {
  muted: false,
  bgm: null,
  files: {},
  async init() {
    try {
      const raw = localStorage.getItem('prism-ludo-muted');
      this.muted = raw === 'true';
    } catch (_e) { /* storage may be blocked */ }
    const list = ['bgm', 'roll', 'step', 'capture', 'home', 'win'];
    this.bgm = new Audio('./audio/bgm.mp3');
    this.bgm.loop = true;
    this.bgm.volume = 0.32;
    for (const name of list) {
      if (name === 'bgm') continue;
      const el = new Audio(`./audio/${name}.mp3`);
      el.volume = 0.55;
      this.files[name] = el;
    }
    this.applyMute();
  },
  play(name) {
    if (this.muted) return;
    const el = this.files[name];
    if (!el) return;
    try { el.currentTime = 0; el.play().catch(() => {}); } catch (_e) { /* ignore */ }
  },
  startBgm() {
    if (this.muted || !this.bgm) return;
    this.bgm.play().catch(() => {});
  },
  applyMute() {
    if (this.bgm) this.bgm.muted = this.muted;
    Object.values(this.files).forEach((el) => { el.muted = this.muted; });
    if (!this.muted) this.startBgm();
    const btn = $('sound');
    if (btn) {
      btn.classList.toggle('muted', this.muted);
      btn.setAttribute('aria-label', this.muted ? 'Unmute sound' : 'Mute sound');
    }
  },
  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem('prism-ludo-muted', String(this.muted)); } catch (_e) { /* ignore */ }
    this.applyMute();
    if (!this.muted) this.play('step');
  }
};

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
function notice(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function mat(color, rough = 0.24, metal = 0.1) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: rough, metalness: metal, clearcoat: 1, clearcoatRoughness: 0.13
  });
}

function mesh(geo, material, parent = board) {
  const o = new THREE.Mesh(geo, material);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}

function box(w, h, d, r, material, x, y, z, parent = board) {
  const o = mesh(new RoundedBoxGeometry(w, h, d, 3, r), material, parent);
  o.position.set(x, y, z);
  return o;
}

function labelTexture(text, color = '#fff') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = '600 68px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function decal(text, x, z, size, color, parent = board, y = 0.54) {
  const m = new THREE.MeshBasicMaterial({
    map: labelTexture(text, color), transparent: true, depthWrite: false
  });
  const o = mesh(new THREE.PlaneGeometry(size, size), m, parent);
  o.rotation.x = -Math.PI / 2;
  o.position.set(x, y, z);
  o.castShadow = false;
  return o;
}

/* Board-space position for a token value: -1 yard, 0-50 ring, 51-56 lane/home */
function positionOf(p, ti, value = positions[p][ti]) {
  let rc;
  if (value < 0) rc = YARDS[p][ti];
  else if (value <= 50) rc = PATH[(p * 13 + value) % 52];
  else rc = HOMES[p][Math.min(value - 51, 5)];
  return new THREE.Vector3(rc[1] - 7, 0.61, rc[0] - 7);
}

/* --------------------------------------------------------------------------
   Scene
   -------------------------------------------------------------------------- */
function setup() {
  const stage = $('stage');
  scene = new THREE.Scene();

  const bg = document.createElement('canvas');
  bg.width = bg.height = 512;
  const ctx = bg.getContext('2d');
  ctx.fillStyle = '#0b0e24';
  ctx.fillRect(0, 0, 512, 512);
  let g = ctx.createRadialGradient(258, 168, 0, 256, 256, 360);
  g.addColorStop(0, '#1c2260');
  g.addColorStop(0.46, '#141838');
  g.addColorStop(1, '#080a1c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  g = ctx.createRadialGradient(20, 90, 0, 20, 90, 260);
  g.addColorStop(0, '#17636f');
  g.addColorStop(1, '#10142700');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const bgTex = new THREE.CanvasTexture(bg);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTex;
  scene.fog = new THREE.FogExp2(0x080b1e, 0.006);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  stage.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(37, 1, 0.1, 130);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.panSpeed = 0.85;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = 1.4;
  controls.minDistance = 13;
  controls.maxDistance = 65;
  controls.rotateSpeed = 0.85;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.target.set(0, 0, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.environmentIntensity = 0.42;
  envScene.dispose();
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xa9c8ff, 0x120d33, 0.55));

  const key = new THREE.DirectionalLight(0xe5fbff, 2.5);
  key.position.set(-10, 22, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -13;
  key.shadow.camera.right = 13;
  key.shadow.camera.top = 13;
  key.shadow.camera.bottom = -13;
  key.shadow.bias = -0.001;
  key.shadow.normalBias = 0.03;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x7e6dff, 1.7);
  rim.position.set(12, 8, -10);
  scene.add(rim);

  const warm = new THREE.PointLight(0xff8c88, 16, 22, 2);
  warm.position.set(-14, 5.5, 10);
  scene.add(warm);

  board = new THREE.Group();
  scene.add(board);

  buildTable();
  buildPieces();
  buildDie();

  syncPawns();
  onResize();
  resetCamera();
  $('fallback').hidden = true;
  ready = true;
  $('roll').disabled = false;

  $('hint').textContent = matchMedia('(pointer: coarse)').matches
    ? 'Drag to rotate · pinch to zoom · two fingers to move'
    : 'Drag to rotate · scroll to zoom · right-drag to move';

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerRelease);
  window.addEventListener('pointerup', onPointerRelease);
  window.addEventListener('pointercancel', onPointerRelease);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  refresh();
  animateFrame = requestAnimationFrame(tick);
}

/* --------------------------------------------------------------------------
   Board
   -------------------------------------------------------------------------- */
function buildTable() {
  const base = mat(0x33307e, 0.28, 0.2);
  const edge = mat(0x6a5ae0, 0.2, 0.36);
  const ice = mat(0x2b2870, 0.32, 0.08);

  box(18.7, 0.7, 18.7, 0.45, mat(0x181e52, 0.32, 0.2), 0, -1, 0);
  box(18.15, 0.14, 18.15, 0.34, edge, 0, -0.59, 0);
  box(17.95, 0.48, 17.95, 0.4, base, 0, -0.3, 0);
  box(16.55, 0.22, 16.55, 0.32, mat(0x0a0f2c, 0.34, 0.2), 0, 0.07, 0);
  box(16.15, 0.21, 16.15, 0.23, ice, 0, 0.23, 0);

  const glow = mat(0x74ead9, 0.18, 0.25);
  glow.emissive.set(0x248e9c);
  glow.emissiveIntensity = 0.7;
  for (const z of [-8.4, 8.4]) box(16.4, 0.03, 0.03, 0.012, glow, 0, 0.19, z);
  for (const x of [-8.4, 8.4]) box(0.03, 0.03, 16.4, 0.012, glow, x, 0.19, 0);

  /* Yards */
  for (let p = 0; p < 4; p++) {
    const x = p === 0 || p === 3 ? -4.5 : 4.5;
    const z = p < 2 ? -4.5 : 4.5;
    const keep = (o) => {
      yardParts[p].push({ mesh: o, base: o.material.color.clone(), glow: o.material.emissiveIntensity || 0 });
      return o;
    };
    const slab = mat(COLORS[p], 0.19, 0.16);
    slab.emissive = new THREE.Color(COLORS[p]);
    slab.emissiveIntensity = 0.34;
    keep(box(5.85, 0.12, 5.85, 0.36, slab, x, 0.4, z));
    keep(box(4.62, 0.09, 4.62, 0.45,
      mat(new THREE.Color(COLORS[p]).lerp(new THREE.Color(0x1b2350), 0.45), 0.26, 0.06), x, 0.49, z));
    for (let ti = 0; ti < 4; ti++) {
      const [r, c] = YARDS[p][ti];
      const dock = keep(mesh(new THREE.CylinderGeometry(0.66, 0.72, 0.07, 40), mat(COLORS[p], 0.23, 0.1)));
      dock.position.set(c - 7, 0.56, r - 7);
      const centre = keep(mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.073, 40),
        mat(new THREE.Color(COLORS[p]).lerp(new THREE.Color(0x172452), 0.3))));
      centre.position.set(c - 7, 0.565, r - 7);
    }
    keep(decal(['R', 'G', 'Y', 'B'][p], x, z, 0.65, '#ffffff', board, 0.548));
  }
  tintYards();

  /* Ring */
  const tileGeo = new RoundedBoxGeometry(0.955, 0.12, 0.955, 2, 0.045);
  for (let i = 0; i < 52; i++) {
    const startOf = START.indexOf(i);
    const colour = startOf >= 0 ? COLORS[startOf] : 0xfaf3e2;
    const tileMat = mat(colour, 0.26, 0.06);
    if (startOf >= 0) {
      tileMat.emissive = new THREE.Color(colour);
      tileMat.emissiveIntensity = 0.46;
    }
    const tile = mesh(tileGeo, tileMat);
    tile.userData.baseColor = startOf >= 0 ? colour : 0;
    tile.userData.baseIntensity = startOf >= 0 ? 0.46 : 0;
    tile.position.set(PATH[i][1] - 7, 0.42, PATH[i][0] - 7);
    ringTiles[i] = tile;
    if (SAFE.has(i)) {
      decal('✦', tile.position.x, tile.position.z, 0.52,
        startOf >= 0 ? '#ffffff' : '#3d4a86', board, 0.487);
    }
  }

  /* Home lanes + centre fan */
  for (let p = 0; p < 4; p++) {
    laneTiles[p] = [];
    for (let i = 0; i < 5; i++) {
      const [r, c] = HOMES[p][i];
      const laneMat = mat(new THREE.Color(COLORS[p]).lerp(new THREE.Color(0x1a2350), 0.08), 0.24, 0.08);
      laneMat.emissive = new THREE.Color(COLORS[p]);
      laneMat.emissiveIntensity = 0.4;
      const tile = mesh(tileGeo, laneMat);
      tile.userData.baseColor = COLORS[p];
      tile.userData.baseIntensity = 0.4;
      tile.position.set(c - 7, 0.43, r - 7);
      laneTiles[p][i] = tile;
    }
    const shape = new THREE.Shape();
    const corners = [[-1.47, -1.47], [1.47, -1.47], [1.47, 1.47], [-1.47, 1.47]];
    shape.moveTo(0, 0);
    shape.lineTo(...corners[p]);
    shape.lineTo(...corners[(p + 1) % 4]);
    shape.closePath();
    const fanMat = mat(COLORS[[1, 2, 3, 0][p]], 0.18, 0.12);
    fanMat.emissive = new THREE.Color(COLORS[[1, 2, 3, 0][p]]);
    fanMat.emissiveIntensity = 0.3;
    const tri = mesh(new THREE.ExtrudeGeometry(shape, {
      depth: 0.12, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 2, steps: 1
    }), fanMat);
    tri.rotation.x = Math.PI / 2;
    tri.position.y = 0.54;
  }
  const hub = mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.14, 6), mat(0xd9fff5, 0.1, 0.5));
  hub.position.y = 0.6;

  /* Floor */
  const floor = mesh(new THREE.CylinderGeometry(30, 30, 0.3, 96), mat(0x080b1e, 0.78, 0.04), scene);
  floor.position.y = -1.9;
  for (let i = 0; i < 3; i++) {
    const ring = mesh(new THREE.TorusGeometry(12 + i * 0.7, 0.017, 6, 120),
      new THREE.MeshBasicMaterial({ color: 0x7fa8d4, transparent: true, opacity: 0.14 - i * 0.03 }), scene);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.73;
  }
}

/* --------------------------------------------------------------------------
   Pawns
   -------------------------------------------------------------------------- */
function buildPieces() {
  const profile = [
    [0, 0], [0.31, 0], [0.38, 0.04], [0.4, 0.1], [0.39, 0.17], [0.32, 0.22],
    [0.26, 0.3], [0.19, 0.48], [0.16, 0.61], [0.18, 0.66], [0.26, 0.7],
    [0.31, 0.8], [0.3, 0.95], [0.25, 1.07], [0.12, 1.14], [0, 1.16]
  ].map((v) => new THREE.Vector2(v[0], v[1]));
  const pawnGeo = new THREE.LatheGeometry(profile, 40);

  for (let p = 0; p < 4; p++) {
    pawns[p] = [];
    for (let ti = 0; ti < 4; ti++) {
      const group = new THREE.Group();
      board.add(group);

      const pm = mat(COLORS[p], 0.14, 0.15);
      pm.clearcoat = 1;
      pm.clearcoatRoughness = 0.08;
      const body = mesh(pawnGeo, pm, group);
      body.userData = { player: p, token: ti };

      const collar = mesh(new THREE.TorusGeometry(0.325, 0.027, 8, 40), mat(0xebffff, 0.12, 0.65), group);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.205;

      const foot = mesh(new THREE.CylinderGeometry(0.355, 0.375, 0.045, 32), mat(COLORS[p], 0.2, 0.6), group);
      foot.position.y = 0.045;

      decal(String(ti + 1), 0, 0, 0.29, '#ffffff', group, 1.167);

      const halo = mesh(new THREE.RingGeometry(0.43, 0.57, 40),
        new THREE.MeshBasicMaterial({
          color: 0xa9ffee, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false
        }), group);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.027;
      halo.visible = false;
      halos.push(halo);

      group.userData = { player: p, token: ti, halo };
      pawns[p].push(group);
    }
  }
}

function syncPawns() {
  for (let p = 0; p < 4; p++) {
    const seated = seats.includes(p);
    for (let ti = 0; ti < 4; ti++) {
      pawns[p][ti].visible = seated;
      const pos = positionOf(p, ti);
      const stacked = positions[p]
        .map((v, i) => (v === positions[p][ti] && v >= 0 ? i : -1))
        .filter((i) => i >= 0);
      if (stacked.length > 1) {
        const k = stacked.indexOf(ti);
        pos.x += (k % 2 - 0.5) * 0.38;
        pos.z += (Math.floor(k / 2) - 0.5) * 0.38;
      }
      pawns[p][ti].position.copy(pos);
      pawns[p][ti].scale.setScalar(positions[p][ti] === 56 ? 0.7 : 1);
    }
  }
}

/* --------------------------------------------------------------------------
   Die (separate canvas in the tray)
   -------------------------------------------------------------------------- */
function buildDie() {
  dieScene = new THREE.Scene();
  dieScene.environment = scene.environment;

  dieScene.add(new THREE.HemisphereLight(0xffffff, 0x668aff, 3));
  const light = new THREE.DirectionalLight(0xeaffff, 4);
  light.position.set(-3, 5, 5);
  dieScene.add(light);

  dieCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
  dieCamera.position.set(0, 1, 5.2);
  dieCamera.lookAt(0, 0, 0);

  dieRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  dieRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  dieRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  dieRenderer.toneMappingExposure = 1.1;
  const slot = $('die');
  slot.appendChild(dieRenderer.domElement);
  const initial = slot.querySelector('.die-initial');
  if (initial) initial.hidden = true;

  dieGroup = new THREE.Group();
  dieScene.add(dieGroup);

  const dm = mat(0xc5f9ff, 0.1, 0.05);
  dm.transmission = 0.3;
  dm.thickness = 1.5;
  dm.ior = 1.5;
  mesh(new RoundedBoxGeometry(1.43, 1.43, 1.43, 5, 0.19), dm, dieGroup);

  const pips = {
    1: [[0, 0]],
    2: [[-1, 1], [1, -1]],
    3: [[-1, 1], [0, 0], [1, -1]],
    4: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    5: [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
    6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]]
  };
  const faces = [
    [1, 0, 0, 0], [6, 0, Math.PI, 0], [2, 0, Math.PI / 2, 0],
    [5, 0, -Math.PI / 2, 0], [3, -Math.PI / 2, 0, 0], [4, Math.PI / 2, 0, 0]
  ];
  faces.forEach(([n, rx, ry, rz]) => {
    const face = new THREE.Group();
    face.rotation.set(rx, ry, rz);
    dieGroup.add(face);
    pips[n].forEach(([x, y]) => {
      const pip = mesh(new THREE.SphereGeometry(0.105, 16, 12), mat(0x13396a, 0.19, 0.25), face);
      pip.scale.z = 0.2;
      pip.position.set(x * 0.34, y * 0.34, 0.719);
    });
  });
  dieGroup.rotation.set(0.3, -0.42, 0.08);
}

const DICE_EULER = {
  1: [0.25, -0.24, 0.1],
  2: [0.2, -Math.PI / 2, 0.1],
  3: [Math.PI / 2, 0, 0.1],
  4: [-Math.PI / 2, 0, 0.1],
  5: [0.2, Math.PI / 2, 0.1],
  6: [0.25, Math.PI, 0.1]
};

/* --------------------------------------------------------------------------
   Render / UI sync
   -------------------------------------------------------------------------- */
function restoreTile(tile) {
  if (!tile) return;
  tile.material.emissive.set(tile.userData.baseColor || 0);
  tile.material.emissiveIntensity = tile.userData.baseIntensity || 0;
}

function clearTargets() {
  ringTiles.forEach(restoreTile);
  laneTiles.forEach((arr) => arr && arr.forEach(restoreTile));
}

function markTargets() {
  if (tutorialStep >= 0) return;
  clearTargets();
  if (phase !== 'select') return;
  for (const ti of legal) {
    const next = positions[current][ti] < 0 ? 0 : positions[current][ti] + rollValue;
    if (next <= 50) {
      const tile = ringTiles[(current * 13 + next) % 52];
      if (tile) { tile.material.emissive.set(0x83efe7); tile.material.emissiveIntensity = 0.9; }
    } else {
      const tile = laneTiles[current][Math.min(next - 51, 4)];
      if (tile) { tile.material.emissive.set(0x83efe7); tile.material.emissiveIntensity = 0.9; }
    }
  }
}

function markHalos() {
  halos.forEach((h) => { h.visible = false; });
  if (phase !== 'select' || tutorialStep >= 0) return;
  legal.forEach((ti) => { pawns[current][ti].userData.halo.visible = true; });
}

function refresh() {
  const table = setupOpen ? (SEAT_SETS[setupPlayers] || SEAT_SETS[4]) : seats;
  const botSet = setupOpen
    ? new Set(table.slice(Math.max(0, table.length - setupBots)))
    : bots;

  document.querySelectorAll('.player').forEach((chip, p) => {
    const on = table.includes(p);
    chip.hidden = !on;
    chip.classList.toggle('is-bot', on && botSet.has(p));
    chip.classList.toggle('active', on && p === current && phase !== 'win' && !setupOpen);
    chip.querySelector('.score').textContent =
      `${positions[p].filter((v) => v === 56).length}/4`;
  });

  const sessionEl = $('sessionLabel');
  if (sessionEl) {
    const n = botSet.size;
    const botLabel = n === 0 ? t('hud.noBots')
      : n === 1 ? t('hud.oneBot') : t('hud.manyBots', { count: n });
    sessionEl.textContent = t('hud.session', { players: table.length, bots: botLabel });
    sessionEl.hidden = !matchStarted;
  }

  const turnText = $('turnText');
  const rollBtn = $('roll');
  const name = playerName(current);
  const botTurn = isBot(current) && phase !== 'win';

  if (phase === 'select') {
    turnText.textContent = botTurn
      ? t('hud.botChoosing', { player: name })
      : t('hud.chooseToken');
  } else if (phase === 'rolling') turnText.textContent = t('hud.rolling');
  else if (phase === 'win') turnText.textContent = t('hud.wins', { player: name });
  else if (phase === 'waiting') turnText.textContent = t('hud.passing');
  else {
    turnText.textContent = botTurn
      ? t('hud.botTurn', { player: name })
      : t('hud.toRoll', { player: name });
  }

  $('eyebrow').textContent = botTurn ? t('hud.botEyebrow') : t('hud.yourTurn');

  rollBtn.disabled = !ready || phase !== 'idle' || tutorialStep >= 0 || setupOpen || botTurn;
  rollBtn.textContent =
    phase === 'select' ? t('hud.move', { value: rollValue })
      : phase === 'rolling' ? t('hud.rolling')
        : t('hud.rollDice');

  $('hint').hidden = phase === 'select';
  if (!hintFaded) {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      hintFaded = true;
      $('hint').style.opacity = '0';
    }, 9000);
  }

  const tray = $('tokens');
  const humanChoice = phase === 'select' && tutorialStep < 0 && !botTurn && !setupOpen;
  tray.classList.toggle('show', humanChoice);
  tray.innerHTML = '';
  if (humanChoice) {
    for (const ti of legal) {
      const b = document.createElement('button');
      b.textContent = ti + 1;
      b.setAttribute('aria-label', `${t('hud.chooseToken')} ${ti + 1}`);
      b.addEventListener('click', () => move(ti));
      tray.appendChild(b);
    }
  }
  markTargets();
  markHalos();
  scheduleBot();
}

/* --------------------------------------------------------------------------
   Turn logic
   -------------------------------------------------------------------------- */
let actionId = 0;
const wait = (ms) => new Promise((resolve) => delay(resolve, ms));

function hop(obj, to, duration, arc) {
  return new Promise((resolve) => {
    tweens.push({
      obj,
      from: obj.position.clone(),
      to: to.clone(),
      start: performance.now(),
      duration,
      arc,
      resolve
    });
  });
}

function computeLegal(p, value) {
  return positions[p]
    .map((v, i) => {
      if (v === -1) return value === 6 ? i : -1;
      if (v === 56) return -1;
      return v + value <= 56 ? i : -1;
    })
    .filter((i) => i >= 0);
}

function roll() {
  if (phase !== 'idle' || tutorialStep >= 0 || !ready) return;
  const id = ++actionId;
  phase = 'rolling';
  rollValue = 1 + Math.floor(Math.random() * 6);
  rollingStart = performance.now();
  audio.play('roll');
  refresh();

  delay(() => {
    if (id !== actionId) return;
    dieGroup.rotation.set(...DICE_EULER[rollValue]);
    dieGroup.position.y = 0;
    if (rollValue === 6) sixes += 1; else sixes = 0;

    if (sixes === 3) {
      notice(t('toast.threeSixes'));
      endTurn(false);
      return;
    }
    legal = computeLegal(current, rollValue);
    if (!legal.length) {
      notice(t('toast.noMove', { player: playerName(current), value: rollValue }));
      phase = 'waiting';
      refresh();
      delay(() => { if (id === actionId) endTurn(rollValue === 6); }, 750);
      return;
    }
    phase = 'select';
    refresh();
    notice(t('toast.rolled', { value: rollValue }));
  }, reduced ? 150 : 900);
}

function endTurn(bonus) {
  if (bonus) {
    notice(t('toast.six', { player: playerName(current) }));
  } else {
    const at = seats.indexOf(current);
    current = seats[(at + 1) % seats.length];
    sixes = 0;
  }
  phase = 'idle';
  refresh();
}

/* --------------------------------------------------------------------------
   Seats, bots and match setup
   -------------------------------------------------------------------------- */
function isBot(p) {
  return bots.has(p);
}

/* Empty seats keep their colour but fade into the table. */
function tintYards(list = seats) {
  const dead = new THREE.Color(0x3b4257);
  for (let p = 0; p < 4; p++) {
    const on = list.includes(p);
    for (const part of yardParts[p]) {
      part.mesh.material.color.copy(part.base).lerp(dead, on ? 0 : 0.86);
      if (part.glow) part.mesh.material.emissiveIntensity = on ? part.glow : 0;
    }
  }
}

function applyMatch(players, botCount) {
  seats = (SEAT_SETS[players] || SEAT_SETS[4]).slice();
  const n = Math.max(0, Math.min(botCount, seats.length - 1));
  bots = new Set(seats.slice(seats.length - n));
  tintYards();
}

/* Score each legal token, best first. Simple but reads like a real opponent. */
function botPick() {
  const p = current;
  let best = legal[0];
  let bestScore = -Infinity;
  for (const ti of legal) {
    const v = positions[p][ti];
    const next = v < 0 ? 0 : v + rollValue;
    let score = next * 0.7 + Math.random() * 4;

    if (v < 0) score += 34;
    if (next === 56) score += 150;
    if (next > 56) score -= 400;

    if (next <= 50) {
      const dest = (p * 13 + next) % 52;
      if (SAFE.has(dest)) score += 16;
      let occupants = 0;
      let hunting = 0;
      for (const q of seats) {
        if (q === p) continue;
        for (let k = 0; k < 4; k++) {
          const w = positions[q][k];
          if (w < 0 || w > 50) continue;
          const at = (q * 13 + w) % 52;
          if (at === dest) occupants += 1;
          else if (at > dest && at - dest <= 6) hunting += 1;
        }
      }
      if (occupants === 1) score += 120;
      else if (occupants > 1) score -= 40;
      if (hunting && !SAFE.has(dest)) score -= 12;
    }
    if (score > bestScore) { bestScore = score; best = ti; }
  }
  return best;
}

function scheduleBot() {
  if (!ready || disposed) return;
  const sig = [phase, current, rollValue, actionId, tutorialStep, setupOpen, seats.length, bots.size].join('|');
  if (sig === botSig) return;
  botSig = sig;
  clearTimeout(botTimer);
  botTimer = null;
  if (setupOpen || tutorialStep >= 0 || phase === 'win' || !matchStarted) {
    botSig = '';
    return;
  }
  if (!isBot(current)) return;

  if (phase === 'idle') {
    botTimer = setTimeout(() => {
      botTimer = null;
      if (!disposed && phase === 'idle' && isBot(current)) roll();
    }, reduced ? 260 : 880);
  } else if (phase === 'select') {
    botTimer = setTimeout(() => {
      botTimer = null;
      if (!disposed && phase === 'select' && isBot(current)) move(botPick());
    }, reduced ? 300 : 820);
  }
}

function renderSetup() {
  $('segPlayers').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.value) === setupPlayers);
  });

  const maxBots = setupPlayers - 1;
  if (setupBots > maxBots) setupBots = maxBots;
  const segBots = $('segBots');
  segBots.innerHTML = '';
  for (let n = 0; n <= maxBots; n++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = String(n);
    b.textContent = String(n);
    b.classList.toggle('on', n === setupBots);
    b.addEventListener('click', () => { setupBots = n; renderSetup(); });
    segBots.appendChild(b);
  }

  const list = $('seatList');
  list.innerHTML = '';
  const table = SEAT_SETS[setupPlayers] || SEAT_SETS[4];
  tintYards(table);
  table.forEach((p, idx) => {
    const bot = idx >= table.length - setupBots;
    const el = document.createElement('span');
    el.className = 'seat' + (idx === 0 ? ' you' : '');
    el.style.setProperty('--player', `var(--color-${NAMES[p] === 'blue' ? 'violet' : NAMES[p]})`);
    const tag = bot ? t('setup.botTag') : (idx === 0 ? t('setup.you') : '');
    el.innerHTML = `<i></i>${playerName(p)}${tag ? ` <small>${tag}</small>` : ''}`;
    list.appendChild(el);
  });
  refresh();
}

function openSetup() {
  if (phase === 'rolling' || phase === 'moving') return;
  clearTimers();
  if (phase === 'waiting') { phase = 'idle'; legal = []; }
  setupOpen = true;
  $('win').hidden = true;
  $('setup').hidden = false;
  frameForSheet();
  $('setupClose').hidden = !matchStarted;
  $('tokens').classList.remove('show');
  renderSetup();
  refresh();
}

function closeSetup() {
  setupOpen = false;
  $('setup').hidden = true;
  $('tray').hidden = false;
  tintYards(seats);
  resetCamera();
  refresh();
  $('restart').focus();
}

function startMatch() {
  clearTimeout(botTimer);
  botTimer = null;
  applyMatch(setupPlayers, setupBots);
  matchStarted = true;
  setupOpen = false;
  $('setup').hidden = true;
  $('tray').hidden = false;
  resetGame();
}

async function move(ti) {
  if (phase !== 'select' || !legal.includes(ti) || tutorialStep >= 0) return;
  const id = ++actionId;
  const p = current;
  const old = positions[p][ti];
  phase = 'moving';
  refresh();

  const steps = [];
  if (old < 0) steps.push(0);
  else for (let v = old + 1; v <= old + rollValue; v++) steps.push(v);

  const stepMs = steps.length > 1 ? 90 : 260;
  for (const v of steps) {
    if (id !== actionId) return;
    positions[p][ti] = v;
    audio.play('step');
    await hop(pawns[p][ti], positionOf(p, ti, v), stepMs, steps.length > 1 ? 0.34 : 0.55);
  }
  if (id !== actionId) return;

  const landed = positions[p][ti];
  let captured = -1;

  if (landed >= 0 && landed <= 50) {
    const dest = (p * 13 + landed) % 52;
    if (!SAFE.has(dest)) {
      const occupants = [];
      for (let q = 0; q < 4; q++) {
        if (q === p) continue;
        for (let k = 0; k < 4; k++) {
          const v = positions[q][k];
          if (v >= 0 && v <= 50 && (q * 13 + v) % 52 === dest) occupants.push([q, k]);
        }
      }
      if (occupants.length === 1) {
        const [q, k] = occupants[0];
        positions[q][k] = -1;
        captured = q;
      }
    }
  }

  syncPawns();

  if (captured >= 0) {
    audio.play('capture');
    notice(t('toast.capture', { player: playerName(p), victim: playerName(captured) }));
  } else if (landed === 56) {
    audio.play('home');
    notice(t('toast.home', { player: playerName(p) }));
  } else if (old < 0) {
    notice(t('toast.out', { player: playerName(p) }));
  } else {
    notice(t('toast.moved', { player: playerName(p), value: rollValue }));
  }

  if (positions[p].every((v) => v === 56)) {
    phase = 'win';
    audio.play('win');
    $('winTitle').textContent = t('win.title', { player: playerName(p) });
    $('winnerMark').style.color = `#${COLORS[p].toString(16).padStart(6, '0')}`;
    $('win').hidden = false;
    refresh();
    return;
  }
  endTurn(rollValue === 6);
}

function resetGame() {
  actionId += 1;
  clearTimers();
  tweens.length = 0;
  positions = Array.from({ length: 4 }, () => [-1, -1, -1, -1]);
  current = seats[0];
  sixes = 0;
  phase = 'idle';
  legal = [];
  $('win').hidden = true;
  if (tutorialStep >= 0) closeTutorial();
  clearTargets();
  if (pawns.length) syncPawns();
  resetCamera();
  refresh();
  dieGroup.rotation.set(0.3, -0.42, 0.08);
  notice(t('toast.fresh', { player: playerName(current) }));
}

/* --------------------------------------------------------------------------
   Tutorial
   -------------------------------------------------------------------------- */
const STEP_COUNT = 7;

function tutorialText(i) {
  const step = TUTORIAL[i] || TUTORIAL[0];
  return [step.title, step.copy];
}

function openTutorial() {
  if (phase === 'rolling' || phase === 'moving' || phase === 'waiting') return;
  tutorialStep = 0;
  app.classList.add('tutorial-open');
  $('tutorial').hidden = false;
  $('setup').hidden = true;
  $('tray').hidden = true;
  $('tokens').classList.remove('show');
  $('win').hidden = true;
  showStep();
  $('closeTutorial').focus();
}

function showStep() {
  const [title, copy] = tutorialText(tutorialStep);
  $('stepLabel').textContent = t('tutorial.stepLabel', {
    index: String(tutorialStep + 1).padStart(2, '0'),
    total: String(STEP_COUNT).padStart(2, '0')
  });
  $('stepTitle').textContent = title;
  $('stepCopy').textContent = copy;
  $('prevStep').disabled = tutorialStep === 0;
  $('nextStep').textContent = tutorialStep === STEP_COUNT - 1
    ? t(introMode ? 'tutorial.setup' : 'tutorial.start')
    : t('tutorial.next');
  $('dots').innerHTML = Array.from({ length: STEP_COUNT },
    (_, i) => `<i class="${i === tutorialStep ? 'on' : ''}"></i>`).join('');

  clearTargets();
  halos.forEach((h) => { h.visible = false; });
  pawns.flat().forEach((g) => { g.visible = true; g.scale.setScalar(1); });
  syncPawns();

  const hero = pawns[0][0];
  const glow = (tile, color = 0x49d4d1, power = 1) => {
    if (!tile) return;
    tile.material.emissive.set(color);
    tile.material.emissiveIntensity = power;
  };

  if (tutorialStep === 0) {
    hero.position.copy(positionOf(0, 0, 0));
    hero.userData.halo.visible = true;
    dieGroup.rotation.set(...DICE_EULER[6]);
    glow(ringTiles[0], 0x83efe7, 1);
  } else if (tutorialStep === 1) {
    hero.position.copy(positionOf(0, 0, 7));
    for (let i = 0; i < 13; i++) glow(ringTiles[i], 0x4786c9, 0.8);
  } else if (tutorialStep === 2) {
    hero.position.copy(positionOf(0, 0, 18));
    pawns[1][0].position.copy(positionOf(0, 0, 19));
    hero.userData.halo.visible = true;
    pawns[1][0].userData.halo.visible = true;
  } else if (tutorialStep === 3) {
    SAFE.forEach((i) => glow(ringTiles[i], 0x49d4d1, 1));
    hero.position.copy(positionOf(0, 0, 8));
    hero.userData.halo.visible = true;
  } else if (tutorialStep === 4) {
    dieGroup.rotation.set(...DICE_EULER[6]);
    hero.position.copy(positionOf(0, 0, 6));
  } else if (tutorialStep === 5) {
    hero.position.copy(positionOf(0, 0, 54));
    hero.userData.halo.visible = true;
    for (let i = 0; i < 5; i++) glow(laneTiles[0][i], COLORS[0], 0.7);
  } else if (tutorialStep === 6) {
    pawns[0].forEach((g, i) => {
      g.position.set(-0.75 + (i % 2) * 0.5, 0.61, -0.25 + Math.floor(i / 2) * 0.5);
      g.scale.setScalar(0.7);
      g.userData.halo.visible = true;
    });
  }

  frameForTutorial();
  refresh();
}

function frameForTutorial(instant = false) {
  const narrow = app.clientWidth < 700;
  frameBoard(narrow ? 1.14 : 1.2, narrow ? 0.1 : 0.19, 0, instant);
}

function frameForSheet(instant = false) {
  const w = app.clientWidth;
  if (w >= 900) frameBoard(2.2, 0.04, 0.21, instant);
  else frameBoard(w < 700 ? 1.46 : 1.62, 0.17, 0, instant);
}

/* Whichever frame the current screen wants, applied now or eased into. */
function reframe(instant = false) {
  if (!camera) return;
  if (tutorialStep >= 0) frameForTutorial(instant);
  else if (setupOpen) frameForSheet(instant);
  else resetCamera(instant);
}

function closeTutorial() {
  const wasIntro = introMode;
  introMode = false;
  tutorialStep = -1;
  $('tutorial').hidden = true;
  app.classList.remove('tutorial-open');
  clearTargets();
  pawns.flat().forEach((g) => { g.scale.setScalar(positions[g.userData.player][g.userData.token] === 56 ? 0.7 : 1); });
  syncPawns();

  if (wasIntro && !matchStarted) {
    openSetup();
    $('setupStart').focus();
    return;
  }
  $('tray').hidden = false;
  if (setupOpen) $('setup').hidden = false;
  resetCamera();
  if (phase === 'win') $('win').hidden = false;
  refresh();
  if (!setupOpen) $('help').focus();
}

/* --------------------------------------------------------------------------
   Camera + input
   -------------------------------------------------------------------------- */
/* Camera frames are eased, not snapped. When a sheet takes over half the screen the
   board slides out of its way instead of teleporting there. */
const camMove = {
  on: false,
  start: 0,
  dur: 620,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromTarget: new THREE.Vector3(),
  toTarget: new THREE.Vector3()
};
let camPlaced = false;

/* Panning is anchored to whatever frame the current screen asked for, and the
   distance you may drag away from it grows the further you zoom in, so the whole
   board stays reachable without ever letting it drift off screen. */
const BOARD_REACH = 10.4;
const panAnchor = new THREE.Vector3();
const panDelta = new THREE.Vector3();
const panOff = new THREE.Vector3();

const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

function stopCamMove() {
  camMove.on = false;
}

/* How far the view may slide from its anchor at the current zoom. */
function panLimit() {
  const d = camera.position.distanceTo(controls.target);
  const halfV = d * Math.tan((camera.fov * Math.PI) / 360);
  const halfMin = Math.min(halfV, halfV * camera.aspect);
  return THREE.MathUtils.clamp(BOARD_REACH - halfMin, 1.1, BOARD_REACH);
}

function clampPan() {
  if (camMove.on) return;
  const limit = panLimit();
  panOff.copy(controls.target).sub(panAnchor);
  panOff.y = 0;
  if (panOff.length() > limit) panOff.setLength(limit);
  panDelta.set(
    panAnchor.x + panOff.x - controls.target.x,
    THREE.MathUtils.clamp(controls.target.y - panAnchor.y, -1.6, 2.4) + panAnchor.y - controls.target.y,
    panAnchor.z + panOff.z - controls.target.z
  );
  if (panDelta.lengthSq() < 1e-8) return;
  controls.target.add(panDelta);
  camera.position.add(panDelta);
}

function moveCameraTo(pos, target) {
  camMove.fromPos.copy(camera.position);
  camMove.fromTarget.copy(controls.target);
  camMove.toPos.copy(pos);
  camMove.toTarget.copy(target);
  camMove.start = performance.now();
  camMove.on = true;
}

function frameBoard(pad, rise, dxFrac = 0, instant = false) {
  const w = app.clientWidth;
  const h = app.clientHeight;
  const aspect = w / h;
  const fovV = (camera.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
  const radiusX = 13.2;
  const radiusY = 8.2;
  const d = pad * Math.max(radiusX / Math.sin(fovH / 2), radiusY / Math.sin(fovV / 2));
  const visibleH = 2 * d * Math.tan(fovV / 2);
  const targetZ = visibleH * rise;
  const dx = dxFrac * 2 * d * Math.tan(fovH / 2);
  const toTarget = new THREE.Vector3(dx, 0, targetZ);
  const toPos = new THREE.Vector3(dx + d * 0.05, d * 0.8, targetZ + d * 0.599);
  topView = false;

  if (instant || reduced || !camPlaced) {
    camMove.on = false;
    controls.target.copy(toTarget);
    panAnchor.copy(toTarget);
    camera.position.copy(toPos);
    controls.update();
    camPlaced = true;
    return;
  }
  panAnchor.copy(toTarget);
  moveCameraTo(toPos, toTarget);
}

function resetCamera(instant = false) {
  if (!camera) return;
  const narrow = app.clientWidth < 700;
  frameBoard(narrow ? 1.06 : 1.26, narrow ? 0.09 : 0.105, 0, instant);
}

function turnCamera() {
  const v = camera.position.clone().sub(controls.target);
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  camera.position.copy(controls.target).add(v);
  controls.update();
}

function topCamera() {
  if (topView) { resetCamera(); return; }
  const distance = camera.position.distanceTo(controls.target);
  camera.position.copy(controls.target).add(new THREE.Vector3(0, distance, 0.01));
  controls.update();
  topView = true;
}

let pointerStart = null;
const activePointers = new Set();
const raycaster = new THREE.Raycaster();

function onPointerDown(e) {
  stopCamMove();
  activePointers.add(e.pointerId);
  if (activePointers.size > 1) { pointerStart = null; return; }
  pointerStart = [e.clientX, e.clientY];
}

function onPointerRelease(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size > 0) pointerStart = null;
}

function onPointerUp(e) {
  onPointerRelease(e);
  if (!pointerStart) return;
  const moved = Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]);
  pointerStart = null;
  if (moved > 7 || phase !== 'select' || tutorialStep >= 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  ), camera);

  const targets = pawns[current].flatMap((g) => g.children);
  const hits = raycaster.intersectObjects(targets, true);
  for (const hit of hits) {
    const ti = hit.object.userData.token;
    if (ti !== undefined && legal.includes(ti)) { move(ti); break; }
  }
}

function onResize() {
  const w = app.clientWidth;
  const h = app.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  const rect = $('die').getBoundingClientRect();
  dieRenderer.setSize(rect.width, rect.height);
  dieCamera.aspect = rect.width / rect.height;
  dieCamera.updateProjectionMatrix();

  const narrow = w < 700;
  const flipped = lastNarrow !== null && narrow !== lastNarrow;
  lastNarrow = narrow;
  if (!ready) reframe(true);
  else if (flipped) reframe();
  else if (camMove.on) reframe(true);
}

function onVisibility() {
  cancelAnimationFrame(animateFrame);
  if (!document.hidden && !disposed) animateFrame = requestAnimationFrame(tick);
}

function tick(now) {
  if (disposed || document.hidden) return;

  if (camMove.on) {
    const u = Math.min(1, Math.max(0, (now - camMove.start) / camMove.dur));
    const e = easeInOut(u);
    camera.position.lerpVectors(camMove.fromPos, camMove.toPos, e);
    controls.target.lerpVectors(camMove.fromTarget, camMove.toTarget, e);
    if (u === 1) camMove.on = false;
  }

  controls.update();
  clampPan();

  if (phase === 'rolling') {
    const s = (now - rollingStart) / 1000;
    dieGroup.rotation.set(s * 10, s * 13, s * 8);
    dieGroup.position.y = Math.sin(s * Math.PI * 5) * 0.15;
  } else {
    dieGroup.position.y = 0;
  }

  for (let i = tweens.length - 1; i >= 0; i--) {
    const a = tweens[i];
    const u = Math.min(1, (now - a.start) / a.duration);
    const e = u * u * (3 - 2 * u);
    a.obj.position.lerpVectors(a.from, a.to, e);
    a.obj.position.y += Math.sin(u * Math.PI) * a.arc;
    if (u === 1) {
      a.obj.position.copy(a.to);
      tweens.splice(i, 1);
      if (a.resolve) a.resolve();
    }
  }

  if (!reduced) {
    halos.forEach((h) => {
      if (!h.visible) return;
      const s = 1 + Math.sin(now * 0.005) * 0.1;
      h.scale.set(s, s, 1);
    });
  }

  renderer.render(scene, camera);
  dieRenderer.render(dieScene, dieCamera);
  animateFrame = requestAnimationFrame(tick);
}

/* --------------------------------------------------------------------------
   Wiring
   -------------------------------------------------------------------------- */
const AVATAR = '<svg viewBox="0 0 20 30"><path d="M10 2a5 5 0 0 1 3 9l2 9h2l1 7H2l1-7h2l2-9a5 5 0 0 1 3-9Z"/></svg>';

function bindEvents() {
  document.querySelectorAll('.avatar').forEach((el) => { el.innerHTML = AVATAR; });

  const kick = () => { audio.startBgm(); window.removeEventListener('pointerdown', kick); };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick, { once: true });

  $('roll').addEventListener('click', roll);
  $('help').addEventListener('click', openTutorial);
  $('rotate').addEventListener('click', turnCamera);
  $('topview').addEventListener('click', topCamera);
  $('resetview').addEventListener('click', resetCamera);
  $('sound').addEventListener('click', () => audio.toggle());
  $('closeTutorial').addEventListener('click', closeTutorial);

  $('nextStep').addEventListener('click', () => {
    if (tutorialStep === STEP_COUNT - 1) closeTutorial();
    else { tutorialStep += 1; showStep(); }
  });
  $('prevStep').addEventListener('click', () => {
    if (tutorialStep > 0) { tutorialStep -= 1; showStep(); }
  });

  $('restart').addEventListener('click', openSetup);
  $('setupStart').addEventListener('click', startMatch);
  $('setupHowto').addEventListener('click', openTutorial);
  $('setupClose').addEventListener('click', closeSetup);
  $('segPlayers').querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      setupPlayers = Number(b.dataset.value);
      if (setupBots > setupPlayers - 1) setupBots = setupPlayers - 1;
      renderSetup();
    });
  });
  $('playAgain').addEventListener('click', resetGame);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (tutorialStep >= 0) closeTutorial();
      else if (setupOpen && matchStarted) closeSetup();
    }
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      roll();
    }
  });

}

function cleanup() {
  disposed = true;
  cancelAnimationFrame(animateFrame);
  clearTimers();
  clearTimeout(toastTimer);
  window.removeEventListener('resize', onResize);
  document.removeEventListener('visibilitychange', onVisibility);
  controls?.dispose();
  for (const s of [scene, dieScene]) {
    s?.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        const list = Array.isArray(o.material) ? o.material : [o.material];
        list.forEach((m) => { m.map?.dispose(); m.dispose(); });
      }
    });
  }
  scene?.environment?.dispose();
  scene?.background?.dispose();
  renderer?.dispose();
  dieRenderer?.dispose();
}

async function boot() {
  bindEvents();
  await audio.init();
  try {
    setup();
  } catch (err) {
    console.error(err);
    window.__bootError = String(err && err.stack || err);
    $('fallback').hidden = false;
    $('fallback').querySelector('span').textContent = t('loading.noWebgl');
  }
  window.addEventListener('pagehide', cleanup);
  if (ready && !disposed) {
    introMode = true;
    openTutorial();
  }
}

boot();

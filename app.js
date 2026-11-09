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
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

/* Five boards. A theme repaints the room, re-materials the table, changes the tile
   shape and light rig, and swaps in its own loop and effects. */
const THEMES = {
  prism: {
    id: 'prism', label: 'Prism', audio: 'prism',
    seats: [0xff2d6b, 0x14e8b0, 0xffc21a, 0x4a63ff],
    room: { bg: ['#1f2668', '#141838', '#080a1c'], bloom: '#17636f', fog: 0x080b1e, floor: 0x080b1e, ring: 0x7fa8d4, exposure: 1.02, page: '#0a0d22' },
    frame: { plinth: 0x181e52, edge: 0x6a5ae0, base: 0x33307e, plate: 0x0a0f2c, ice: 0x2b2870, metal: 0.2, radius: 0.4, trim: 0x74ead9, trimEmissive: 0x248e9c, trimGlow: 0.7 },
    track: { tile: 0xfaf3e2, w: 0.955, h: 0.12, r: 0.045, y: 0.42, rough: 0.26, metal: 0.06, startGlow: 0.46, tileGlow: 0, laneGlow: 0.4, laneLerp: 0.08, fanGlow: 0.3, hub: 0xd9fff5, pip: '#3d4a86' },
    yards: { glow: 0.34, inner: 0x1b2350, innerLerp: 0.45, centre: 0x172452, centreLerp: 0.3 },
    pieces: { rough: 0.14, metal: 0.15, clearcoat: 0.08, collar: 0xebffff, halo: 0xa9ffee, number: '#ffffff' },
    die: { body: 0xc5f9ff, pip: 0x13396a, transmission: 0.3 },
    lights: { hemiSky: 0xa9c8ff, hemiGround: 0x120d33, hemi: 0.55, key: 0xe5fbff, keyInt: 2.5, rim: 0x7e6dff, rimInt: 1.7, warm: 0xff8c88, warmInt: 16 }
  },
  ember: {
    id: 'ember', label: 'Ember', audio: 'ember',
    seats: [0xff6a3d, 0xffc247, 0x77c98a, 0xb05f8f],
    room: { bg: ['#3f2513', '#22150c', '#0e0905'], bloom: '#8a4a1a', fog: 0x140c07, floor: 0x150d08, ring: 0xc08050, exposure: 1.0, page: '#150d08' },
    frame: { plinth: 0x2b1a12, edge: 0x6b4227, base: 0x4a2d1b, plate: 0x1a100b, ice: 0x3a2415, metal: 0.06, radius: 0.6, trim: 0xff9d5c, trimEmissive: 0xc25a1f, trimGlow: 0.45 },
    track: { tile: 0xe8d3b0, w: 0.95, h: 0.1, r: 0.02, y: 0.42, rough: 0.44, metal: 0.04, startGlow: 0.36, tileGlow: 0, laneGlow: 0.3, laneLerp: 0.12, fanGlow: 0.24, hub: 0xf6e3c4, pip: '#6d4a2c' },
    yards: { glow: 0.28, inner: 0x2c1a10, innerLerp: 0.5, centre: 0x24140c, centreLerp: 0.35 },
    pieces: { rough: 0.24, metal: 0.12, clearcoat: 0.22, collar: 0xfff0dc, halo: 0xffc08a, number: '#fff4e4' },
    die: { body: 0xf6e2c0, pip: 0x51301a, transmission: 0.08 },
    lights: { hemiSky: 0xffd9b0, hemiGround: 0x2a1206, hemi: 0.6, key: 0xffe6c4, keyInt: 2.6, rim: 0xff7a3d, rimInt: 1.5, warm: 0xff6a2a, warmInt: 18 }
  },
  marble: {
    id: 'marble', label: 'Marble', audio: 'marble',
    seats: [0xbe2e5c, 0x1f8f7a, 0xc8961f, 0x3d54a8],
    room: { bg: ['#33363d', '#232529', '#101113'], bloom: '#6f6248', fog: 0x14151a, floor: 0x15161b, ring: 0xb9a583, exposure: 1.0, page: '#111318' },
    frame: { plinth: 0x1b1a20, edge: 0xc9b27a, base: 0xeae2d0, plate: 0x14131a, ice: 0xf3ece0, metal: 0.04, radius: 0.3, trim: 0xd8b45a, trimEmissive: 0x8a6a20, trimGlow: 0.35 },
    track: { tile: 0xfbf8f2, w: 0.92, h: 0.13, r: 0.05, y: 0.42, rough: 0.18, metal: 0.05, startGlow: 0.28, tileGlow: 0, laneGlow: 0.26, laneLerp: 0.1, fanGlow: 0.2, hub: 0xf6efe0, pip: '#8d8574' },
    yards: { glow: 0.2, inner: 0x2a2830, innerLerp: 0.42, centre: 0x22212a, centreLerp: 0.3 },
    pieces: { rough: 0.12, metal: 0.1, clearcoat: 0.05, collar: 0xf4f0e6, halo: 0xf2d9a0, number: '#3a3128' },
    die: { body: 0xfbf6ea, pip: 0x3a3128, transmission: 0.16 },
    lights: { hemiSky: 0xfff8ea, hemiGround: 0x2b2a26, hemi: 0.7, key: 0xfff6e0, keyInt: 2.9, rim: 0xb9a583, rimInt: 1.2, warm: 0xffcaa0, warmInt: 12 }
  },
  neon: {
    id: 'neon', label: 'Neon', audio: 'neon',
    seats: [0xff2fb4, 0x1ff0ff, 0xffe94a, 0x9d5cff],
    room: { bg: ['#2a0f5e', '#0b0518', '#020106'], bloom: '#6a1ec0', fog: 0x03020a, floor: 0x02020c, ring: 0x7a4dff, exposure: 0.95, page: '#03020a' },
    frame: { plinth: 0x04050b, edge: 0x18255c, base: 0x05070f, plate: 0x020308, ice: 0x04060e, metal: 0.3, radius: 0.45, trim: 0x21f2ff, trimEmissive: 0x00d5ff, trimGlow: 1.5 },
    track: { tile: 0x16214f, tileEmissive: 0x2f5cff, w: 0.84, h: 0.1, r: 0.02, y: 0.4, rough: 0.45, metal: 0.05, startGlow: 1.45, tileGlow: 0.55, laneGlow: 1.35, laneLerp: 0.02, fanGlow: 0.9, hub: 0xe8fdff, pip: '#7f9dff' },
    yards: { glow: 0.7, inner: 0x05070f, innerLerp: 0.55, centre: 0x030410, centreLerp: 0.3 },
    pieces: { rough: 0.06, metal: 0.22, clearcoat: 0.04, collar: 0xf0ffff, halo: 0x33f7ff, number: '#ffffff' },
    die: { body: 0x0d1430, pip: 0x35f0ff, transmission: 0.25 },
    lights: { hemiSky: 0x9d7bff, hemiGround: 0x04020c, hemi: 0.34, key: 0xbff6ff, keyInt: 1.5, rim: 0xff2fb4, rimInt: 3.2, warm: 0x1ff0ff, warmInt: 22 }
  },
  jade: {
    id: 'jade', label: 'Jade', audio: 'jade',
    seats: [0x18a06f, 0xd9c84a, 0xff7a63, 0x5a7ee0],
    room: { bg: ['#1d3f2a', '#101f18', '#060c09'], bloom: '#2a7a52', fog: 0x070f0b, floor: 0x08110d, ring: 0x7fbf94, exposure: 1.0, page: '#08110d' },
    frame: { plinth: 0x14201a, edge: 0x6b8f5e, base: 0x22382a, plate: 0x0d1710, ice: 0x1b2a1f, metal: 0.05, radius: 0.3, trim: 0xa8d46a, trimEmissive: 0x5c8f2a, trimGlow: 0.5 },
    track: { tile: 0xf2eddc, w: 0.95, h: 0.07, r: 0.03, y: 0.4, rough: 0.36, metal: 0.04, startGlow: 0.34, tileGlow: 0, laneGlow: 0.3, laneLerp: 0.12, fanGlow: 0.24, hub: 0xeef7dd, pip: '#6b7a5c' },
    yards: { glow: 0.26, inner: 0x12200f, innerLerp: 0.45, centre: 0x0e1a0b, centreLerp: 0.3 },
    pieces: { rough: 0.2, metal: 0.12, clearcoat: 0.16, collar: 0xf8f4e4, halo: 0xc8f0a0, number: '#20301f' },
    die: { body: 0xf6f1de, pip: 0x2c3a28, transmission: 0.1 },
    lights: { hemiSky: 0xd8f0c0, hemiGround: 0x0d1510, hemi: 0.65, key: 0xf2ffe0, keyInt: 2.6, rim: 0x4fbf8a, rimInt: 1.6, warm: 0xffc98a, warmInt: 14 }
  }
};

const THEME_IDS = ['prism', 'ember', 'marble', 'neon', 'jade'];
const THEME_KEY = 'prism-ludo-theme';

function storedTheme() {
  try {
    const id = localStorage.getItem(THEME_KEY);
    if (THEMES[id]) return THEMES[id];
  } catch (_e) { /* storage may be blocked */ }
  return THEMES.prism;
}

let THEME = storedTheme();
const COLORS = THEME.seats.slice();
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
let hemiLight, keyLight, rimLight, warmLight;
let bgCanvas, bgTexture;
let dieRenderer, dieScene, dieCamera, dieGroup, dieHemi, dieKey;
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
  theme: '',
  async init() {
    try {
      const raw = localStorage.getItem('prism-ludo-muted');
      this.muted = raw === 'true';
    } catch (_e) { /* storage may be blocked */ }
    this.bgm = new Audio();
    this.bgm.loop = true;
    this.bgm.preload = 'auto';
    this.bgm.volume = 0.32;
    for (const name of ['roll', 'step', 'capture', 'home', 'win']) {
      const el = new Audio();
      el.preload = 'auto';
      el.volume = 0.55;
      this.files[name] = el;
    }
    this.setTheme(THEME.audio);
    this.applyMute();
  },
  /* Every theme ships its own loop and effects; switching keeps the loop running. */
  setTheme(theme) {
    if (!this.bgm || this.theme === theme) return;
    this.theme = theme;
    const playing = !this.bgm.paused && !this.bgm.ended;
    this.bgm.src = `./audio/${theme}/bgm.mp3`;
    for (const name of Object.keys(this.files)) {
      this.files[name].src = `./audio/${theme}/${name}.mp3`;
    }
    if (playing && !this.muted) this.bgm.play().catch(() => {});
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

  bgCanvas = document.createElement('canvas');
  bgCanvas.width = bgCanvas.height = 512;
  paintBackground(THEME);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTex;
  scene.fog = new THREE.FogExp2(THEME.room.fog, 0.006);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = THEME.room.exposure;
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

  hemiLight = new THREE.HemisphereLight(0xa9c8ff, 0x120d33, 0.55);
  scene.add(hemiLight);

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
  keyLight = key;

  const rim = new THREE.DirectionalLight(0x7e6dff, 1.7);
  rim.position.set(12, 8, -10);
  scene.add(rim);
  rimLight = rim;

  const warm = new THREE.PointLight(0xff8c88, 16, 22, 2);
  warm.position.set(-14, 5.5, 10);
  scene.add(warm);
  warmLight = warm;

  board = new THREE.Group();
  scene.add(board);
  applyLights(THEME);

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
function paintBackground(theme) {
  if (!bgCanvas) return;
  const ctx = bgCanvas.getContext('2d');
  const [core, mid, outer] = theme.room.bg;
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = mid;
  ctx.fillRect(0, 0, 512, 512);
  let g = ctx.createRadialGradient(258, 168, 0, 256, 256, 360);
  g.addColorStop(0, core);
  g.addColorStop(0.46, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  g = ctx.createRadialGradient(20, 90, 0, 20, 90, 260);
  g.addColorStop(0, theme.room.bloom);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
}

function alignEmissive(material, colour, strength) {
  if (!strength) return;
  material.emissive = new THREE.Color(colour);
  material.emissiveIntensity = strength;
}

function tileGeometry() {
  const t = THEME.track;
  return new RoundedBoxGeometry(t.w, t.h, t.w, 2, t.r);
}

function buildTable() {
  const f = THEME.frame;
  const t = THEME.track;

  box(18.7, 0.7, 18.7, 0.45, mat(f.plinth, 0.34, 0.18), 0, -1, 0);
  box(18.15, 0.14, 18.15, f.radius, mat(f.edge, 0.22, 0.34), 0, -0.59, 0);
  box(17.95, 0.48, 17.95, f.radius, mat(f.base, 0.3, f.metal), 0, -0.3, 0);
  box(16.55, 0.22, 16.55, f.radius * 0.8, mat(f.plate, 0.34, 0.2), 0, 0.07, 0);
  box(16.15, 0.21, 16.15, f.radius * 0.6, mat(f.ice, 0.32, 0.08), 0, 0.23, 0);

  const trim = mat(f.trim, 0.18, 0.25);
  trim.emissive.set(f.trimEmissive);
  trim.emissiveIntensity = f.trimGlow;
  for (const z of [-8.4, 8.4]) box(16.4, 0.03, 0.03, 0.012, trim, 0, 0.19, z);
  for (const x of [-8.4, 8.4]) box(0.03, 0.03, 16.4, 0.012, trim, x, 0.19, 0);

  /* Yards */
  for (let p = 0; p < 4; p++) {
    const x = p === 0 || p === 3 ? -4.5 : 4.5;
    const z = p < 2 ? -4.5 : 4.5;
    const keep = (o) => {
      yardParts[p].push({ mesh: o, base: o.material.color.clone(), glow: o.material.emissiveIntensity || 0 });
      return o;
    };
    const slab = mat(COLORS[p], THEME.pieces.rough + 0.05, THEME.pieces.metal * 0.9);
    slab.emissive = new THREE.Color(COLORS[p]);
    slab.emissiveIntensity = THEME.yards.glow;
    keep(box(5.85, 0.12, 5.85, 0.36, slab, x, 0.4, z));
    keep(box(4.62, 0.09, 4.62, 0.45,
      mat(new THREE.Color(COLORS[p]).lerp(new THREE.Color(THEME.yards.inner), THEME.yards.innerLerp), 0.26, 0.06), x, 0.49, z));
    for (let ti = 0; ti < 4; ti++) {
      const [r, c] = YARDS[p][ti];
      const dock = keep(mesh(new THREE.CylinderGeometry(0.66, 0.72, 0.07, 40), mat(COLORS[p], 0.23, 0.1)));
      dock.position.set(c - 7, 0.56, r - 7);
      const centre = keep(mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.073, 40),
        mat(new THREE.Color(COLORS[p]).lerp(new THREE.Color(THEME.yards.centre), THEME.yards.centreLerp))));
      centre.position.set(c - 7, 0.565, r - 7);
    }
    keep(decal(['R', 'G', 'Y', 'B'][p], x, z, 0.65, THEME.pieces.number, board, 0.548));
  }
  tintYards();

  /* Ring */
  const tileGeo = tileGeometry();
  const tileTop = t.y + t.h / 2;
  for (let i = 0; i < 52; i++) {
    const startOf = START.indexOf(i);
    const colour = startOf >= 0 ? COLORS[startOf] : t.tile;
    const glowColour = startOf >= 0 ? colour : (t.tileEmissive || colour);
    const tileMat = mat(colour, t.rough, t.metal);
    alignEmissive(tileMat, glowColour, startOf >= 0 ? t.startGlow : t.tileGlow);
    const tile = mesh(tileGeo, tileMat);
    tile.userData.baseColor = glowColour;
    tile.userData.baseIntensity = startOf >= 0 ? t.startGlow : t.tileGlow;
    tile.position.set(PATH[i][1] - 7, t.y, PATH[i][0] - 7);
    ringTiles[i] = tile;
    if (SAFE.has(i)) {
      decal('✦', tile.position.x, tile.position.z, 0.52,
        startOf >= 0 ? '#ffffff' : t.pip, board, tileTop + 0.007);
    }
  }

  /* Home lanes + centre fan */
  for (let p = 0; p < 4; p++) {
    laneTiles[p] = [];
    for (let i = 0; i < 5; i++) {
      const [r, c] = HOMES[p][i];
      const laneMat = mat(new THREE.Color(COLORS[p]).lerp(new THREE.Color(THEME.yards.centre), t.laneLerp), t.rough, t.metal);
      laneMat.emissive = new THREE.Color(COLORS[p]);
      laneMat.emissiveIntensity = t.laneGlow;
      const tile = mesh(tileGeo, laneMat);
      tile.userData.baseColor = COLORS[p];
      tile.userData.baseIntensity = t.laneGlow;
      tile.position.set(c - 7, t.y + 0.01, r - 7);
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
    fanMat.emissiveIntensity = t.fanGlow;
    const tri = mesh(new THREE.ExtrudeGeometry(shape, {
      depth: 0.12, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 2, steps: 1
    }), fanMat);
    tri.rotation.x = Math.PI / 2;
    tri.position.y = 0.54;
  }
  const hub = mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.14, 6), mat(t.hub, 0.1, 0.5));
  hub.position.y = 0.6;

  /* Floor */
  const floor = mesh(new THREE.CylinderGeometry(30, 30, 0.3, 96), mat(THEME.room.floor, 0.78, 0.04), board);
  floor.position.y = -1.9;
  for (let i = 0; i < 3; i++) {
    const ring = mesh(new THREE.TorusGeometry(12 + i * 0.7, 0.017, 6, 120),
      new THREE.MeshBasicMaterial({ color: THEME.room.ring, transparent: true, opacity: 0.14 - i * 0.03 }), board);
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

      const pm = mat(COLORS[p], THEME.pieces.rough, THEME.pieces.metal);
      pm.clearcoat = 1;
      pm.clearcoatRoughness = THEME.pieces.clearcoat;
      const body = mesh(pawnGeo, pm, group);
      body.userData = { player: p, token: ti };

      const collar = mesh(new THREE.TorusGeometry(0.325, 0.027, 8, 40), mat(THEME.pieces.collar, 0.12, 0.65), group);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.205;

      const foot = mesh(new THREE.CylinderGeometry(0.355, 0.375, 0.045, 32), mat(COLORS[p], 0.2, 0.6), group);
      foot.position.y = 0.045;

      decal(String(ti + 1), 0, 0, 0.29, THEME.pieces.number, group, 1.167);

      const halo = mesh(new THREE.RingGeometry(0.43, 0.57, 40),
        new THREE.MeshBasicMaterial({
          color: THEME.pieces.halo, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false
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

  dieHemi = new THREE.HemisphereLight(0xffffff, 0x668aff, 3);
  dieScene.add(dieHemi);
  dieKey = new THREE.DirectionalLight(0xeaffff, 4);
  dieKey.position.set(-3, 5, 5);
  dieScene.add(dieKey);

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
  buildDieBody();

}

function buildDieBody() {
  if (!dieGroup) return;
  disposeChildren(dieGroup);
  const dm = mat(THEME.die.body, 0.1, 0.05);
  dm.transmission = THEME.die.transmission;
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
      const pip = mesh(new THREE.SphereGeometry(0.105, 16, 12), mat(THEME.die.pip, 0.19, 0.25), face);
      pip.scale.z = 0.2;
      pip.position.set(x * 0.34, y * 0.34, 0.719);
    });
  });
  dieGroup.rotation.set(0.3, -0.42, 0.08);
}

/* --------------------------------------------------------------------------
   Themes
   -------------------------------------------------------------------------- */
function applyLights(theme) {
  const l = theme.lights;
  if (hemiLight) {
    hemiLight.color.set(l.hemiSky);
    hemiLight.groundColor.set(l.hemiGround);
    hemiLight.intensity = l.hemi;
  }
  if (keyLight) {
    keyLight.color.set(l.key);
    keyLight.intensity = l.keyInt;
  }
  if (rimLight) {
    rimLight.color.set(l.rim);
    rimLight.intensity = l.rimInt;
  }
  if (warmLight) {
    warmLight.color.set(l.warm);
    warmLight.intensity = l.warmInt;
  }
  if (dieHemi) dieHemi.color.set(l.hemiSky);
  if (dieKey) dieKey.color.set(l.key);
}

function disposeChildren(group) {
  if (!group) return;
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const list = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    list.forEach((m) => { m.map?.dispose(); m.dispose(); });
  });
  group.clear();
}

function clearBoard() {
  for (let p = 0; p < 4; p++) yardParts[p].length = 0;
  ringTiles.length = 0;
  laneTiles.length = 0;
  halos.length = 0;
  pawns.length = 0;
  disposeChildren(board);
}

/* Swap boards mid-match: the room, the table, the pieces and the die all follow,
   then the tokens are put back where the game says they are. */
function applyTheme(id) {
  const next = THEMES[id] || THEMES.prism;
  const changed = next.id !== THEME.id;
  THEME = next;
  for (let i = 0; i < 4; i++) COLORS[i] = next.seats[i];
  applyThemeVars(next);
  syncThemePicks();
  if (changed) {
    try { localStorage.setItem(THEME_KEY, next.id); } catch (_e) { /* ignore */ }
  }
  if (ready) {
    audio.setTheme(next.audio);
    if (changed) {
      paintBackground(next);
      if (scene.background) scene.background.needsUpdate = true;
      scene.fog.color.set(next.room.fog);
      renderer.toneMappingExposure = next.room.exposure;
      applyLights(next);
      clearBoard();
      buildTable();
      buildPieces();
      buildDieBody();
      syncPawns();
      tintYards();
      refresh();
    }
  }
}

function applyThemeVars(theme) {
  const root = document.documentElement.style;
  root.setProperty('--color-red', hex(theme.seats[0]));
  root.setProperty('--color-green', hex(theme.seats[1]));
  root.setProperty('--color-gold', hex(theme.seats[2]));
  root.setProperty('--color-violet', hex(theme.seats[3]));
  root.setProperty('--color-night', theme.room.page);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.room.page);
}

function renderThemes() {
  const wrap = $('segThemes');
  if (!wrap) return;
  wrap.innerHTML = '';
  THEME_IDS.forEach((id) => {
    const theme = THEMES[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-pick' + (THEME.id === id ? ' on' : '');
    b.setAttribute('aria-pressed', String(THEME.id === id));
    b.setAttribute('aria-label', `${theme.label} theme`);
    const stops = theme.seats.map((c) => hex(c)).join(',');
    b.innerHTML = `<i style="background:linear-gradient(120deg,${stops})"></i><span>${theme.label}</span>`;
    b.addEventListener('click', () => { applyTheme(id); renderThemes(); });
    wrap.appendChild(b);
  });
}

function syncThemePicks() {
  document.querySelectorAll('#segThemes .theme-pick').forEach((b, i) => {
    const on = THEME_IDS[i] === THEME.id;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
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

  renderThemes();

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
  applyThemeVars(THEME);
  renderThemes();
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

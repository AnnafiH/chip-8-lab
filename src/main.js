import { Chip8 } from './chip8.js';

const emulator = new Chip8();
const canvas = document.querySelector('#screen');
const context = canvas.getContext('2d', { alpha: false });
const romInput = document.querySelector('#rom-file');
const status = document.querySelector('.status');
const statusText = document.querySelector('#status-text');
const statusLight = document.querySelector('#status-light');
const errorMessage = document.querySelector('#error-message');
const speedInput = document.querySelector('#speed');
const speedValue = document.querySelector('#speed-value');
const heldKeys = new Set();
const keyMap = new Map([
  ['Digit1', 0x1], ['Digit2', 0x2], ['Digit3', 0x3], ['Digit4', 0xc],
  ['KeyQ', 0x4], ['KeyW', 0x5], ['KeyE', 0x6], ['KeyR', 0xd],
  ['KeyA', 0x7], ['KeyS', 0x8], ['KeyD', 0x9], ['KeyF', 0xe],
  ['KeyZ', 0xa], ['KeyX', 0x0], ['KeyC', 0xb], ['KeyV', 0xf]
]);
const demoRom = new Uint8Array([0x00, 0xe0, 0x60, 0x1c, 0x61, 0x0d, 0xa2, 0x0c, 0xd0, 0x17, 0x12, 0x0a, 0x3c, 0x42, 0xa5, 0x81, 0xa5, 0x42, 0x3c]);
let running = false;
let lastFrame = 0;
let cycleAccumulator = 0;
let timerAccumulator = 0;
let audioContext;
let oscillator;
let gain;
let loadedRom;

function renderScreen() {
  const image = context.createImageData(64, 32);
  for (let index = 0; index < emulator.display.length; index += 1) {
    const offset = index * 4;
    const color = emulator.display[index] ? [215, 255, 156] : [10, 16, 14];
    image.data[offset] = color[0];
    image.data[offset + 1] = color[1];
    image.data[offset + 2] = color[2];
    image.data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

function renderState() {
  document.querySelector('#registers').innerHTML = Array.from(emulator.registers, (value, index) =>
    `<div class="register${index === 15 ? ' flag' : ''}"><span>V${index.toString(16).toUpperCase()}</span><b>${value.toString(16).padStart(2, '0').toUpperCase()}</b></div>`
  ).join('');
  document.querySelector('#pc-value').textContent = emulator.pc.toString(16).padStart(4, '0').toUpperCase();
  document.querySelector('#i-value').textContent = emulator.i.toString(16).padStart(4, '0').toUpperCase();
  document.querySelector('#delay-value').textContent = emulator.delayTimer.toString(16).padStart(2, '0').toUpperCase();
  document.querySelector('#sound-value').textContent = emulator.soundTimer.toString(16).padStart(2, '0').toUpperCase();
  document.querySelector('#cycle-count').textContent = `${emulator.cycles.toString().padStart(6, '0')} CYCLES`;
}

function setRunning(nextState) {
  running = nextState;
  status.classList.toggle('running', running);
  statusText.textContent = running ? 'RUNNING' : 'PAUSED';
  document.querySelector('#start-button').disabled = running || !hasRom;
  document.querySelector('#pause-button').disabled = !running;
  document.querySelector('#reset-button').disabled = !hasRom;
}

let hasRom = false;

function loadRom(bytes, name) {
  try {
    emulator.loadProgram(bytes);
    loadedRom = new Uint8Array(bytes);
    hasRom = true;
    document.querySelector('#rom-name').textContent = name.toUpperCase();
    errorMessage.textContent = '';
    cycleAccumulator = 0;
    timerAccumulator = 0;
    heldKeys.clear();
    document.querySelectorAll('.keypad button').forEach(button => button.classList.remove('active'));
    renderScreen();
    renderState();
    setRunning(false);
  } catch (error) {
    errorMessage.textContent = error.message;
  }
}

function loop(timestamp) {
  if (!running) return;
  const elapsed = Math.min(timestamp - lastFrame, 100);
  lastFrame = timestamp;
  cycleAccumulator += elapsed * Number(speedInput.value) / 1000;
  timerAccumulator += elapsed * 60 / 1000;

  try {
    while (cycleAccumulator >= 1) {
      emulator.cycle();
      cycleAccumulator -= 1;
    }
    const timerTicks = Math.floor(timerAccumulator);
    if (timerTicks > 0) {
      emulator.tickTimers(timerTicks);
      timerAccumulator -= timerTicks;
    }
    oscillator?.frequency.setTargetAtTime(emulator.soundTimer > 0 ? 440 : 0, audioContext.currentTime, 0.015);
    renderScreen();
    renderState();
  } catch (error) {
    errorMessage.textContent = error.message;
    setRunning(false);
    return;
  }

  requestAnimationFrame(loop);
}

function start() {
  if (!hasRom || running) return;
  if (!audioContext) {
    audioContext = new AudioContext();
    oscillator = audioContext.createOscillator();
    gain = audioContext.createGain();
    oscillator.type = 'square';
    gain.gain.value = 0.025;
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
  }
  audioContext.resume();
  setRunning(true);
  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

function setKey(key, pressed) {
  emulator.setKey(key, pressed);
  const button = document.querySelector(`.keypad button[data-key="${key.toString(16).toUpperCase()}"]`);
  button?.classList.toggle('active', pressed);
}

romInput.addEventListener('change', async () => {
  const file = romInput.files?.[0];
  if (file) loadRom(new Uint8Array(await file.arrayBuffer()), file.name);
});
document.querySelector('#demo-button').addEventListener('click', () => loadRom(demoRom, 'LAB DEMO / PIXEL ORBIT'));
document.querySelector('#start-button').addEventListener('click', start);
document.querySelector('#pause-button').addEventListener('click', () => setRunning(false));
document.querySelector('#reset-button').addEventListener('click', () => {
  if (!hasRom) return;
  const name = document.querySelector('#rom-name').textContent;
  loadRom(loadedRom, name);
});
speedInput.addEventListener('input', () => { speedValue.value = `${speedInput.value} Hz`; });
window.addEventListener('keydown', event => {
  const key = keyMap.get(event.code);
  if (key === undefined || event.repeat) return;
  event.preventDefault();
  heldKeys.add(event.code);
  setKey(key, true);
});
window.addEventListener('keyup', event => {
  const key = keyMap.get(event.code);
  if (key === undefined) return;
  heldKeys.delete(event.code);
  setKey(key, false);
});
window.addEventListener('blur', () => {
  for (const code of heldKeys) setKey(keyMap.get(code), false);
  heldKeys.clear();
});
document.querySelectorAll('.keypad button').forEach(button => {
  const key = Number.parseInt(button.dataset.key, 16);
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); setKey(key, true); });
  button.addEventListener('pointerup', () => setKey(key, false));
  button.addEventListener('pointercancel', () => setKey(key, false));
  button.addEventListener('lostpointercapture', () => setKey(key, false));
});

renderScreen();
renderState();
setRunning(false);
const FONT = [
  0xf0, 0x90, 0x90, 0x90, 0xf0, 0x20, 0x60, 0x20, 0x20, 0x70,
  0xf0, 0x10, 0xf0, 0x80, 0xf0, 0xf0, 0x10, 0xf0, 0x10, 0xf0,
  0x90, 0x90, 0xf0, 0x10, 0x10, 0xf0, 0x80, 0xf0, 0x10, 0xf0,
  0xf0, 0x80, 0xf0, 0x90, 0xf0, 0xf0, 0x10, 0x20, 0x40, 0x40,
  0xf0, 0x90, 0xf0, 0x90, 0xf0, 0xf0, 0x90, 0xf0, 0x10, 0xf0,
  0xf0, 0x90, 0xf0, 0x90, 0x90, 0xe0, 0x90, 0xe0, 0x90, 0xe0,
  0xf0, 0x80, 0x80, 0x80, 0xf0, 0xe0, 0x90, 0x90, 0x90, 0xe0,
  0xf0, 0x80, 0xf0, 0x80, 0xf0, 0xf0, 0x80, 0xf0, 0x80, 0x80
];

export class Chip8 {
  constructor() {
    this.reset();
  }

  reset() {
    this.memory = new Uint8Array(4096);
    this.registers = new Uint8Array(16);
    this.display = new Uint8Array(64 * 32);
    this.keys = new Uint8Array(16);
    this.stack = [];
    this.i = 0;
    this.pc = 0x200;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.cycles = 0;
    this.waitingForKey = null;
    this.memory.set(FONT, 0x50);
  }

  loadProgram(program) {
    if (!(program instanceof Uint8Array)) program = new Uint8Array(program);
    if (program.length === 0 || program.length > this.memory.length - 0x200) {
      throw new RangeError('ROM must be between 1 byte and 3,584 bytes.');
    }
    this.reset();
    this.memory.set(program, 0x200);
  }

  setKey(key, pressed) {
    if (Number.isInteger(key) && key >= 0 && key < 16) this.keys[key] = Number(pressed);
  }

  tickTimers(ticks = 1) {
    this.delayTimer = Math.max(0, this.delayTimer - ticks);
    this.soundTimer = Math.max(0, this.soundTimer - ticks);
  }

  cycle() {
    if (this.waitingForKey !== null) {
      const pressedKey = this.keys.findIndex(Boolean);
      if (pressedKey === -1) return;
      this.registers[this.waitingForKey] = pressedKey;
      this.waitingForKey = null;
      this.pc = (this.pc + 2) & 0xfff;
      this.cycles += 1;
      return;
    }

    const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    this.pc = (this.pc + 2) & 0xfff;
    const x = (opcode >> 8) & 0xf;
    const y = (opcode >> 4) & 0xf;
    const n = opcode & 0xf;
    const nn = opcode & 0xff;
    const nnn = opcode & 0xfff;
    const vx = this.registers[x];
    const vy = this.registers[y];
    this.cycles += 1;

    switch (opcode >> 12) {
      case 0x0:
        if (opcode === 0x00e0) this.display.fill(0);
        else if (opcode === 0x00ee) this.pc = this.stack.pop() ?? 0x200;
        else throw new Error(`Unsupported opcode 0x${opcode.toString(16).padStart(4, '0').toUpperCase()}`);
        break;
      case 0x1: this.pc = nnn; break;
      case 0x2: this.stack.push(this.pc); this.pc = nnn; break;
      case 0x3: if (vx === nn) this.pc += 2; break;
      case 0x4: if (vx !== nn) this.pc += 2; break;
      case 0x5:
        if (n !== 0) throw new Error(`Unsupported opcode 0x${opcode.toString(16).toUpperCase()}`);
        if (vx === vy) this.pc += 2;
        break;
      case 0x6: this.registers[x] = nn; break;
      case 0x7: this.registers[x] = (vx + nn) & 0xff; break;
      case 0x8:
        switch (n) {
          case 0x0: this.registers[x] = vy; break;
          case 0x1: this.registers[x] = vx | vy; break;
          case 0x2: this.registers[x] = vx & vy; break;
          case 0x3: this.registers[x] = vx ^ vy; break;
          case 0x4: this.registers[0xf] = Number(vx + vy > 0xff); this.registers[x] = (vx + vy) & 0xff; break;
          case 0x5: this.registers[0xf] = Number(vx >= vy); this.registers[x] = (vx - vy) & 0xff; break;
          case 0x6: this.registers[0xf] = vx & 1; this.registers[x] = vx >> 1; break;
          case 0x7: this.registers[0xf] = Number(vy >= vx); this.registers[x] = (vy - vx) & 0xff; break;
          case 0xe: this.registers[0xf] = (vx >> 7) & 1; this.registers[x] = (vx << 1) & 0xff; break;
          default: throw new Error(`Unsupported opcode 0x${opcode.toString(16).toUpperCase()}`);
        }
        break;
      case 0x9:
        if (n !== 0) throw new Error(`Unsupported opcode 0x${opcode.toString(16).toUpperCase()}`);
        if (vx !== vy) this.pc += 2;
        break;
      case 0xa: this.i = nnn; break;
      case 0xb: this.pc = (nnn + this.registers[0]) & 0xfff; break;
      case 0xc: this.registers[x] = Math.floor(Math.random() * 256) & nn; break;
      case 0xd: this.draw(vx, vy, n); break;
      case 0xe:
        if (nn === 0x9e && this.keys[vx & 0xf]) this.pc += 2;
        else if (nn === 0xa1 && !this.keys[vx & 0xf]) this.pc += 2;
        else if (nn !== 0x9e && nn !== 0xa1) throw new Error(`Unsupported opcode 0x${opcode.toString(16).toUpperCase()}`);
        break;
      case 0xf:
        switch (nn) {
          case 0x07: this.registers[x] = this.delayTimer; break;
          case 0x0a:
            this.waitingForKey = x;
            this.pc = (this.pc - 2) & 0xfff;
            break;
          case 0x15: this.delayTimer = vx; break;
          case 0x18: this.soundTimer = vx; break;
          case 0x1e: this.i = (this.i + vx) & 0xffff; break;
          case 0x29: this.i = 0x50 + (vx & 0xf) * 5; break;
          case 0x33:
            this.memory[this.i] = Math.floor(vx / 100);
            this.memory[this.i + 1] = Math.floor(vx / 10) % 10;
            this.memory[this.i + 2] = vx % 10;
            break;
          case 0x55: for (let register = 0; register <= x; register += 1) this.memory[this.i + register] = this.registers[register]; break;
          case 0x65: for (let register = 0; register <= x; register += 1) this.registers[register] = this.memory[this.i + register]; break;
          default: throw new Error(`Unsupported opcode 0x${opcode.toString(16).toUpperCase()}`);
        }
        break;
      default: throw new Error(`Unsupported opcode 0x${opcode.toString(16).padStart(4, '0').toUpperCase()}`);
    }
  }

  draw(x, y, height) {
    this.registers[0xf] = 0;
    for (let row = 0; row < height; row += 1) {
      const sprite = this.memory[this.i + row];
      for (let column = 0; column < 8; column += 1) {
        if ((sprite & (0x80 >> column)) === 0) continue;
        const screenX = (x & 0x3f) + column;
        const screenY = (y & 0x1f) + row;
        if (screenX >= 64 || screenY >= 32) continue;
        const pixel = screenY * 64 + screenX;
        if (this.display[pixel]) this.registers[0xf] = 1;
        this.display[pixel] ^= 1;
      }
    }
  }
}
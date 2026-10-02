import test from 'node:test';
import assert from 'node:assert/strict';
import { Chip8 } from '../src/chip8.js';

function machineWith(...opcodes) {
  const machine = new Chip8();
  machine.loadProgram(Uint8Array.from(opcodes.flatMap(opcode => [opcode >> 8, opcode & 0xff])));
  return machine;
}

test('loads programs at 0x200 and resets registers, timers, and display', () => {
  const machine = machineWith(0x60ab);
  machine.cycle();
  assert.equal(machine.registers[0], 0xab);
  assert.equal(machine.pc, 0x202);
  machine.reset();
  assert.equal(machine.registers[0], 0);
  assert.equal(machine.pc, 0x200);
  assert.equal(machine.memory[0x50], 0xf0);
});

test('executes arithmetic, carry, borrow, and skip instructions', () => {
  const machine = machineWith(0x60ff, 0x6102, 0x8014, 0x8015, 0x3001, 0x6000, 0x600a);
  for (let instruction = 0; instruction < 3; instruction += 1) machine.cycle();
  assert.equal(machine.registers[15], 1);
  for (let instruction = 3; instruction < 7; instruction += 1) machine.cycle();
  assert.equal(machine.registers[0], 10);
  assert.equal(machine.registers[1], 2);
  assert.equal(machine.registers[15], 0);
});

test('calls and returns from a subroutine', () => {
  const machine = machineWith(0x2206, 0x6001, 0x1204, 0x6102, 0x00ee);
  machine.cycle();
  assert.equal(machine.pc, 0x206);
  machine.cycle();
  machine.cycle();
  assert.equal(machine.registers[1], 2);
  assert.equal(machine.pc, 0x202);
});

test('draws clipped sprites with collision detection', () => {
  const machine = machineWith(0x6000, 0x6100, 0xa210, 0xd011, 0xd011, 0x8000);
  machine.memory[0x210] = 0x80;
  for (let instruction = 0; instruction < 4; instruction += 1) machine.cycle();
  assert.equal(machine.display[0], 1);
  machine.cycle();
  assert.equal(machine.display[0], 0);
  assert.equal(machine.registers[15], 1);
});

test('waits for a key and resumes with the key value', () => {
  const machine = machineWith(0xf10a, 0x6001);
  machine.cycle();
  assert.equal(machine.pc, 0x200);
  machine.cycle();
  assert.equal(machine.pc, 0x200);
  machine.setKey(0xb, true);
  machine.cycle();
  assert.equal(machine.registers[1], 0xb);
  assert.equal(machine.pc, 0x202);
});

test('implements BCD storage and modern register memory transfers', () => {
  const machine = machineWith(0x60ea, 0xa300, 0xf033, 0xa310, 0xf055, 0x6000, 0xa310, 0xf065);
  for (let instruction = 0; instruction < 8; instruction += 1) machine.cycle();
  assert.deepEqual(Array.from(machine.memory.slice(0x300, 0x303)), [2, 3, 4]);
  assert.equal(machine.registers[0], 0xea);
  assert.equal(machine.i, 0x310);
});

test('ticks timers at a caller-controlled rate and rejects oversized ROMs', () => {
  const machine = new Chip8();
  machine.delayTimer = 4;
  machine.soundTimer = 2;
  machine.tickTimers(3);
  assert.equal(machine.delayTimer, 1);
  assert.equal(machine.soundTimer, 0);
  assert.throws(() => machine.loadProgram(new Uint8Array(3585)), RangeError);
});
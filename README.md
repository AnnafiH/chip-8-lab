# CHIP-8 Lab

A dependency-free CHIP-8 interpreter that runs in your browser. Load a `.ch8`, `.rom`, or `.bin` program, play with the mapped keyboard or on-screen keypad, and inspect the machine registers as it runs.

## Run it

Requires Node.js 18 or newer.

```sh
npm start
```

Open [http://localhost:4173](http://localhost:4173). Run the built-in demo to confirm the display is working, or select a CHIP-8 ROM from your computer. The speed slider controls interpreter instructions per second. The sound timer produces a simple square-wave beep after the first user interaction.

Run the CPU tests with:

```sh
npm test
```

## Controls

The CHIP-8 keypad maps to the left side of a QWERTY keyboard:

| CHIP-8 | Keyboard |
| --- | --- |
| `1 2 3 C` | `1 2 3 4` |
| `4 5 6 D` | `Q W E R` |
| `7 8 9 E` | `A S D F` |
| `A 0 B F` | `Z X C V` |

The on-screen keypad also supports pointer and touch input.

## Compatibility

Implements the classic 64×32 CHIP-8 instruction set, 4 KB address space, hexadecimal keypad, 60 Hz delay and sound timers, font sprites, sprite collision, and BCD conversion. Ambiguous instructions use common modern behavior: shifts operate on `VX`, `BNNN` jumps to `NNN + V0`, `FX55`/`FX65` leave `I` unchanged, logical operations preserve `VF`, and sprites clip at the display edge. SUPER-CHIP and XO-CHIP extensions are not implemented.

## ROMs

No commercial game ROMs are included. Use homebrew programs or ROMs you have the right to use. The [Timendus CHIP-8 test suite](https://github.com/Timendus/chip8-test-suite) is a useful compatibility check; its README includes test descriptions and downloadable test ROMs.

## References

- Tobias V. I. Langhoff, [Guide to making a CHIP-8 emulator](https://tobiasvl.github.io/blog/write-a-chip-8-emulator/) (specifications, instruction behavior, and implementation walkthrough; CC BY 4.0).
- Timendus, [CHIP-8 test suite](https://github.com/Timendus/chip8-test-suite) (community test ROMs and descriptions of opcode and compatibility checks; GPL-3.0).
- Cowgod, [CHIP-8 Technical Reference v1.0](https://devernay.free.fr/hacks/chip8/C8TECH10.HTM) (instruction reference).

## License

MIT. See [LICENSE](LICENSE).
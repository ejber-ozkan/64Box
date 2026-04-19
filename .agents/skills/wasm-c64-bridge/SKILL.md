---
name: wasm-c64-bridge
description: Use this skill when implementing the WebAssembly C64 emulator bridge for web and iOS, including ROM loading, touch controls, and mobile-safe initialization.
version: 1.0.0
author: 64Box
tags: [wasm, c64, emulator, ios, touch]
---

# WebAssembly C64 Emulator Integration

## When to Use This Skill

- When building the React component that hosts the emulator canvas.
- When writing the TypeScript bridge that passes `.d64`, `.t64`, or `.tap` files into the WASM module.
- When implementing touch controls or virtual gamepads for mobile and iOS.

## 1. Passing ROM Data To WASM

Use the Emscripten virtual file system rather than trying to pass raw arrays directly into C functions.

### Strict Protocol

1. Read or fetch the ROM as an `ArrayBuffer`.
2. Convert it to `Uint8Array`.
3. Ensure the target VFS directory exists.
4. Write the ROM into the WASM VFS.
5. Trigger emulator startup using the mounted virtual path.

```ts
const romData = new Uint8Array(arrayBuffer);
window.Module.FS.mkdir('/roms');
window.Module.FS.writeFile('/roms/game.d64', romData);
```

## 2. iOS & Mobile Browser Constraints

### Audio Context

iOS requires audio initialization to happen inside a direct user interaction such as a click or touchstart. Do not initialize audio automatically on mount.

### Canvas Touch Handling

- Set `touch-action: none` on the emulator interaction surface.
- Use `touchstart`, `touchmove`, and `touchend` handlers.
- Call `preventDefault()` to stop native Safari gestures.

## 3. Virtual Joystick

- Prefer a circular joypad area over four discrete buttons.
- Compute angle and distance from the center on touchmove.
- Map that to 8-way joystick directions.
- Dispatch the keyboard or input events expected by the WASM emulator.

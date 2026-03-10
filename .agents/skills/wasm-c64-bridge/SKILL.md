name: wasm-c64-bridge description: Use this skill when implementing the Phase 4 WebAssembly (WASM) C64 emulator for iOS and Web platforms. It defines strict rules for passing ROM data to WASM and handling touch inputs.

WebAssembly (WASM) C64 Emulator Integration

When to Use This Skill

When building the React component that wraps the <canvas> element for the emulator.

When writing the JavaScript/TypeScript bridge to pass .d64, .t64, or .tap files into the WASM module.

When implementing on-screen virtual gamepads or touch controls for mobile/iOS.

1. Passing ROM Data to WASM (The Emscripten Bridge)

AI models often hallucinate direct array-passing methods that crash WASM. You must use the Emscripten Virtual File System (VFS) to pass ROM data safely.

Strict Protocol for Loading ROMs:

Fetch/Read as ArrayBuffer: The React frontend must read the local file or fetch the remote ROM as an ArrayBuffer.

Convert to Uint8Array: Convert the ArrayBuffer into a typed Uint8Array.

Write to WASM VFS: Do not attempt to pass the array directly to a C function. Instead, use the Emscripten FS object to write the file into the virtual file system.

// Correct pattern for Emscripten-based emulators (like VICE WASM)
const romData = new Uint8Array(arrayBuffer);

// Ensure the directory exists in the virtual file system
window.Module.FS.mkdir('/roms'); 

// Write the byte array to the VFS
window.Module.FS.writeFile('/roms/game.d64', romData);


Trigger Execution: Once written to the VFS, call the emulator's specific command-line argument or C-function to mount and autostart /roms/game.d64.

2. iOS & Mobile Browser Constraints

iOS Safari is heavily restricted. You must account for the following quirks when building the emulator component:

A. The Audio Context Trap

iOS absolutely forbids audio playback unless it is directly triggered by a user interaction (like a click or touchstart event).

Rule: The WASM module and its corresponding AudioContext must be initialized inside the onClick handler of a "Play Game" button. Do not attempt to initialize the emulator automatically onMount or the game will have no sound.

B. Canvas Touch Handling

iOS Safari will attempt to scroll, pinch-zoom, or pull-to-refresh when the user touches the emulator canvas or virtual gamepad.

Rule: The container holding the canvas and virtual controls must have the CSS property touch-action: none;.

Rule: You must attach touchstart, touchmove, and touchend event listeners to the canvas/controls and explicitly call event.preventDefault() to stop Safari's native gesture handling.

3. Implementing the Virtual Joystick (Touch Controls)

Since iOS cannot use physical keyboards, you must implement a Virtual Gamepad overlay when the device is detected as touch-enabled.

D-Pad Logic: Do not use individual 4-way buttons. Implement a single circular "Joypad" area.

Math: On touchmove, calculate the angle and distance from the center of the joypad.

Map angles to standard 8-way C64 joystick directions (Up, Up-Right, Right, etc.).

WASM Key Mapping: Translate these directional zones into the corresponding keyboard events that the WASM emulator expects for Joystick Port 1 or 2 (often mapped to Numpad keys or Arrow keys in WASM ports).

State Dispatch: Dispatch standard JS KeyboardEvent objects to the window or <canvas> depending on where the Emscripten module is listening.
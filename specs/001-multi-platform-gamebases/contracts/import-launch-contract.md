# Contract: Import and Launch Behavior

## Atari 800 Import Contract

### Inputs

- Platform: `atari800`
- MDB source: `Atari 800 v12.mdb` or equivalent user-selected Atari 800 GameBase MDB
- Required folder settings:
  - Games
  - Music
  - Photos
  - Screenshots

### Behavior

- Import flow is entered when Atari 800 is selected and not yet imported.
- Import validates that the selected MDB exists before export begins.
- Import records Atari 800 as the platform scope for generated library data.
- Missing optional media folders do not block import unless they are explicitly marked required for Atari 800.
- Import completion makes Atari 800 available in the platform switcher.
- Import failure stores a platform-scoped error and offers correction without affecting C64 data.

### Audit

- Imported Atari 800 data has platform identity.
- Search and game count are limited to Atari 800 when Atari 800 is active.
- Game extras and media paths resolve from Atari 800 folder settings.
- C64 import and browsing continue to work after Atari 800 import.

## RetroArch Atari 800 Launch Contract

### Inputs

- Platform: `atari800`
- Emulator profile: RetroArch Atari800
- RetroArch executable path
- Atari800 core path
- Game launch file or generated playlist artifact

### Behavior

- RetroArch is the default Atari 800 emulator profile.
- The core path is required before a RetroArch Atari 800 launch test can pass.
- Multi-file launches use a RetroArch-compatible playlist artifact where applicable.
- Temporary launch artifacts are created outside source library folders.
- Failure messages name Atari 800 and the RetroArch profile.

### Acceptance

- Emulator test fails clearly when executable path is missing.
- Emulator test fails clearly when Atari800 core path is missing.
- Launch passes with a valid executable, core path, and representative Atari 800 game file.

## Altirra Launch Contract

### Inputs

- Platform: `atari800`
- Emulator profile: Altirra
- Altirra executable path
- Game launch file or generated launch artifact

### Behavior

- Altirra appears only for Atari 800.
- Altirra path is stored as Atari 800 platform-scoped emulator setting.
- Altirra launch testing validates the executable path before any game launch.
- Altirra launch behavior is separate from RetroArch and does not require a RetroArch core.
- Failure messages name Atari 800 and Altirra.

### Acceptance

- Altirra setting is not shown when C64 is active.
- Altirra test fails clearly when the executable path is missing.
- A configured Altirra profile can launch or dry-run-test a representative Atari 800 game file.

## C64 Compatibility Contract

- Existing C64 launch behavior remains available.
- VICE `.vfl` behavior remains available for C64.
- RetroArch `.m3u` behavior remains available for C64.
- SID playback remains available for C64 where SID data exists.
- Adding Atari 800 must not change existing C64 browse/search/detail/extras/version workflows.

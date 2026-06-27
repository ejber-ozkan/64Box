# Data Model: Multi-Platform GameBase Libraries

## Platform

Represents a supported game system or GameBase collection family.

**Fields**

- `id`: Stable platform identifier, e.g. `c64`, `atari800`, `atari2600`.
- `displayName`: User-facing name, e.g. `Commodore 64`, `Atari 800`.
- `status`: `available`, `planned`, or `disabled`.
- `defaultEmulatorProfileId`: Default emulator profile for the platform.
- `supportedEmulatorProfileIds`: Ordered list of emulator choices.
- `folderTypes`: Supported media/library folder keys.
- `musicCapability`: `sid`, `generic`, or `none`.
- `inAppEmulation`: Whether the platform has a supported bundled/in-app emulator.
- `launchExtensions`: File extensions considered launchable for this platform.

**Validation Rules**

- `id` is unique and never changes after release.
- `defaultEmulatorProfileId` must belong to `supportedEmulatorProfileIds`.
- Unsupported capabilities must not be rendered as available in the UI.

## Platform Library

Represents the user's imported local library for one platform.

**Fields**

- `platformId`: References Platform.
- `importStatus`: `notImported`, `importing`, `imported`, `failed`.
- `sourceMdbPath`: Last selected MDB source path.
- `sqliteScope`: Logical database/library scope for this platform.
- `lastImportedAt`: Timestamp of successful import.
- `lastImportError`: Last platform-scoped import failure message.
- `gameCount`: Last known imported game count.
- `active`: Whether this platform is currently selected.

**Validation Rules**

- A platform can be selected for import before it is imported.
- A platform cannot be entered for browsing while `notImported` or `failed`; it must route to import.
- Import errors must include the affected platform.

**State Transitions**

```text
notImported -> importing -> imported
notImported -> importing -> failed
failed -> importing -> imported
imported -> importing -> imported
```

## Platform Folder Settings

Stores local folder roots for one platform.

**Fields**

- `platformId`: References Platform.
- `gamesPath`: Folder containing game files. Required for Atari 800 launch.
- `musicPath`: Folder containing music files. Optional for Atari 800.
- `photosPath`: Folder containing photos or musician/author images. Optional for Atari 800.
- `screenshotsPath`: Folder containing screenshots. Optional but recommended.
- `extrasPath`: Folder containing manuals, maps, docs, and other extras when applicable.
- `boxArtPath`: Folder containing box art when applicable.
- `videosPath`: Folder containing videos when applicable.

**Atari 800 Required Settings**

- Games
- Music
- Photos
- Screenshots

**Validation Rules**

- Required folder settings for a platform must be requested during import or setup.
- Missing optional folders do not block import.
- Folder settings are scoped by platform and must not overwrite C64 paths.

## Emulator Profile

Represents an emulator option available to one or more platforms.

**Fields**

- `id`: Stable emulator profile ID, e.g. `retroarch-atari800`, `altirra-atari800`, `vice-c64`.
- `platformId`: Platform this profile applies to, or `shared` for reusable RetroArch metadata.
- `displayName`: User-facing emulator name.
- `emulatorType`: `retroarch`, `altirra`, `vice`, `custom`.
- `executablePath`: User-selected executable path.
- `corePath`: RetroArch core path when applicable.
- `required`: Whether configuration is required to launch.
- `testStatus`: `untested`, `passed`, `failed`.
- `lastTestMessage`: Last user-facing test result.

**Atari 800 Profiles**

- RetroArch Atari800 core: default Atari 800 profile.
- Altirra: Atari 800-specific external emulator profile.

**Validation Rules**

- Altirra settings appear only for Atari 800.
- RetroArch core path is required before testing a RetroArch profile.
- Emulator test failures must not delete or change user paths.

## Game Entry

Represents a browsable game in a platform library.

**Fields**

- `platformId`: Platform/library scope.
- `id`: Game ID unique within the platform.
- `name`: Display title.
- `year`: Optional release year.
- `publisher`: Optional publisher.
- `developer`: Optional developer.
- `genre`: Optional platform-normalized genre.
- `subGenre`: Optional platform-normalized subgenre.
- `launchFiles`: One or more candidate game files.
- `versionEntries`: Available versions/variants.
- `mediaRefs`: References to screenshots, photos, music, videos, and extras.
- `favorite`: User favorite state scoped to platform.

**Validation Rules**

- `(platformId, id)` is unique.
- Search and favorites filter by `platformId` unless an explicit cross-platform mode is later added.
- Duplicate titles across platforms are allowed.

## Media Capability

Defines what media types and controls are available for a platform.

**Fields**

- `platformId`: References Platform.
- `screenshots`: Available/unavailable.
- `photos`: Available/unavailable.
- `music`: `sid`, `generic`, or `none`.
- `extras`: Available/unavailable.
- `videos`: Available/unavailable.

**Validation Rules**

- SID controls render only when `music` is `sid`.
- Absence of music is not an error.
- Existing extras and version-selection workflows remain available when data exists.

## Launch Artifact

Represents a generated or selected launch input.

**Fields**

- `platformId`: Platform being launched.
- `gameId`: Game being launched.
- `emulatorProfileId`: Emulator profile used.
- `artifactType`: `rawFile`, `playlist`, `extractedTempFile`, `fliplist`.
- `artifactPath`: Generated or selected file path.
- `sourceFiles`: Ordered source files used to create the artifact.
- `cleanupPolicy`: `temporary` or `userOwned`.

**Validation Rules**

- Generated artifacts must be temporary and distinguishable from source files.
- RetroArch multi-file launches use playlist artifacts where applicable.
- C64 VICE launch remains compatible with existing `.vfl` behavior.
- Atari 800 Altirra launch behavior must be tested separately from RetroArch.

## Active Platform State

Tracks the user's selected platform.

**Fields**

- `activePlatformId`: Current platform.
- `lastUsedPlatformId`: Last successfully browsed platform.
- `platformSelectionRequired`: Whether startup must prompt for a platform.

**Validation Rules**

- If `lastUsedPlatformId` is unavailable or unimported, startup routes to platform selection/import.
- Switching platform resets only platform-scoped library context, not global app preferences.

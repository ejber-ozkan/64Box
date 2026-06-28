const {
  platformImportConfigs,
  getPlatformImportConfig,
  requiredPlatformColumns,
} = require("./sqlite_support_config");

describe("platform import configuration", () => {
  test("defines Atari 800 fixture expectations", () => {
    const atari800 = getPlatformImportConfig("atari800");

    expect(atari800.referenceMdbPath).toContain("Atari 800 v12.mdb");
    expect(atari800.requiredFolders).toEqual([
      "gamesPath",
      "musicPath",
      "photosPath",
      "screenshotsPath",
    ]);
    expect(atari800.musicExtensions).toEqual([".sap"]);
    expect(atari800.launchExtensions).toEqual(
      expect.arrayContaining([".atr", ".xex", ".m3u"])
    );
  });

  test("keeps C64 as the imported compatibility baseline", () => {
    expect(platformImportConfigs.c64.defaultImported).toBe(true);
  });

  test("defines Atari 2600 as an importable RetroArch platform", () => {
    const atari2600 = getPlatformImportConfig("atari2600");

    expect(atari2600.status).toBe("available");
    expect(atari2600.defaultImported).toBe(false);
    expect(atari2600.requiredFolders).toEqual([
      "gamesPath",
      "screenshotsPath",
      "extrasPath",
    ]);
    expect(atari2600.musicExtensions).toEqual([]);
    expect(atari2600.launchExtensions).toEqual(
      expect.arrayContaining([".a26", ".bin", ".rom", ".zip"])
    );
  });

  test("defines shared platform identity columns for imported library tables", () => {
    expect(requiredPlatformColumns).toContain("platform_id");
    expect(requiredPlatformColumns).toContain("source_game_id");
  });
});

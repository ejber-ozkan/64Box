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
    expect(getPlatformImportConfig("atari2600").status).toBe("planned");
  });

  test("defines shared platform identity columns for imported library tables", () => {
    expect(requiredPlatformColumns).toContain("platform_id");
    expect(requiredPlatformColumns).toContain("source_game_id");
  });
});

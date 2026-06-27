const path = require("path");

const {
  buildAuditArgs,
  buildConvertArgs,
  resolvePipelineConfig,
} = require("./db_pipeline");

describe("db pipeline platform arguments", () => {
  test("resolves Atari 800 defaults from platform configuration", () => {
    const projectRoot = path.resolve("D:/example/VIC40GameBase64");
    const config = resolvePipelineConfig({
      argv: ["node", "db_pipeline.js", "--platform", "atari800", "--yes"],
      env: {},
      projectRoot,
    });

    expect(config.platformId).toBe("atari800");
    expect(config.yes).toBe(true);
    expect(config.mdbPath).toContain("Atari 800 v12.mdb");
    expect(config.exportDir).toBe(path.join(projectRoot, "atari800_export"));
    expect(config.dbPath).toBe(path.join(projectRoot, "atari800.sqlite"));
  });

  test("explicit MDB, export, and SQLite paths override platform defaults", () => {
    const projectRoot = path.resolve("D:/example/VIC40GameBase64");
    const config = resolvePipelineConfig({
      argv: [
        "node",
        "db_pipeline.js",
        "--platform",
        "atari800",
        "--mdb",
        "E:/Backups/RETRO-BACKUPS/Atari8bit/Atari 800/Atari 800 v12.mdb",
        "--export-dir",
        "D:/tmp/atari-export",
        "--db",
        "D:/tmp/atari.sqlite",
      ],
      env: {},
      projectRoot,
    });

    expect(config.mdbPath).toBe(path.resolve("E:/Backups/RETRO-BACKUPS/Atari8bit/Atari 800/Atari 800 v12.mdb"));
    expect(config.exportDir).toBe(path.resolve("D:/tmp/atari-export"));
    expect(config.dbPath).toBe(path.resolve("D:/tmp/atari.sqlite"));
  });

  test("passes platform through convert and audit commands", () => {
    expect(buildConvertArgs("export", "games.sqlite", "atari800")).toEqual(
      expect.arrayContaining(["--input-dir", "export", "--db", "games.sqlite", "--platform", "atari800"])
    );
    expect(buildAuditArgs("games.sqlite", "atari800")).toEqual(
      expect.arrayContaining(["--db", "games.sqlite", "--platform", "atari800"])
    );
  });
});

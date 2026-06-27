const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");

const { auditSqliteSupport } = require("./check_sqlite_support");
const { convertCsvToSqlite } = require("./convert_csv_to_sqlite");

function writeCsv(dir, fileName, rows) {
  const columns = Object.keys(rows[0]);
  const content = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => row[column] ?? "").join(",")),
  ].join("\n");
  fs.writeFileSync(path.join(dir, fileName), content);
}

function createMiniGameBaseExport(dir) {
  writeCsv(dir, "Games.csv", [
    {
      GA_Id: "42",
      Name: "Atari Test",
      Filename: "ATARI_TEST.ATR",
      FileToRun: "",
      ScrnshotFilename: "ATARI_TEST.PNG",
      SidFilename: "ATARI_TEST.SAP",
      CRC: "ABC123",
      YE_Id: "1",
      GE_Id: "1",
      DE_Id: "1",
      PU_Id: "1",
      MU_Id: "1",
      LA_Id: "1",
      PR_Id: "1",
      AR_Id: "1",
      V_PalNTSC: "P",
      V_TrueDriveEmu: "0",
      Classic: "True",
      Adult: "False",
    },
  ]);
  writeCsv(dir, "Years.csv", [{ YE_Id: "1", Year: "1982" }]);
  writeCsv(dir, "Genres.csv", [{ GE_Id: "1", PG_Id: "1", Genre: "Arcade" }]);
  writeCsv(dir, "PGenres.csv", [{ PG_Id: "1", ParentGenre: "Action" }]);
  writeCsv(dir, "Developers.csv", [{ DE_Id: "1", Developer: "Atari Dev" }]);
  writeCsv(dir, "Publishers.csv", [{ PU_Id: "1", Publisher: "Atari Pub" }]);
  writeCsv(dir, "Musicians.csv", [{ MU_Id: "1", Musician: "Atari Musician" }]);
  writeCsv(dir, "Languages.csv", [{ LA_Id: "1", Language: "English" }]);
  writeCsv(dir, "Programmers.csv", [{ PR_Id: "1", Programmer: "Atari Coder" }]);
  writeCsv(dir, "Artists.csv", [{ AR_Id: "1", Artist: "Atari Artist" }]);
  writeCsv(dir, "Extras.csv", [{ GA_Id: "42", DisplayOrder: "1", Path: "Cover/ATARI_TEST.png" }]);
}

describe("convert CSV to SQLite platform support", () => {
  test("writes platform identity and platform-scoped support objects", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gb-atari800-export-"));
    const dbPath = path.join(tempDir, "atari800.sqlite");
    createMiniGameBaseExport(tempDir);

    convertCsvToSqlite({ inputDir: tempDir, dbPath, platformId: "atari800" });
    expect(() => auditSqliteSupport(dbPath, "atari800")).not.toThrow();

    const db = new Database(dbPath, { readonly: true });
    try {
      expect(db.prepare("SELECT platform_id, source_game_id FROM Games").get()).toEqual({
        platform_id: "atari800",
        source_game_id: "42",
      });
      expect(db.prepare("SELECT platform_id, source_game_id FROM Extras").get()).toEqual({
        platform_id: "atari800",
        source_game_id: "42",
      });
      expect(db.prepare("SELECT platform_id, source_game_id FROM Developers").get()).toEqual({
        platform_id: "atari800",
        source_game_id: "1",
      });
      expect(db.prepare("SELECT platformId, sourceGameId, sidFilename FROM GameView").get()).toEqual({
        platformId: "atari800",
        sourceGameId: "42",
        sidFilename: "ATARI_TEST.SAP",
      });
      expect(db.prepare("SELECT platform_id, source_game_id FROM GameSearchIndex").get()).toEqual({
        platform_id: "atari800",
        source_game_id: "42",
      });
      expect(db.prepare("SELECT platform_id, import_status, game_count FROM PlatformLibraries").get()).toEqual({
        platform_id: "atari800",
        import_status: "imported",
        game_count: 1,
      });
    } finally {
      db.close();
    }
  });
});

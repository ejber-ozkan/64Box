const path = require("path");
const fs = require("fs");
const readline = require("readline");
const { spawnSync } = require("child_process");

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function resolvePath(flag, envVar, fallbackPath) {
  const explicitPath = getArgValue(flag) || process.env[envVar];
  return path.resolve(explicitPath || fallbackPath);
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`);
  }
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function confirmProceed({ mdbPath, exportDir, dbPath }) {
  if (hasFlag("--yes")) {
    return true;
  }

  console.log("WARNING: This pipeline re-exports the MDB, rewrites imported GB64 tables, rebuilds GameView, recreates GameCoverIndex, rebuilds GameSearchIndex, and reruns SQLite optimization.");
  console.log(`MDB source: ${mdbPath}`);
  console.log(`CSV export dir: ${exportDir}`);
  console.log(`SQLite target: ${dbPath}`);
  const answer = await prompt("Proceed with export/import and index optimization? Type YES to continue: ");
  return answer === "YES";
}

function runWindowsExport(mdbPath, exportDir) {
  const powershellPath = path.join(
    process.env.SystemRoot || "C:\\Windows",
    "SysWOW64",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe"
  );

  if (!fs.existsSync(powershellPath)) {
    throw new Error(`32-bit PowerShell was not found at ${powershellPath}`);
  }

  runCommand(powershellPath, [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(__dirname, "exportMdb.ps1"),
    "-DbPath",
    mdbPath,
    "-OutputDir",
    exportDir,
  ]);
}

function runUnixExport(mdbPath, exportDir) {
  runCommand("bash", [path.join(__dirname, "mdb-export-all.sh"), mdbPath, exportDir]);
}

function runConvert(exportDir, dbPath) {
  runCommand("node", [
    path.join(__dirname, "convert_csv_to_sqlite.js"),
    "--input-dir",
    exportDir,
    "--db",
    dbPath,
  ]);
}

function runAudit(dbPath) {
  runCommand("node", [
    path.join(__dirname, "check_sqlite_support.js"),
    "--db",
    dbPath,
  ]);
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const mdbPath = resolvePath("--mdb", "GB64_MDB_PATH", path.join(projectRoot, "GBC_v19.mdb"));
  const exportDir = resolvePath("--export-dir", "GB64_EXPORT_DIR", path.join(projectRoot, "gb64_export"));
  const dbPath = resolvePath("--db", "GB64_SQLITE_PATH", path.join(projectRoot, "gb64.sqlite"));
  const auditOnly = hasFlag("--audit-only");
  const skipExport = hasFlag("--skip-export");
  const skipImport = hasFlag("--skip-import");

  if (!(await confirmProceed({ mdbPath, exportDir, dbPath }))) {
    console.log("Aborted.");
    process.exit(1);
  }

  if (auditOnly) {
    runAudit(dbPath);
    return;
  }

  if (!skipExport) {
    if (!fs.existsSync(mdbPath)) {
      throw new Error(`MDB file not found at ${mdbPath}`);
    }

    console.log("[1/3] Exporting MDB to CSV...");
    if (process.platform === "win32") {
      runWindowsExport(mdbPath, exportDir);
    } else {
      runUnixExport(mdbPath, exportDir);
    }
  } else {
    console.log("[1/3] Skipping MDB export.");
  }

  if (!skipImport) {
    console.log("[2/3] Converting CSV export to optimized SQLite...");
    runConvert(exportDir, dbPath);
  } else {
    console.log("[2/3] Skipping SQLite import.");
  }

  console.log("[3/3] Auditing expected SQLite indexes and support objects...");
  runAudit(dbPath);
  console.log("Database export/import pipeline completed successfully.");
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  process.exit(1);
});

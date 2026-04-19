use crate::models::{LaunchRequest, LaunchResult};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

fn create_launch_temp_dir() -> Result<PathBuf, String> {
    let base_dir = std::env::temp_dir();
    let process_id = std::process::id();

    for attempt in 0..10 {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos();
        let candidate = base_dir.join(format!("64BoxTemp-{}-{}-{}", process_id, timestamp, attempt));

        match std::fs::create_dir(&candidate) {
            Ok(()) => return Ok(candidate),
            Err(err) if err.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(err) => return Err(err.to_string()),
        }
    }

    Err("Failed to create a unique temporary launch directory".to_string())
}

fn require_existing_file(path: &Path, not_found_message: impl FnOnce() -> String, not_file_message: impl FnOnce() -> String) -> Result<(), String> {
    if !path.exists() {
        return Err(not_found_message());
    }

    if !path.is_file() {
        return Err(not_file_message());
    }

    Ok(())
}

#[tauri::command]
pub async fn launch_emulator(request: LaunchRequest) -> Result<LaunchResult, String> {
    let mut emulator = PathBuf::from(&request.emulator_path);
    require_existing_file(
        &emulator,
        || format!("Emulator path not found: {}", request.emulator_path),
        || format!("Emulator path is not a file: {}", request.emulator_path),
    )
    .or_else(|err| {
        if emulator.is_dir() {
            Ok(())
        } else {
            Err(err)
        }
    })?;

    if emulator.is_dir() {
        let possible_exes = [
            "retroarch.exe",
            "retroarch",
            "x64sc.exe",
            "x64sc",
            "x64.exe",
            "x64",
            "vice",
            "x64dtv.exe",
            "xpet.exe",
        ];
        let mut found = false;
        for exe in possible_exes {
            let p = emulator.join(exe);
            if p.exists() && p.is_file() {
                emulator = p;
                found = true;
                break;
            }
        }
        if !found {
            return Err(format!(
                "No supported emulator binary found in directory: {}",
                request.emulator_path
            ));
        }
    }

    let rom = PathBuf::from(&request.rom_path);
    require_existing_file(
        &rom,
        || format!("ROM file not found: {}", request.rom_path),
        || format!("ROM path is not a file: {}", request.rom_path),
    )?;

    let exe_name = emulator
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_lowercase();
    let is_retroarch = exe_name.contains("retroarch");

    if is_retroarch {
        if let Some(cp) = &request.core_path {
            if !cp.is_empty() {
                require_existing_file(
                    Path::new(cp),
                    || format!("RetroArch Core file not found: {}", cp),
                    || format!("RetroArch Core path is not a file: {}", cp),
                )?;
            }
        }
    }

    let mut args: Vec<String> = Vec::new();
    if !is_retroarch {
        if request.true_drive_emulation {
            args.push("-truedrive".to_string());
        }
        if !request.is_pal {
            args.push("-ntsc".to_string());
        }
    }

    let mut file_to_run = String::new();
    if let Some(gid) = &request.game_id {
        use crate::database::get_db_path;
        use rusqlite::Connection;
        if let Ok(conn) = Connection::open(get_db_path()) {
            if let Ok(mut stmt) = conn.prepare("SELECT FileToRun FROM Games WHERE GA_Id = ?") {
                if let Ok(ftr) = stmt.query_row([gid], |row| row.get::<_, String>(0)) {
                    file_to_run = ftr;
                }
            }
        }
    }

    let is_zip = rom
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
        == "zip";

    if is_zip {
        let temp_dir = create_launch_temp_dir()?;

        let file = std::fs::File::open(&rom).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
        let mut extracted_roms = Vec::new();

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let outpath = temp_dir.join(file.mangled_name());
            if (&*file.name()).ends_with('/') {
                std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(&p).map_err(|e| e.to_string())?;
                    }
                }
                let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;

                let ext = outpath
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if ["d64", "g64", "t64", "tap", "prg", "crt", "nib"].contains(&ext.as_str()) {
                    extracted_roms.push(outpath.clone());
                }
            }
        }

        if extracted_roms.is_empty() {
            return Err("No compatible C64 ROMs found inside the ZIP file.".to_string());
        }

        extracted_roms.sort();
        let mut primary_rom = None;
        if !file_to_run.is_empty() {
            let target = file_to_run.to_lowercase();
            for r in &extracted_roms {
                if let Some(n) = r.file_name().and_then(|n| n.to_str()) {
                    if n.to_lowercase() == target {
                        primary_rom = Some(r.clone());
                        break;
                    }
                }
            }
        }
        let resolved_primary_rom =
            primary_rom.unwrap_or_else(|| extracted_roms.first().unwrap().clone());

        if is_retroarch {
            if let Some(cp) = &request.core_path {
                if !cp.is_empty() {
                    args.push("-L".to_string());
                    args.push(cp.clone());
                }
            }
            if extracted_roms.len() > 1 {
                let m3u_path = temp_dir.join(format!(
                    "{}.m3u",
                    resolved_primary_rom
                        .file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                ));
                let mut m3u = std::fs::File::create(&m3u_path).map_err(|e| e.to_string())?;
                writeln!(m3u, "{}", resolved_primary_rom.to_string_lossy())
                    .map_err(|e| e.to_string())?;
                for rom_file in &extracted_roms {
                    if *rom_file != resolved_primary_rom {
                        writeln!(m3u, "{}", rom_file.to_string_lossy())
                            .map_err(|e| e.to_string())?;
                    }
                }
                args.push(m3u_path.to_string_lossy().to_string());
            } else {
                args.push(resolved_primary_rom.to_string_lossy().to_string());
            }
        } else {
            args.push("-autostart".to_string());
            args.push(resolved_primary_rom.to_string_lossy().to_string());
            if extracted_roms.len() > 1 {
                let fliplist_path = temp_dir.join(format!(
                    "{}.vfl",
                    resolved_primary_rom
                        .file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                ));
                let mut fliplist =
                    std::fs::File::create(&fliplist_path).map_err(|e| e.to_string())?;
                writeln!(fliplist, "# Vice fliplist file").unwrap();
                writeln!(fliplist, "UNIT 8").unwrap();
                for rom_file in &extracted_roms {
                    writeln!(fliplist, "{}", rom_file.to_string_lossy()).unwrap();
                }
                args.push("-flipname".to_string());
                args.push(fliplist_path.to_string_lossy().to_string());
            }
        }
    } else {
        if is_retroarch {
            if let Some(cp) = &request.core_path {
                if !cp.is_empty() {
                    args.push("-L".to_string());
                    args.push(cp.clone());
                }
            }
            args.push(rom.to_string_lossy().to_string());
        } else {
            args.push("-autostart".to_string());
            args.push(rom.to_string_lossy().to_string());
        }
    }

    let mut cmd = Command::new(&emulator);

    if let Some(parent) = emulator.parent() {
        cmd.current_dir(parent);
    }

    match cmd
        .args(&args)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
    {
        Ok(_) => Ok(LaunchResult {
            success: true,
            message: format!("Launched {} successfully", exe_name),
        }),
        Err(e) => Err(format!("Failed to launch emulator: {}", e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use tempfile::{tempdir, NamedTempFile};
    use zip::write::FileOptions;

    fn system_shell_executable() -> PathBuf {
        if cfg!(windows) {
            PathBuf::from(
                std::env::var("ComSpec")
                    .unwrap_or_else(|_| "C:\\Windows\\System32\\cmd.exe".to_string()),
            )
        } else {
            PathBuf::from("/bin/sh")
        }
    }

    fn copy_test_emulator(target: &Path) {
        std::fs::copy(system_shell_executable(), target).unwrap();
    }

    fn write_zip(zip_path: &Path, files: &[(&str, &[u8])]) {
        let file = std::fs::File::create(zip_path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = FileOptions::default();

        for (name, contents) in files {
            zip.start_file(*name, options).unwrap();
            zip.write_all(contents).unwrap();
        }

        zip.finish().unwrap();
    }

    #[tokio::test]
    async fn test_launch_emulator_non_existent() {
        let req = LaunchRequest {
            emulator_path: "/non/existent/path".to_string(),
            rom_path: "/non/existent/rom".to_string(),
            true_drive_emulation: false,
            is_pal: true,
            game_id: None,
            core_path: None,
        };
        let res = launch_emulator(req).await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_launch_emulator_invalid_zip() {
        let dir = tempdir().unwrap();
        let rom_path = dir.path().join("game.zip");
        std::fs::write(&rom_path, b"not-a-zip").unwrap();

        // Mock emulator path
        let emu_path = dir.path().join("vice.exe");
        std::fs::write(&emu_path, b"dummy").unwrap();

        let req = LaunchRequest {
            emulator_path: emu_path.to_string_lossy().to_string(),
            rom_path: rom_path.to_string_lossy().to_string(),
            ..Default::default()
        };
        let res = launch_emulator(req).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().to_lowercase().contains("zip"));
    }

    #[tokio::test]
    async fn test_is_retroarch_detection() {
        let vice = PathBuf::from("C:\\VICE\\x64sc.exe");
        let retro = PathBuf::from("F:\\RETRO\\retroarch.exe");

        let exe_vice = vice
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();
        let exe_retro = retro
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();

        assert!(!exe_vice.contains("retroarch"));
        assert!(exe_retro.contains("retroarch"));
    }

    #[tokio::test]
    async fn test_launch_emulator_directory_and_non_zip_success() {
        let dir = tempdir().unwrap();
        let emulator_dir = dir.path().join("emulator");
        std::fs::create_dir_all(&emulator_dir).unwrap();
        let emulator_path = emulator_dir.join(if cfg!(windows) { "x64sc.exe" } else { "x64sc" });
        copy_test_emulator(&emulator_path);

        let rom_path = dir.path().join("game.d64");
        std::fs::write(&rom_path, b"dummy rom").unwrap();

        let request = LaunchRequest {
            emulator_path: emulator_dir.to_string_lossy().to_string(),
            rom_path: rom_path.to_string_lossy().to_string(),
            true_drive_emulation: true,
            is_pal: false,
            ..Default::default()
        };

        let result = launch_emulator(request).await.unwrap();
        assert!(result.success);
        assert!(result.message.to_lowercase().contains("x64sc"));
    }

    #[tokio::test]
    async fn test_launch_emulator_retroarch_missing_core() {
        let dir = tempdir().unwrap();
        let emulator_path = dir.path().join(if cfg!(windows) {
            "retroarch.exe"
        } else {
            "retroarch"
        });
        copy_test_emulator(&emulator_path);

        let rom_path = dir.path().join("game.d64");
        std::fs::write(&rom_path, b"dummy rom").unwrap();

        let request = LaunchRequest {
            emulator_path: emulator_path.to_string_lossy().to_string(),
            rom_path: rom_path.to_string_lossy().to_string(),
            core_path: Some(dir.path().join("missing.dll").to_string_lossy().to_string()),
            ..Default::default()
        };

        let result = launch_emulator(request).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("RetroArch Core file not found"));
    }

    #[tokio::test]
    async fn test_launch_emulator_retroarch_core_directory_rejected() {
        let dir = tempdir().unwrap();
        let emulator_path = dir.path().join(if cfg!(windows) {
            "retroarch.exe"
        } else {
            "retroarch"
        });
        copy_test_emulator(&emulator_path);

        let rom_path = dir.path().join("game.d64");
        std::fs::write(&rom_path, b"dummy rom").unwrap();

        let core_dir = dir.path().join("cores");
        std::fs::create_dir(&core_dir).unwrap();

        let request = LaunchRequest {
            emulator_path: emulator_path.to_string_lossy().to_string(),
            rom_path: rom_path.to_string_lossy().to_string(),
            core_path: Some(core_dir.to_string_lossy().to_string()),
            ..Default::default()
        };

        let result = launch_emulator(request).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("RetroArch Core path is not a file"));
    }

    #[tokio::test]
    async fn test_launch_emulator_zip_prefers_file_to_run() {
        let dir = tempdir().unwrap();
        let emulator_path = dir
            .path()
            .join(if cfg!(windows) { "x64sc.exe" } else { "x64sc" });
        copy_test_emulator(&emulator_path);

        let zip_path = dir.path().join("collection.zip");
        write_zip(&zip_path, &[("disk1.d64", b"disk1"), ("boot.prg", b"boot")]);

        let temp_db = NamedTempFile::new().unwrap();
        std::env::set_var("VIC40_DB_PATH", temp_db.path());
        let conn = Connection::open(temp_db.path()).unwrap();
        conn.execute("CREATE TABLE Games (GA_Id TEXT, FileToRun TEXT)", [])
            .unwrap();
        conn.execute(
            "INSERT INTO Games (GA_Id, FileToRun) VALUES (?, ?)",
            ["123", "boot.prg"],
        )
        .unwrap();

        let request = LaunchRequest {
            emulator_path: emulator_path.to_string_lossy().to_string(),
            rom_path: zip_path.to_string_lossy().to_string(),
            game_id: Some("123".to_string()),
            ..Default::default()
        };

        let result = launch_emulator(request).await.unwrap();
        assert!(result.success);

        std::env::remove_var("VIC40_DB_PATH");
    }

    #[tokio::test]
    async fn test_launch_emulator_rom_directory_rejected() {
        let dir = tempdir().unwrap();
        let emulator_path = dir
            .path()
            .join(if cfg!(windows) { "x64sc.exe" } else { "x64sc" });
        copy_test_emulator(&emulator_path);

        let rom_dir = dir.path().join("roms");
        std::fs::create_dir(&rom_dir).unwrap();

        let request = LaunchRequest {
            emulator_path: emulator_path.to_string_lossy().to_string(),
            rom_path: rom_dir.to_string_lossy().to_string(),
            ..Default::default()
        };

        let result = launch_emulator(request).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("ROM path is not a file"));
    }

    #[tokio::test]
    async fn test_launch_emulator_retroarch_zip_success() {
        let dir = tempdir().unwrap();
        let emulator_path = dir.path().join(if cfg!(windows) {
            "retroarch.exe"
        } else {
            "retroarch"
        });
        copy_test_emulator(&emulator_path);

        let core_path = dir.path().join("vice_libretro.dll");
        std::fs::write(&core_path, b"core").unwrap();

        let zip_path = dir.path().join("multi.zip");
        write_zip(
            &zip_path,
            &[("disk1.d64", b"disk1"), ("disk2.d64", b"disk2")],
        );

        let request = LaunchRequest {
            emulator_path: emulator_path.to_string_lossy().to_string(),
            rom_path: zip_path.to_string_lossy().to_string(),
            core_path: Some(core_path.to_string_lossy().to_string()),
            ..Default::default()
        };

        let result = launch_emulator(request).await.unwrap();
        assert!(result.success);
        assert!(result.message.to_lowercase().contains("retroarch"));
    }

    #[tokio::test]
    async fn test_launch_emulator_zip_does_not_delete_shared_temp_directory() {
        let shared_temp_dir = std::env::temp_dir().join("64BoxTemp");
        let _ = std::fs::remove_dir_all(&shared_temp_dir);
        std::fs::create_dir_all(&shared_temp_dir).unwrap();
        let sentinel = shared_temp_dir.join("keep.txt");
        std::fs::write(&sentinel, b"keep").unwrap();

        let dir = tempdir().unwrap();
        let emulator_path = dir
            .path()
            .join(if cfg!(windows) { "x64sc.exe" } else { "x64sc" });
        copy_test_emulator(&emulator_path);

        let zip_path = dir.path().join("collection.zip");
        write_zip(&zip_path, &[("disk1.d64", b"disk1"), ("disk2.d64", b"disk2")]);

        let request = LaunchRequest {
            emulator_path: emulator_path.to_string_lossy().to_string(),
            rom_path: zip_path.to_string_lossy().to_string(),
            ..Default::default()
        };

        let result = launch_emulator(request).await.unwrap();
        assert!(result.success);
        assert!(sentinel.exists());

        let _ = std::fs::remove_dir_all(&shared_temp_dir);
    }
}

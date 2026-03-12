use std::path::{Path, PathBuf};
use std::process::Command;
use std::io::Write;
use crate::models::{LaunchRequest, LaunchResult};

#[tauri::command]
pub async fn launch_emulator(request: LaunchRequest) -> Result<LaunchResult, String> {
    let mut emulator = PathBuf::from(&request.emulator_path);
    if !emulator.exists() {
        return Err(format!("Emulator path not found: {}", request.emulator_path));
    }

    if emulator.is_dir() {
        let possible_exes = ["retroarch.exe", "retroarch", "x64sc.exe", "x64sc", "x64.exe", "x64", "vice", "x64dtv.exe", "xpet.exe"];
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
            return Err(format!("No supported emulator binary found in directory: {}", request.emulator_path));
        }
    }

    let rom = PathBuf::from(&request.rom_path);
    if !rom.exists() {
        return Err(format!("ROM file not found: {}", request.rom_path));
    }

    let exe_name = emulator.file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
    let is_retroarch = exe_name.contains("retroarch");

    if is_retroarch {
        if let Some(cp) = &request.core_path {
            if !cp.is_empty() && !Path::new(cp).exists() {
                return Err(format!("RetroArch Core file not found: {}", cp));
            }
        }
    }

    let mut args: Vec<String> = Vec::new();
    if !is_retroarch {
        if request.true_drive_emulation { args.push("-truedrive".to_string()); }
        if !request.is_pal { args.push("-ntsc".to_string()); }
    }

    let mut file_to_run = String::new();
    if let Some(gid) = &request.game_id {
        use rusqlite::Connection;
        use crate::database::get_db_path;
        if let Ok(conn) = Connection::open(get_db_path()) {
            if let Ok(mut stmt) = conn.prepare("SELECT FileToRun FROM Games WHERE GA_Id = ?") {
                if let Ok(ftr) = stmt.query_row([gid], |row| row.get::<_, String>(0)) {
                    file_to_run = ftr;
                }
            }
        }
    }

    let is_zip = rom.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() == "zip";

    if is_zip {
        let temp_dir = std::env::temp_dir().join("64BoxTemp");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

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
                    if !p.exists() { std::fs::create_dir_all(&p).map_err(|e| e.to_string())?; }
                }
                let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;

                let ext = outpath.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
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
        let resolved_primary_rom = primary_rom.unwrap_or_else(|| extracted_roms.first().unwrap().clone());
        
        if is_retroarch {
            if let Some(cp) = &request.core_path {
               if !cp.is_empty() {
                  args.push("-L".to_string());
                  args.push(cp.clone());
               }
            }
            if extracted_roms.len() > 1 {
                let m3u_path = temp_dir.join(format!("{}.m3u", resolved_primary_rom.file_stem().unwrap_or_default().to_string_lossy()));
                let mut m3u = std::fs::File::create(&m3u_path).map_err(|e| e.to_string())?;
                writeln!(m3u, "{}", resolved_primary_rom.to_string_lossy()).map_err(|e| e.to_string())?;
                for rom_file in &extracted_roms {
                    if *rom_file != resolved_primary_rom {
                        writeln!(m3u, "{}", rom_file.to_string_lossy()).map_err(|e| e.to_string())?;
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
                let fliplist_path = temp_dir.join(format!("{}.vfl", resolved_primary_rom.file_stem().unwrap_or_default().to_string_lossy()));
                let mut fliplist = std::fs::File::create(&fliplist_path).map_err(|e| e.to_string())?;
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

    if let Some(parent) = emulator.parent() { cmd.current_dir(parent); }

    match cmd.args(&args)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn() {
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
    use tempfile::tempdir;

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
        
        let exe_vice = vice.file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
        let exe_retro = retro.file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
        
        assert!(!exe_vice.contains("retroarch"));
        assert!(exe_retro.contains("retroarch"));
    }
}

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Data types returned through IPC
// ---------------------------------------------------------------------------

/// A scanned ROM file found on the local disk
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScannedRom {
    pub path: String,
    pub filename: String,
    pub extension: String,
    pub crc32: String,
    pub size_bytes: u64,
}

/// Result of launching an emulator process
#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchResult {
    pub success: bool,
    pub message: String,
}

/// A path that has been resolved and validated from the media directories
#[derive(Debug, Serialize, Deserialize)]
pub struct ResolvedPath {
    pub exists: bool,
    pub absolute_path: String,
}

/// Launch request from the frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchRequest {
    pub emulator_path: String,
    pub rom_path: String,
    pub true_drive_emulation: bool,
    pub is_pal: bool,
    pub game_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameFilters {
    pub search_query: Option<String>,
    pub letter: Option<String>,
    pub genre: Option<String>,
    pub favorite_ids: Option<Vec<String>>,
    pub hide_adult: Option<bool>,
}

/// A row from the SQLite GameView
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameRow {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub game_filename: Option<String>,
    pub screenshot_filename: Option<String>,
    pub box_front_filename: Option<String>,
    pub titlescreen_filename: Option<String>,
    pub video_snap_filename: Option<String>,
    pub sid_filename: Option<String>,
    pub crc: Option<String>,
    pub year: Option<String>,
    pub is_pal: bool,
    pub is_ntsc: bool,
    pub true_drive_emu: bool,
    pub is_classic: bool,
    pub parent_genre: String,
    pub sub_genre: String,
    pub developer_name: Option<String>,
    pub publisher_name: Option<String>,
    pub musician_name: Option<String>,
    pub musician_photo: Option<String>,
    pub musician_nick: Option<String>,
    pub musician_group: Option<String>,
    pub coder_name: Option<String>,
    pub graphics_name: Option<String>,
    pub version_by: Option<String>,
    pub control: Option<String>,
    pub players_from: Option<String>,
    pub players_to: Option<String>,
    pub players_sim: Option<String>,
    pub comment: Option<String>,
    pub review_rating: Option<String>,
    pub languages: Option<String>,
    pub v_trainers: Option<String>,
    pub v_length: Option<String>,
    pub v_loading_screen: Option<bool>,
    pub v_high_score_saver: Option<bool>,
    pub v_included_docs: Option<bool>,
    pub v_true_drive_emu: Option<bool>,
    pub v_pal_ntsc: Option<String>,
    pub memo: Option<String>,
}

/// A row from the SQLite Extras table
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtraRow {
    pub id: String,
    pub name: String,
    pub path: String,
    pub extra_type: String,
}

// ---------------------------------------------------------------------------
// Commands — all in one module to avoid proc-macro symbol collisions
// ---------------------------------------------------------------------------
pub mod commands {
    use super::{LaunchRequest, LaunchResult, ResolvedPath, ScannedRom};
    use std::path::{Path, PathBuf};

    /// Scan a directory for C64 ROM files, returning CRC32 hashes.
    #[tauri::command]
    pub async fn scan_rom_directory(directory: String) -> Result<Vec<ScannedRom>, String> {
        use crc32fast::Hasher;
        use std::io::Read;
        use walkdir::WalkDir;

        let dir = Path::new(&directory);
        if !dir.exists() {
            return Err(format!("Directory does not exist: {}", directory));
        }
        if !dir.is_dir() {
            return Err(format!("Path is not a directory: {}", directory));
        }

        let rom_extensions = ["d64", "t64", "tap", "prg", "crt", "g64", "nib"];
        let mut results: Vec<ScannedRom> = Vec::new();

        for entry in WalkDir::new(dir)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            if !rom_extensions.contains(&ext.as_str()) {
                continue;
            }

            // Stream-hash in 64 KB chunks — never load full ROM into RAM
            let crc32 = match std::fs::File::open(path) {
                Ok(mut file) => {
                    let mut hasher = Hasher::new();
                    let mut buf = [0u8; 65536];
                    loop {
                        match file.read(&mut buf) {
                            Ok(0) => break,
                            Ok(n) => hasher.update(&buf[..n]),
                            Err(e) => return Err(format!("Read error on {}: {}", path.display(), e)),
                        }
                    }
                    format!("{:08X}", hasher.finalize())
                }
                Err(e) => return Err(format!("Cannot open {}: {}", path.display(), e)),
            };

            let size_bytes = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);

            results.push(ScannedRom {
                path: path.to_string_lossy().to_string(),
                filename: path
                    .file_name()
                    .map(|f| f.to_string_lossy().to_string())
                    .unwrap_or_default(),
                extension: ext,
                crc32,
                size_bytes,
            });
        }

        Ok(results)
    }

    /// Launch a C64 emulator (e.g. VICE x64sc) with validated arguments.
    #[tauri::command]
    pub async fn launch_emulator(request: LaunchRequest) -> Result<LaunchResult, String> {
        use std::process::Command;
        use std::io::{Read, Write};
        
        let emulator = PathBuf::from(&request.emulator_path);
        if !emulator.exists() {
            return Err(format!("Emulator not found: {}", request.emulator_path));
        }
        let rom = PathBuf::from(&request.rom_path);
        if !rom.exists() {
            return Err(format!("ROM file not found: {}", request.rom_path));
        }

        let allowed_bins = ["x64sc.exe", "x64sc", "x64.exe", "x64", "vice", "x64dtv.exe", "xpet.exe"];
        let exe_name = emulator
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !allowed_bins.contains(&exe_name.as_str()) {
            return Err(format!("Unsupported emulator binary: {}", exe_name));
        }

        let mut args: Vec<String> = Vec::new();
        if request.true_drive_emulation {
            args.push("-truedrive".to_string());
        }
        if !request.is_pal {
            args.push("-ntsc".to_string());
        }

        // Query inner file_to_run mapped in Gamebase64 Games table
        let mut file_to_run = String::new();
        if let Some(gid) = request.game_id {
            use rusqlite::Connection;
            let db_path = if std::path::Path::new("../gb64.sqlite").exists() {
                "../gb64.sqlite"
            } else if std::path::Path::new("gb64.sqlite").exists() {
                "gb64.sqlite"
            } else {
                "../../gb64.sqlite"
            };
            if let Ok(conn) = Connection::open(db_path) {
                if let Ok(mut stmt) = conn.prepare("SELECT FileToRun FROM Games WHERE GA_Id = ?") {
                    if let Ok(ftr) = stmt.query_row([gid], |row| row.get::<_, String>(0)) {
                        file_to_run = ftr;
                    }
                }
            }
        }

        let is_zip = rom.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() == "zip";

        if is_zip {
            // Unzip into a temp directory
            let temp_dir = std::env::temp_dir().join("64BoxTemp");
            let _ = std::fs::remove_dir_all(&temp_dir); // clean up any old temp dir
            std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

            let file = std::fs::File::open(&rom).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
            let mut extracted_roms = Vec::new();

            for i in 0..archive.len() {
                let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
                let outpath = temp_dir.join(file.mangled_name());
                if (&*file.name()).ends_with('/') {
                    std::fs::create_dir_all(&outpath).unwrap();
                } else {
                    if let Some(p) = outpath.parent() {
                        if !p.exists() {
                            std::fs::create_dir_all(&p).unwrap();
                        }
                    }
                    let mut outfile = std::fs::File::create(&outpath).unwrap();
                    std::io::copy(&mut file, &mut outfile).unwrap();

                    let ext = outpath.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                    if ["d64", "g64", "t64", "tap", "prg", "crt", "nib"].contains(&ext.as_str()) {
                        extracted_roms.push(outpath.clone());
                    }
                }
            }

            if extracted_roms.is_empty() {
                return Err("No compatible C64 ROMs found inside the ZIP file.".to_string());
            }

            // Sort to ensure sequential disk order (e.g. disk1.d64 before disk2.d64)
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
            
            args.push("-autostart".to_string());
            args.push(resolved_primary_rom.to_string_lossy().to_string());

            // If there's more than one extracted ROM, automatically create a VICE fliplist (.vfl)
            if extracted_roms.len() > 1 {
                let fliplist_path = temp_dir.join(format!("{}.vfl", resolved_primary_rom.file_stem().unwrap_or_default().to_string_lossy()));
                let mut fliplist = std::fs::File::create(&fliplist_path).unwrap();
                writeln!(fliplist, "# Vice fliplist file").unwrap();
                writeln!(fliplist, "UNIT 8").unwrap();
                for rom_file in &extracted_roms {
                    writeln!(fliplist, "{}", rom_file.to_string_lossy()).unwrap();
                }
                args.push("-flipname".to_string());
                args.push(fliplist_path.to_string_lossy().to_string());
            }

        } else {
             args.push("-autostart".to_string());
             args.push(rom.to_string_lossy().to_string());
        }

        let mut cmd = if cfg!(target_os = "linux") && emulator.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() == "exe" {
            let mut c = Command::new("wine");
            c.arg(&emulator);
            c
        } else {
            Command::new(&emulator)
        };

        match cmd.args(&args).spawn() {
            Ok(_) => Ok(LaunchResult {
                success: true,
                message: format!("Launched {} successfully", exe_name),
            }),
            Err(e) => Err(format!("Failed to launch emulator: {}", e)),
        }
    }

    /// Download a remote media asset and save it locally. Returns the path to the saved file.
    #[tauri::command]
    pub async fn download_media_asset(url: String, dest_dir: String, filename: String) -> Result<ResolvedPath, String> {
        let dest = PathBuf::from(&dest_dir);
        if !dest.exists() {
            std::fs::create_dir_all(&dest).map_err(|e| format!("Could not create directory: {}", e))?;
        }
        
        // Some filenames from databases might contain path separators (like games\1-9\file.sid)
        // We need to mirror that structure or sanitize it. Replacing backslashes.
        let safe_filename = filename.replace("\\", "/");
        let full_path = dest.join(PathBuf::from(&safe_filename));
        
        // Provide parent directory for complex filenames
        if let Some(parent) = full_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Could not create sub-directory: {}", e))?;
            }
        }

        let response = reqwest::get(&url)
            .await
            .map_err(|e| format!("Failed to download {}: {}", url, e))?;
            
        if !response.status().is_success() {
            return Err(format!("Download failed with status: {}", response.status()));
        }
        
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;
        
        std::fs::write(&full_path, bytes).map_err(|e| format!("Failed to write file {}: {}", full_path.display(), e))?;

        Ok(ResolvedPath {
            exists: true,
            absolute_path: full_path.to_string_lossy().to_string(),
        })
    }

    /// Read file content as bytes
    #[tauri::command]
    pub async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
        std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
    }

    /// Check if a media file actually exists at base_dir/filename.
    #[tauri::command]
    pub async fn resolve_media_path(base_dir: String, filename: String) -> ResolvedPath {
        let full = PathBuf::from(&base_dir).join(&filename);
        ResolvedPath {
            exists: full.exists(),
            absolute_path: full.to_string_lossy().to_string(),
        }
    }

    /// Finds all variants of a screenshot (e.g. Game.png, Game_1.png, Game_2.png, Game_a.png etc. or just numeric increments)
    #[tauri::command]
    pub async fn find_all_media_variants(base_dir: String, filename: String) -> Vec<String> {
        let mut results = Vec::new();
        let full = PathBuf::from(&base_dir).join(&filename);
        
        if full.exists() {
            results.push(full.to_string_lossy().to_string());
        }

        // Try sequentially checking _1, _2, _3 up to _9
        let path = Path::new(&filename);
        if let (Some(stem), Some(ext), Some(parent)) = (path.file_stem(), path.extension(), path.parent()) {
            let stem_str = stem.to_string_lossy();
            let ext_str = ext.to_string_lossy();
            for i in 1..=9 {
                let variant_name = format!("{}_{}.{}", stem_str, i, ext_str);
                let variant_full = PathBuf::from(&base_dir).join(parent).join(&variant_name);
                if variant_full.exists() {
                    results.push(variant_full.to_string_lossy().to_string());
                } else {
                    // GB64 sometimes uses alphabetical variants like _a, _b
                    let alpha_char = (97 + i - 1) as u8 as char; // a, b, c...
                    let variant_alpha = format!("{}_{}.{}", stem_str, alpha_char, ext_str);
                    let variant_full_alpha = PathBuf::from(&base_dir).join(parent).join(&variant_alpha);
                    if variant_full_alpha.exists() {
                        results.push(variant_full_alpha.to_string_lossy().to_string());
                    } else {
                        break; 
                    }
                }
            }
        }
        
        results
    }

    /// Open the native OS folder-picker; returns the chosen path or None.
    #[tauri::command]
    pub async fn open_directory_dialog(app: tauri::AppHandle) -> Option<String> {
        use tauri_plugin_dialog::DialogExt;
        app.dialog()
            .file()
            .blocking_pick_folder()
            .map(|p| p.to_string())
    }

    /// Open the native OS file-picker; returns the chosen file path or None.
    #[tauri::command]
    pub async fn open_file_dialog(app: tauri::AppHandle) -> Option<String> {
        use tauri_plugin_dialog::DialogExt;
        app.dialog()
            .file()
            .add_filter("Executables", &["exe", "app", "bin", "sh"])
            .add_filter("All Files", &["*"])
            .blocking_pick_file()
            .map(|p| p.to_string())
    }

    /// Get all distinct parent genres from the database
    #[tauri::command]
    pub async fn get_genres() -> Result<Vec<String>, String> {
        use rusqlite::Connection;
        let db_path = if std::path::Path::new("../gb64.sqlite").exists() {
            "../gb64.sqlite"
        } else if std::path::Path::new("gb64.sqlite").exists() {
            "gb64.sqlite"
        } else {
            "../../gb64.sqlite"
        };
        let conn = Connection::open(db_path).map_err(|e| format!("DB error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT DISTINCT parentGenre FROM GameView WHERE parentGenre != '' ORDER BY parentGenre"
        ).map_err(|e| e.to_string())?;
        let genres: Vec<String> = stmt.query_map([], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        Ok(genres)
    }

    /// Read games from the pre-compiled SQLite database
    #[tauri::command]
    pub async fn get_db_games(
        limit: Option<usize>, 
        offset: Option<usize>,
        filters: Option<super::GameFilters>
    ) -> Result<Vec<super::GameRow>, String> {
        use rusqlite::{Connection, params_from_iter};
        
        let db_path = if std::path::Path::new("../gb64.sqlite").exists() {
            "../gb64.sqlite"
        } else if std::path::Path::new("gb64.sqlite").exists() {
            "gb64.sqlite"
        } else {
            "../../gb64.sqlite"
        };
        
        let conn = Connection::open(db_path).map_err(|e| format!("Database error: {}", e))?;
        
        // Join Games and Musicians/Developers for additional metadata
        let mut query = "
            SELECT 
                gv.*, 
                g.Adult as isAdult,
                g.Control as control,
                g.PlayersFrom as players_from,
                g.PlayersTo as players_to,
                g.PlayersSim as players_sim,
                g.Comment as comment,
                g.ReviewRating as review_rating,
                mu.Photo as musician_photo,
                mu.Nick as musician_nick,
                mu.Grp as musician_group,
                pr.Musician as coder_name,
                ar.Musician as graphics_name,
                cr.Developer as version_by,
                g.V_Trainers as v_trainers,
                g.V_Length as v_length,
                CASE WHEN g.V_LoadingScreen = '1' THEN 1 ELSE 0 END as v_loading_screen,
                CASE WHEN g.V_HighScoreSaver = '1' THEN 1 ELSE 0 END as v_high_score_saver,
                CASE WHEN g.V_IncludedDocs = '1' THEN 1 ELSE 0 END as v_included_docs,
                CASE WHEN g.V_TrueDriveEmu = '1' THEN 1 ELSE 0 END as v_true_drive_emu,
                g.V_PalNTSC as v_pal_ntsc,
                g.MemoText as memo
            FROM GameView gv 
            JOIN Games g ON gv.id = g.GA_Id 
            LEFT JOIN Musicians mu ON g.MU_Id = mu.MU_Id
            LEFT JOIN Musicians pr ON g.PR_Id = pr.MU_Id
            LEFT JOIN Musicians ar ON g.AR_Id = ar.MU_Id
            LEFT JOIN Developers cr ON g.CR_Id = cr.DE_Id
            WHERE 1=1".to_string();
        let mut params: Vec<String> = Vec::new();

        if let Some(f) = filters {
            if let Some(sq) = f.search_query {
                if !sq.is_empty() {
                    query.push_str(" AND (gv.name LIKE ? OR gv.developer_name LIKE ? OR gv.publisher_name LIKE ? OR gv.musician_name LIKE ?)");
                    let pattern = format!("%{}%", sq);
                    params.push(pattern.clone());
                    params.push(pattern.clone());
                    params.push(pattern.clone());
                    params.push(pattern);
                }
            }
            if let Some(l) = f.letter {
                if !l.is_empty() {
                    if l == "#" {
                        query.push_str(" AND SUBSTR(gv.name, 1, 1) NOT GLOB '[A-Za-z]*'");
                    } else {
                        query.push_str(" AND gv.name LIKE ?");
                        params.push(format!("{}%", l));
                    }
                }
            }
            if let Some(g) = f.genre {
                if !g.is_empty() {
                    query.push_str(" AND gv.parentGenre = ?");
                    params.push(g);
                }
            }
            if let Some(hide) = f.hide_adult {
                if hide {
                    query.push_str(" AND g.Adult = 'False'");
                }
            }
            if let Some(fav_ids) = f.favorite_ids {
                if !fav_ids.is_empty() {
                    let placeholders = fav_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                    query.push_str(&format!(" AND gv.id IN ({})", placeholders));
                    for id in fav_ids {
                        params.push(id.clone());
                    }
                } else {
                    return Ok(Vec::new());
                }
            }
        }

        query.push_str(" ORDER BY name ASC LIMIT ? OFFSET ?");
        params.push(limit.unwrap_or(50).to_string());
        params.push(offset.unwrap_or(0).to_string());

        let mut stmt = conn.prepare(&query).map_err(|e| format!("Prepare error: {}", e))?;
        
        let game_iter = stmt.query_map(params_from_iter(params), |row| {
            Ok(super::GameRow {
                id: row.get("id")?,
                name: row.get("name")?,
                filename: row.get("filename")?,
                game_filename: row.get("gameFilename")?,
                screenshot_filename: row.get("screenshotFilename")?,
                box_front_filename: row.get("boxFrontFilename")?,
                titlescreen_filename: row.get("titlescreenFilename")?,
                video_snap_filename: row.get("videoSnapFilename")?,
                sid_filename: row.get("sidFilename")?,
                crc: row.get("crc")?,
                year: row.get("year")?,
                is_pal: row.get::<_, i32>("isPal")? == 1,
                is_ntsc: row.get::<_, i32>("isNtsc")? == 1,
                true_drive_emu: row.get::<_, i32>("trueDriveEmu")? == 1,
                is_classic: row.get::<_, i32>("isClassic")? == 1,
                parent_genre: row.get("parentGenre")?,
                sub_genre: row.get("subGenre")?,
                developer_name: row.get("developer_name")?,
                publisher_name: row.get("publisher_name")?,
                musician_name: row.get("musician_name")?,
                musician_photo: row.get("musician_photo")?,
                musician_nick: row.get("musician_nick")?,
                musician_group: row.get("musician_group")?,
                coder_name: row.get("coder_name")?,
                graphics_name: row.get("graphics_name")?,
                version_by: row.get("version_by")?,
                control: row.get("control")?,
                players_from: row.get("players_from")?,
                players_to: row.get("players_to")?,
                players_sim: row.get("players_sim")?,
                comment: row.get("comment")?,
                review_rating: row.get("review_rating")?,
                languages: row.get("languages")?,
                v_trainers: row.get("v_trainers")?,
                v_length: row.get("v_length")?,
                v_loading_screen: Some(row.get::<_, i32>("v_loading_screen")? == 1),
                v_high_score_saver: Some(row.get::<_, i32>("v_high_score_saver")? == 1),
                v_included_docs: Some(row.get::<_, i32>("v_included_docs")? == 1),
                v_true_drive_emu: Some(row.get::<_, i32>("v_true_drive_emu")? == 1),
                v_pal_ntsc: row.get("v_pal_ntsc")?,
                memo: row.get("memo")?,
            })
        }).map_err(|e| e.to_string())?;
        
        let mut games = Vec::new();
        for game in game_iter {
            games.push(game.map_err(|e| e.to_string())?);
        }
        
        Ok(games)
    }

    /// Get all extras for a specific game
    #[tauri::command]
    pub async fn get_game_extras(game_id: String) -> Result<Vec<super::ExtraRow>, String> {
        use rusqlite::Connection;
        let db_path = if std::path::Path::new("../gb64.sqlite").exists() {
            "../gb64.sqlite"
        } else if std::path::Path::new("gb64.sqlite").exists() {
            "gb64.sqlite"
        } else {
            "../../gb64.sqlite"
        };
        let conn = Connection::open(db_path).map_err(|e| format!("DB error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT EX_Id, Name, Path, Type FROM Extras WHERE GA_Id = ? ORDER BY DisplayOrder ASC"
        ).map_err(|e| e.to_string())?;
        
        let extra_iter = stmt.query_map([game_id], |row| {
            Ok(super::ExtraRow {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                extra_type: row.get(3)?,
            })
        }).map_err(|e| e.to_string())?;
        
        let mut extras = Vec::new();
        for extra in extra_iter {
            extras.push(extra.map_err(|e| e.to_string())?);
        }
        Ok(extras)
    }
}

// ---------------------------------------------------------------------------
// Application entry point
// ---------------------------------------------------------------------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::scan_rom_directory,
            commands::launch_emulator,
            commands::download_media_asset,
            commands::read_file_bytes,
            commands::resolve_media_path,
            commands::find_all_media_variants,
            commands::open_directory_dialog,
            commands::open_file_dialog,
            commands::get_db_games,
            commands::get_genres,
            commands::get_game_extras,
        ])
        .run(tauri::generate_context!())
        .expect("error while running 64Box");
}

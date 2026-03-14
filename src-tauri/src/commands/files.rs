use crate::models::{ResolvedPath, ScannedRom};
use std::path::{Path, PathBuf};

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

#[tauri::command]
pub async fn download_media_asset(
    url: String,
    dest_dir: String,
    filename: String,
) -> Result<ResolvedPath, String> {
    let dest = PathBuf::from(&dest_dir);
    if !dest.exists() {
        std::fs::create_dir_all(&dest).map_err(|e| format!("Could not create directory: {}", e))?;
    }

    let safe_filename = filename.replace("\\", "/");
    let full_path = dest.join(PathBuf::from(&safe_filename));

    if let Some(parent) = full_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Could not create sub-directory: {}", e))?;
        }
    }

    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download {}: {}", url, e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download failed with status: {}",
            response.status()
        ));
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    std::fs::write(&full_path, bytes)
        .map_err(|e| format!("Failed to write file {}: {}", full_path.display(), e))?;

    Ok(ResolvedPath {
        exists: true,
        absolute_path: full_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn resolve_media_path(base_dir: String, filename: String) -> ResolvedPath {
    let full = PathBuf::from(&base_dir).join(&filename);
    ResolvedPath {
        exists: full.exists(),
        absolute_path: full.to_string_lossy().to_string(),
    }
}

#[tauri::command]
pub async fn find_all_media_variants(base_dir: String, filename: String) -> Vec<String> {
    let mut results = Vec::new();
    let full = PathBuf::from(&base_dir).join(&filename);

    if full.exists() {
        results.push(full.to_string_lossy().to_string());
    }

    let path = Path::new(&filename);
    if let (Some(stem), Some(ext), Some(parent)) =
        (path.file_stem(), path.extension(), path.parent())
    {
        let stem_str = stem.to_string_lossy();
        let ext_str = ext.to_string_lossy();
        for i in 1..=9 {
            let mut found_any = false;

            let variant_name = format!("{}_{}.{}", stem_str, i, ext_str);
            let variant_full = PathBuf::from(&base_dir).join(parent).join(&variant_name);
            if variant_full.exists() {
                results.push(variant_full.to_string_lossy().to_string());
                found_any = true;
            }

            let alpha_char = (97 + i - 1) as u8 as char;
            let variant_alpha = format!("{}_{}.{}", stem_str, alpha_char, ext_str);
            let variant_full_alpha = PathBuf::from(&base_dir).join(parent).join(&variant_alpha);
            if variant_full_alpha.exists() {
                results.push(variant_full_alpha.to_string_lossy().to_string());
                found_any = true;
            }

            if !found_any {
                break;
            }
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_resolve_media_path() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.png");
        File::create(&file_path).unwrap();

        let res = resolve_media_path(
            dir.path().to_string_lossy().to_string(),
            "test.png".to_string(),
        )
        .await;

        assert!(res.exists);
        assert!(res.absolute_path.contains("test.png"));
    }

    #[tokio::test]
    async fn test_find_all_media_variants() {
        let dir = tempdir().unwrap();
        let base = dir.path().to_string_lossy().to_string();

        File::create(dir.path().join("game.png")).unwrap();
        File::create(dir.path().join("game_1.png")).unwrap();
        File::create(dir.path().join("game_a.png")).unwrap();

        let variants = find_all_media_variants(base, "game.png".to_string()).await;

        assert_eq!(variants.len(), 3);
        assert!(variants.iter().any(|v| v.contains("game.png")));
        assert!(variants.iter().any(|v| v.contains("game_1.png")));
        assert!(variants.iter().any(|v| v.contains("game_a.png")));
    }

    #[tokio::test]
    async fn test_scan_rom_directory() {
        let dir = tempdir().unwrap();
        let base = dir.path().to_string_lossy().to_string();

        // Valid ROM
        File::create(dir.path().join("game.d64")).unwrap();
        // Valid but uppercase
        File::create(dir.path().join("GAME2.T64")).unwrap();
        // Invalid extension
        File::create(dir.path().join("text.txt")).unwrap();
        // Subdirectory
        let sub = dir.path().join("subdir");
        std::fs::create_dir(&sub).unwrap();
        File::create(sub.join("nested.prg")).unwrap();

        let roms = scan_rom_directory(base).await.unwrap();

        // Should find 3 roms (game.d64, GAME2.T64, nested.prg)
        assert_eq!(roms.len(), 3);
        assert!(roms.iter().any(|r| r.filename == "game.d64"));
        assert!(roms.iter().any(|r| r.filename == "GAME2.T64"));
        assert!(roms.iter().any(|r| r.filename == "nested.prg"));
    }

    #[tokio::test]
    async fn test_scan_non_existent_directory() {
        let res = scan_rom_directory("/non/existent/path/64box".to_string()).await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_scan_rom_directory_empty() {
        let dir = tempdir().unwrap();
        let roms = scan_rom_directory(dir.path().to_string_lossy().to_string())
            .await
            .unwrap();
        assert_eq!(roms.len(), 0);
    }

    #[tokio::test]
    async fn test_read_file_bytes() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.bin");
        std::fs::write(&file_path, b"hello").unwrap();

        let bytes = read_file_bytes(file_path.to_string_lossy().to_string())
            .await
            .unwrap();
        assert_eq!(bytes, b"hello");
    }
}

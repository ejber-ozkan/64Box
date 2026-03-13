use rusqlite::{params_from_iter, Connection, OptionalExtension, params};
use crate::models::{GameFilters, GameRow, ExtraRow};
use crate::database::{get_db_path, init_secure_table};
use crate::security::{encrypt_value, decrypt_value};

#[tauri::command]
pub async fn get_genres() -> Result<Vec<String>, String> {
    let conn = Connection::open(get_db_path()).map_err(|e| format!("DB error: {}", e))?;
    let mut stmt = conn.prepare(
        "SELECT DISTINCT parentGenre FROM GameView WHERE parentGenre != '' ORDER BY parentGenre"
    ).map_err(|e| e.to_string())?;
    let genres: Vec<String> = stmt.query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(genres)
}

#[tauri::command]
pub async fn get_db_games(
    limit: Option<usize>, 
    offset: Option<usize>,
    filters: Option<GameFilters>
) -> Result<Vec<GameRow>, String> {
    let conn = Connection::open(get_db_path()).map_err(|e| format!("Database error: {}", e))?;
    
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
                query.push_str(" AND (LOWER(gv.name) LIKE ? OR LOWER(gv.developer_name) LIKE ? OR LOWER(gv.publisher_name) LIKE ? OR LOWER(gv.musician_name) LIKE ?)");
                let pattern = format!("%{}%", sq.to_lowercase());
                for _ in 0..4 {
                    params.push(pattern.clone());
                }
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
        if let Some(classic) = f.is_classic {
            if classic {
                query.push_str(" AND gv.isClassic = 1");
            } else {
                query.push_str(" AND gv.isClassic = 0");
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
        Ok(GameRow {
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

#[tauri::command]
pub async fn get_game_extras(game_id: String) -> Result<Vec<ExtraRow>, String> {
    let conn = Connection::open(get_db_path()).map_err(|e| format!("DB error: {}", e))?;
    let mut stmt = conn.prepare(
        "SELECT EX_Id, Name, Path, Type FROM Extras WHERE GA_Id = ? ORDER BY DisplayOrder ASC"
    ).map_err(|e| e.to_string())?;
    
    let extra_iter = stmt.query_map([game_id], |row| {
        Ok(ExtraRow {
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

#[tauri::command]
pub async fn save_secure_setting(key: String, value: String) -> Result<(), String> {
    init_secure_table()?;
    let encrypted = encrypt_value(&value)?;
    let conn = Connection::open(get_db_path()).map_err(|e: rusqlite::Error| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO SecureSettings (key, value) VALUES (?1, ?2)",
        params![key, encrypted],
    ).map_err(|e: rusqlite::Error| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_secure_setting(key: String) -> Result<Option<String>, String> {
    init_secure_table()?;
    let conn = Connection::open(get_db_path()).map_err(|e: rusqlite::Error| e.to_string())?;
    let mut stmt = conn.prepare("SELECT value FROM SecureSettings WHERE key = ?1").map_err(|e: rusqlite::Error| e.to_string())?;
    let encrypted: Option<String> = stmt.query_row([key], |row| row.get(0))
        .optional()
        .map_err(|e: rusqlite::Error| e.to_string())?;
        
    match encrypted {
        Some(enc) => Ok(Some(decrypt_value(&enc)?)),
        None => Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_secure_settings_roundtrip() {
        // Create a temporary file for the database
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        
        // Use the environment variable to point to our temp DB
        std::env::set_var("VIC40_DB_PATH", &db_path);
        
        save_secure_setting("test_key".to_string(), "test_password".to_string()).await.expect("Failed to save");
        let val = get_secure_setting("test_key".to_string()).await.expect("Failed to get");
        
        assert_eq!(val, Some("test_password".to_string()));
        
        // Test missing key
        let missing = get_secure_setting("unknown".to_string()).await.expect("Failed to get unknown");
        assert!(missing.is_none());

        std::env::remove_var("VIC40_DB_PATH");
    }

    #[tokio::test]
    async fn test_get_genres() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);
        
        {
            let conn = Connection::open(&db_path).unwrap();
            conn.execute("CREATE TABLE GameView (parentGenre TEXT)", []).unwrap();
            conn.execute("INSERT INTO GameView (parentGenre) VALUES (?)", ["Action"]).unwrap();
            conn.execute("INSERT INTO GameView (parentGenre) VALUES (?)", ["Puzzle"]).unwrap();
            conn.execute("INSERT INTO GameView (parentGenre) VALUES (?)", [""]).unwrap(); // Should be filtered
        }
        
        let genres = get_genres().await.expect("Failed to get genres");
        assert_eq!(genres.len(), 2);
        assert!(genres.contains(&"Action".to_string()));
        assert!(genres.contains(&"Puzzle".to_string()));
        
        std::env::remove_var("VIC40_DB_PATH");
    }

    #[tokio::test]
    async fn test_get_game_extras() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);
        
        {
            let conn = Connection::open(&db_path).unwrap();
            conn.execute("CREATE TABLE Extras (GA_Id TEXT, EX_Id TEXT, Name TEXT, Path TEXT, Type TEXT, DisplayOrder INTEGER)", []).unwrap();
            conn.execute("INSERT INTO Extras (GA_Id, EX_Id, Name, Path, Type, DisplayOrder) VALUES (?, ?, ?, ?, ?, ?)", 
                rusqlite::params!["game1", "ex1", "Manual", "extras/manual.pdf", "doc", 1]).unwrap();
        }
        
        let extras = get_game_extras("game1".to_string()).await.expect("Failed to get extras");
        assert_eq!(extras.len(), 1);
        assert_eq!(extras[0].name, "Manual");
        
        std::env::remove_var("VIC40_DB_PATH");
    }

    #[tokio::test]
    async fn test_get_db_games() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);
        
        {
            let conn = Connection::open(&db_path).unwrap();
            conn.execute("CREATE TABLE Games (GA_Id TEXT, MU_Id TEXT, PR_Id TEXT, AR_Id TEXT, CR_Id TEXT, Adult TEXT, Control TEXT, PlayersFrom TEXT, PlayersTo TEXT, PlayersSim TEXT, Comment TEXT, ReviewRating TEXT, V_Trainers TEXT, V_Length TEXT, V_LoadingScreen TEXT, V_HighScoreSaver TEXT, V_IncludedDocs TEXT, V_TrueDriveEmu TEXT, V_PalNTSC TEXT, MemoText TEXT)", []).unwrap();
            conn.execute("CREATE TABLE GameView (id TEXT, name TEXT, filename TEXT, gameFilename TEXT, screenshotFilename TEXT, boxFrontFilename TEXT, titlescreenFilename TEXT, videoSnapFilename TEXT, sidFilename TEXT, crc TEXT, year TEXT, isPal INTEGER, isNtsc INTEGER, trueDriveEmu INTEGER, isClassic INTEGER, parentGenre TEXT, subGenre TEXT, developer_name TEXT, publisher_name TEXT, musician_name TEXT, languages TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Musicians (MU_Id TEXT, Photo TEXT, Nick TEXT, Grp TEXT, Musician TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Developers (DE_Id TEXT, Developer TEXT)", []).unwrap();

            conn.execute("INSERT INTO Games (GA_Id, Adult) VALUES (?, ?)", ["1", "False"]).unwrap();
            conn.execute("INSERT INTO GameView (id, name, filename, parentGenre, subGenre, isPal, isNtsc, trueDriveEmu, isClassic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                rusqlite::params!["1", "Maniac Mansion", "maniac.d64", "Action", "Adventure", 1, 0, 0, 1]).unwrap();
        }
        
        let games = get_db_games(Some(10), Some(0), None).await.expect("Failed basic fetch");
        assert_eq!(games.len(), 1);
        assert_eq!(games[0].name, "Maniac Mansion");
        
        // Test letter filter
        let filters_m = GameFilters {
            letter: Some("M".to_string()),
            ..Default::default()
        };
        let res_m = get_db_games(Some(10), Some(0), Some(filters_m)).await.unwrap();
        assert_eq!(res_m.len(), 1);

        let filters_z = GameFilters {
            letter: Some("Z".to_string()),
            ..Default::default()
        };
        let res_z = get_db_games(Some(10), Some(0), Some(filters_z)).await.unwrap();
        assert_eq!(res_z.len(), 0);

        // Test search
        let filters_sq = GameFilters {
            search_query: Some("Maniac".to_string()),
            ..Default::default()
        };
        let res_sq = get_db_games(Some(10), Some(0), Some(filters_sq)).await.unwrap();
        assert_eq!(res_sq.len(), 1);

        // Test hide adult
        let filters_adult = GameFilters {
            hide_adult: Some(true),
            ..Default::default()
        };
        let res_adult = get_db_games(Some(10), Some(0), Some(filters_adult)).await.unwrap();
        assert_eq!(res_adult.len(), 1);

        std::env::remove_var("VIC40_DB_PATH");
    }

    #[tokio::test]
    async fn test_get_db_games_symbol_filter() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);
        
        {
            let conn = Connection::open(&db_path).unwrap();
            conn.execute("CREATE TABLE Games (GA_Id TEXT, MU_Id TEXT, PR_Id TEXT, AR_Id TEXT, CR_Id TEXT, Adult TEXT, Control TEXT, PlayersFrom TEXT, PlayersTo TEXT, PlayersSim TEXT, Comment TEXT, ReviewRating TEXT, V_Trainers TEXT, V_Length TEXT, V_LoadingScreen TEXT, V_HighScoreSaver TEXT, V_IncludedDocs TEXT, V_TrueDriveEmu TEXT, V_PalNTSC TEXT, MemoText TEXT)", []).unwrap();
            conn.execute("CREATE TABLE GameView (id TEXT, name TEXT, filename TEXT, gameFilename TEXT, screenshotFilename TEXT, boxFrontFilename TEXT, titlescreenFilename TEXT, videoSnapFilename TEXT, sidFilename TEXT, crc TEXT, year TEXT, isPal INTEGER, isNtsc INTEGER, trueDriveEmu INTEGER, isClassic INTEGER, parentGenre TEXT, subGenre TEXT, developer_name TEXT, publisher_name TEXT, musician_name TEXT, languages TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Musicians (MU_Id TEXT, Photo TEXT, Nick TEXT, Grp TEXT, Musician TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Developers (DE_Id TEXT, Developer TEXT)", []).unwrap();
            
            conn.execute("INSERT INTO Games (GA_Id, Adult) VALUES (?, ?)", ["1", "False"]).unwrap();
            conn.execute("INSERT INTO GameView (id, name, filename, parentGenre, subGenre, isPal, isNtsc, trueDriveEmu, isClassic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                rusqlite::params!["1", "1942", "1942.d64", "Action", "Shooter", 1, 0, 0, 1]).unwrap();
        }
        
        let filters = GameFilters {
            letter: Some("#".to_string()),
            ..Default::default()
        };
        let res = get_db_games(Some(10), Some(0), Some(filters)).await.unwrap();
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].name, "1942");

        std::env::remove_var("VIC40_DB_PATH");
    }

    #[tokio::test]
    async fn test_get_db_games_pagination() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);
        
        {
            let conn = Connection::open(&db_path).unwrap();
            conn.execute("CREATE TABLE Games (GA_Id TEXT, MU_Id TEXT, PR_Id TEXT, AR_Id TEXT, CR_Id TEXT, Adult TEXT, Control TEXT, PlayersFrom TEXT, PlayersTo TEXT, PlayersSim TEXT, Comment TEXT, ReviewRating TEXT, V_Trainers TEXT, V_Length TEXT, V_LoadingScreen TEXT, V_HighScoreSaver TEXT, V_IncludedDocs TEXT, V_TrueDriveEmu TEXT, V_PalNTSC TEXT, MemoText TEXT)", []).unwrap();
            conn.execute("CREATE TABLE GameView (id TEXT, name TEXT, filename TEXT, gameFilename TEXT, screenshotFilename TEXT, boxFrontFilename TEXT, titlescreenFilename TEXT, videoSnapFilename TEXT, sidFilename TEXT, crc TEXT, year TEXT, isPal INTEGER, isNtsc INTEGER, trueDriveEmu INTEGER, isClassic INTEGER, parentGenre TEXT, subGenre TEXT, developer_name TEXT, publisher_name HEX, musician_name TEXT, languages TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Musicians (MU_Id TEXT, Photo TEXT, Nick TEXT, Grp TEXT, Musician TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Developers (DE_Id TEXT, Developer TEXT)", []).unwrap();
            
            for i in 1..=5 {
                let id = i.to_string();
                conn.execute("INSERT INTO Games (GA_Id, Adult) VALUES (?, ?)", [&id, "False"]).unwrap();
                conn.execute("INSERT INTO GameView (id, name, filename, parentGenre, subGenre, isPal, isNtsc, trueDriveEmu, isClassic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                    rusqlite::params![&id, format!("Game {}", i), format!("game{}.d64", i), "Action", "Adventure", 1, 0, 0, 1]).unwrap();
            }
        }
        
        let page1 = get_db_games(Some(2), Some(0), None).await.unwrap();
        assert_eq!(page1.len(), 2);
        assert_eq!(page1[0].name, "Game 1");

        let page2 = get_db_games(Some(2), Some(2), None).await.unwrap();
        assert_eq!(page2.len(), 2);
        assert_eq!(page2[0].name, "Game 3");

        let page3 = get_db_games(Some(2), Some(4), None).await.unwrap();
        assert_eq!(page3.len(), 1);
        assert_eq!(page3[0].name, "Game 5");

        std::env::remove_var("VIC40_DB_PATH");
    }
}

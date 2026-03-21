use crate::database::{ensure_query_support_objects, get_db_path, init_secure_table};
use crate::models::{ExtraRow, GameFilters, GameRow};
use crate::security::{decrypt_value, encrypt_value};
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row};
use std::collections::HashMap;

const FILTERED_IDS_QUERY_PREFIX: &str = "
        SELECT
            g.GA_Id as id,
            g.Name as sort_name
        FROM Games g
        JOIN GameView gv ON gv.id = g.GA_Id
        LEFT JOIN Programmers pr ON g.PR_Id = pr.PR_Id
        LEFT JOIN Artists ar ON g.AR_Id = ar.AR_Id
        WHERE 1=1";

const FILTERED_IDS_QUERY_SUFFIX: &str = "
            ORDER BY g.Name COLLATE NOCASE ASC
            LIMIT ? OFFSET ?";

const GAME_DETAILS_QUERY_PREFIX: &str = "
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
            cover.cover_path as cover_path,
            pr.Programmer as coder_name,
            ar.Artist as graphics_name,
            gv.developer_name as version_by,
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
        LEFT JOIN GameCoverIndex cover ON cover.GA_Id = g.GA_Id
        LEFT JOIN Programmers pr ON g.PR_Id = pr.PR_Id
        LEFT JOIN Artists ar ON g.AR_Id = ar.AR_Id
        WHERE gv.id IN (";

const LEGACY_SEARCH_FILTER_COLUMNS: [&str; 6] = [
    "LOWER(gv.name) LIKE ?",
    "LOWER(gv.developer_name) LIKE ?",
    "LOWER(gv.publisher_name) LIKE ?",
    "LOWER(gv.musician_name) LIKE ?",
    "LOWER(COALESCE(pr.Programmer, '')) LIKE ?",
    "LOWER(COALESCE(ar.Artist, '')) LIKE ?",
];

fn build_fts_match_query(search_query: &str) -> Option<String> {
    let terms = search_query
        .split(|character: char| !character.is_alphanumeric())
        .filter(|term| !term.is_empty())
        .map(|term| format!("{term}*"))
        .collect::<Vec<_>>();

    if terms.is_empty() {
        None
    } else {
        Some(terms.join(" AND "))
    }
}

#[derive(Clone, Copy)]
enum SearchMode {
    Fts,
    Like,
}

struct GameQueryBuilder {
    filter_query: String,
    params: Vec<String>,
    search_mode: SearchMode,
}

impl GameQueryBuilder {
    fn new(search_mode: SearchMode) -> Self {
        Self {
            filter_query: FILTERED_IDS_QUERY_PREFIX.to_string(),
            params: Vec::new(),
            search_mode,
        }
    }

    fn push_search_filter(&mut self, search_query: Option<&str>) {
        let Some(search_query) = search_query.filter(|value| !value.is_empty()) else {
            return;
        };
        match self.search_mode {
            SearchMode::Fts => {
                let Some(match_query) = build_fts_match_query(search_query) else {
                    self.filter_query.push_str(" AND 1=0");
                    return;
                };

                self.filter_query.push_str(
                    " AND gv.id IN (
                        SELECT id
                        FROM GameSearchIndex
                        WHERE GameSearchIndex MATCH ?
                    )",
                );
                self.params.push(match_query);
            }
            SearchMode::Like => {
                self.filter_query.push_str(" AND (");
                self.filter_query
                    .push_str(&LEGACY_SEARCH_FILTER_COLUMNS.join(" OR "));
                self.filter_query.push(')');

                let pattern = format!("%{}%", search_query.to_lowercase());
                for _ in 0..LEGACY_SEARCH_FILTER_COLUMNS.len() {
                    self.params.push(pattern.clone());
                }
            }
        }
    }

    fn push_letter_filter(&mut self, letter: Option<&str>) {
        let Some(letter) = letter.filter(|value| !value.is_empty()) else {
            return;
        };

        if letter == "#" {
            self.filter_query
                .push_str(" AND SUBSTR(gv.name, 1, 1) NOT GLOB '[A-Za-z]*'");
        } else {
            self.filter_query.push_str(" AND g.Name LIKE ?");
            self.params.push(format!("{}%", letter));
        }
    }

    fn push_exact_filter(&mut self, clause: &str, value: Option<&str>) {
        let Some(value) = value.filter(|candidate| !candidate.is_empty()) else {
            return;
        };

        self.filter_query.push_str(clause);
        self.params.push(value.to_string());
    }

    fn push_hide_adult_filter(&mut self, hide_adult: bool) {
        if hide_adult {
            self.filter_query.push_str(" AND g.Adult = 'False'");
        }
    }

    fn push_classic_filter(&mut self, is_classic: Option<bool>) {
        match is_classic {
            Some(true) => self.filter_query.push_str(" AND gv.isClassic = 1"),
            Some(false) => self.filter_query.push_str(" AND gv.isClassic = 0"),
            None => {}
        }
    }

    fn push_favorite_filter(&mut self, favorite_ids: Option<&[String]>) -> bool {
        let Some(favorite_ids) = favorite_ids else {
            return true;
        };

        if favorite_ids.is_empty() {
            return false;
        }

        let placeholders = favorite_ids
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(",");
        self.filter_query
            .push_str(&format!(" AND gv.id IN ({placeholders})"));
        self.params.extend(favorite_ids.iter().cloned());
        true
    }

    fn finish(mut self, limit: usize, offset: usize) -> (String, Vec<String>) {
        self.filter_query.push_str(FILTERED_IDS_QUERY_SUFFIX);
        self.params.push(limit.to_string());
        self.params.push(offset.to_string());
        (self.filter_query, self.params)
    }

    fn finish_count(self) -> (String, Vec<String>) {
        (
            format!("SELECT COUNT(*) FROM ({})", self.filter_query),
            self.params,
        )
    }
}

fn build_game_query(
    limit: usize,
    offset: usize,
    filters: Option<GameFilters>,
    search_mode: SearchMode,
) -> Option<(String, Vec<String>)> {
    let mut builder = GameQueryBuilder::new(search_mode);

    if let Some(filters) = filters {
        builder.push_search_filter(filters.search_query.as_deref());
        builder.push_letter_filter(filters.letter.as_deref());
        builder.push_exact_filter(" AND gv.parentGenre = ?", filters.genre.as_deref());
        builder.push_exact_filter(" AND gv.subGenre = ?", filters.sub_genre.as_deref());
        builder.push_hide_adult_filter(filters.hide_adult.unwrap_or(false));
        builder.push_classic_filter(filters.is_classic);

        if !builder.push_favorite_filter(filters.favorite_ids.as_deref()) {
            return None;
        }
    }

    Some(builder.finish(limit, offset))
}

fn build_game_count_query(
    filters: Option<GameFilters>,
    search_mode: SearchMode,
) -> Option<(String, Vec<String>)> {
    let mut builder = GameQueryBuilder::new(search_mode);

    if let Some(filters) = filters {
        builder.push_search_filter(filters.search_query.as_deref());
        builder.push_letter_filter(filters.letter.as_deref());
        builder.push_exact_filter(" AND gv.parentGenre = ?", filters.genre.as_deref());
        builder.push_exact_filter(" AND gv.subGenre = ?", filters.sub_genre.as_deref());
        builder.push_hide_adult_filter(filters.hide_adult.unwrap_or(false));
        builder.push_classic_filter(filters.is_classic);

        if !builder.push_favorite_filter(filters.favorite_ids.as_deref()) {
            return Some(("SELECT 0".to_string(), Vec::new()));
        }
    }

    Some(builder.finish_count())
}

fn open_db_connection(context: &str) -> Result<Connection, String> {
    let conn = Connection::open(get_db_path()).map_err(|error| format!("{context}: {error}"))?;
    ensure_query_support_objects(&conn).map_err(|error| format!("{context}: {error}"))?;
    Ok(conn)
}

fn build_game_details_query(ids: &[String]) -> (String, Vec<String>) {
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!("{GAME_DETAILS_QUERY_PREFIX}{placeholders})");
    (query, ids.to_vec())
}

fn map_game_row(row: &Row<'_>) -> rusqlite::Result<GameRow> {
    Ok(GameRow {
        id: row.get("id")?,
        name: row.get("name")?,
        filename: row.get("filename")?,
        game_filename: row.get("gameFilename")?,
        screenshot_filename: row.get("screenshotFilename")?,
        box_front_filename: row.get("boxFrontFilename")?,
        cover_path: row.get("cover_path")?,
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
}

#[tauri::command]
pub async fn get_genres() -> Result<Vec<String>, String> {
    let conn = open_db_connection("DB error")?;
    let mut stmt = conn.prepare(
        "SELECT DISTINCT parentGenre FROM GameView WHERE parentGenre != '' ORDER BY parentGenre"
    ).map_err(|e| e.to_string())?;
    let genres: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(genres)
}

#[tauri::command]
pub async fn get_sub_genres(genre: Option<String>) -> Result<Vec<String>, String> {
    let Some(selected_genre) = genre.filter(|value| !value.trim().is_empty()) else {
        return Ok(Vec::new());
    };

    let conn = open_db_connection("DB error")?;
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT subGenre
             FROM GameView
             WHERE parentGenre = ?1
               AND subGenre IS NOT NULL
               AND TRIM(subGenre) != ''
             ORDER BY subGenre COLLATE NOCASE",
        )
        .map_err(|e| e.to_string())?;
    let sub_genres: Vec<String> = stmt
        .query_map([selected_genre], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(sub_genres)
}

#[tauri::command]
pub async fn get_db_games(
    limit: Option<usize>,
    offset: Option<usize>,
    filters: Option<GameFilters>,
) -> Result<Vec<GameRow>, String> {
    let conn = open_db_connection("Database error")?;
    let filters_for_retry = filters.clone();
    let load_ids =
        |search_mode: SearchMode, filters: Option<GameFilters>| -> Result<Vec<String>, String> {
            let Some((query, params)) = build_game_query(
                limit.unwrap_or(50),
                offset.unwrap_or(0),
                filters,
                search_mode,
            ) else {
                return Ok(Vec::new());
            };

            let mut stmt = conn
                .prepare(&query)
                .map_err(|e| format!("Prepare error: {}", e))?;
            let id_iter = stmt
                .query_map(params_from_iter(params), |row| row.get::<_, String>(0))
                .map_err(|e| e.to_string())?;
            id_iter
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())
        };

    let ordered_ids = match load_ids(SearchMode::Fts, filters) {
        Ok(ids) => ids,
        Err(error) if error.contains("no such table: GameSearchIndex") => {
            load_ids(SearchMode::Like, filters_for_retry)?
        }
        Err(error) => return Err(error),
    };

    if ordered_ids.is_empty() {
        return Ok(Vec::new());
    }

    let (details_query, detail_params) = build_game_details_query(&ordered_ids);
    let mut details_stmt = conn
        .prepare(&details_query)
        .map_err(|e| format!("Prepare error: {}", e))?;
    let game_iter = details_stmt
        .query_map(params_from_iter(detail_params), map_game_row)
        .map_err(|e| e.to_string())?;

    let order_lookup: HashMap<String, usize> = ordered_ids
        .iter()
        .enumerate()
        .map(|(index, id)| (id.clone(), index))
        .collect();
    let mut games = Vec::with_capacity(ordered_ids.len());
    for game in game_iter {
        games.push(game.map_err(|e| e.to_string())?);
    }
    games.sort_by_key(|game| order_lookup.get(&game.id).copied().unwrap_or(usize::MAX));

    Ok(games)
}

#[tauri::command]
pub async fn get_db_game_count(filters: Option<GameFilters>) -> Result<usize, String> {
    let conn = open_db_connection("Database error")?;
    let filters_for_retry = filters.clone();

    let load_count = |search_mode: SearchMode, filters: Option<GameFilters>| -> Result<usize, String> {
        let Some((query, params)) = build_game_count_query(filters, search_mode) else {
            return Ok(0);
        };

        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| format!("Prepare error: {}", e))?;

        stmt.query_row(params_from_iter(params), |row| row.get::<_, usize>(0))
            .map_err(|e| e.to_string())
    };

    match load_count(SearchMode::Fts, filters) {
        Ok(count) => Ok(count),
        Err(error) if error.contains("no such table: GameSearchIndex") => {
            load_count(SearchMode::Like, filters_for_retry)
        }
        Err(error) => Err(error),
    }
}

#[tauri::command]
pub async fn get_game_extras(game_id: String) -> Result<Vec<ExtraRow>, String> {
    let conn = open_db_connection("DB error")?;
    let mut stmt = conn
        .prepare(
            "SELECT EX_Id, Name, Path, Type FROM Extras WHERE GA_Id = ? ORDER BY DisplayOrder ASC",
        )
        .map_err(|e| e.to_string())?;

    let extra_iter = stmt
        .query_map([game_id], |row| {
            Ok(ExtraRow {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                extra_type: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

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
    let conn = open_db_connection("DB error")?;
    conn.execute(
        "INSERT OR REPLACE INTO SecureSettings (key, value) VALUES (?1, ?2)",
        params![key, encrypted],
    )
    .map_err(|e: rusqlite::Error| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_secure_setting(key: String) -> Result<Option<String>, String> {
    init_secure_table()?;
    let conn = open_db_connection("DB error")?;
    let mut stmt = conn
        .prepare("SELECT value FROM SecureSettings WHERE key = ?1")
        .map_err(|e: rusqlite::Error| e.to_string())?;
    let encrypted: Option<String> = stmt
        .query_row([key], |row| row.get(0))
        .optional()
        .map_err(|e: rusqlite::Error| e.to_string())?;

    match encrypted {
        Some(enc) => Ok(Some(decrypt_value(&enc)?)),
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_build_game_query_search_and_favorites() {
        let filters = GameFilters {
            search_query: Some("Ejber".to_string()),
            favorite_ids: Some(vec!["7933".to_string(), "4100".to_string()]),
            ..Default::default()
        };

        let (query, params) =
            build_game_query(25, 10, Some(filters), SearchMode::Fts).expect("query should build");
        assert!(query.contains("FROM GameSearchIndex"));
        assert!(query.contains("GameSearchIndex MATCH ?"));
        assert!(query.contains("gv.id IN (?,?)"));
        assert_eq!(params.len(), 5);
        assert_eq!(params[0], "Ejber*");
        assert_eq!(params[1], "7933");
        assert_eq!(params[2], "4100");
        assert_eq!(params[3], "25");
        assert_eq!(params[4], "10");
    }

    #[test]
    fn test_build_fts_match_query_sanitizes_terms() {
        assert_eq!(
            build_fts_match_query("Zak McKracken"),
            Some("Zak* AND McKracken*".to_string())
        );
        assert_eq!(
            build_fts_match_query("I, Ball"),
            Some("I* AND Ball*".to_string())
        );
        assert_eq!(build_fts_match_query("!!!"), None);
    }

    #[test]
    fn test_build_game_query_invalid_fts_input_matches_nothing() {
        let filters = GameFilters {
            search_query: Some("!!!".to_string()),
            ..Default::default()
        };

        let (query, params) =
            build_game_query(10, 0, Some(filters), SearchMode::Fts).expect("query should build");
        assert!(query.contains("AND 1=0"));
        assert_eq!(params, vec!["10".to_string(), "0".to_string()]);
    }

    #[test]
    fn test_build_game_query_empty_favorites_short_circuit() {
        let filters = GameFilters {
            favorite_ids: Some(vec![]),
            ..Default::default()
        };

        assert!(build_game_query(10, 0, Some(filters), SearchMode::Fts).is_none());
    }

    #[test]
    fn test_build_game_query_like_fallback_uses_legacy_predicates() {
        let filters = GameFilters {
            search_query: Some("Ejber".to_string()),
            ..Default::default()
        };

        let (query, params) =
            build_game_query(10, 0, Some(filters), SearchMode::Like).expect("query should build");
        assert!(query.contains("LOWER(gv.name) LIKE ?"));
        assert!(query.contains("LOWER(COALESCE(ar.Artist, '')) LIKE ?"));
        assert_eq!(params.len(), 8);
        assert_eq!(params[0], "%ejber%");
    }

    #[tokio::test]
    async fn test_secure_settings_roundtrip() {
        // Create a temporary file for the database
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();

        // Use the environment variable to point to our temp DB
        std::env::set_var("VIC40_DB_PATH", &db_path);

        save_secure_setting("test_key".to_string(), "test_password".to_string())
            .await
            .expect("Failed to save");
        let val = get_secure_setting("test_key".to_string())
            .await
            .expect("Failed to get");

        assert_eq!(val, Some("test_password".to_string()));

        // Test missing key
        let missing = get_secure_setting("unknown".to_string())
            .await
            .expect("Failed to get unknown");
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
            conn.execute("CREATE TABLE GameView (parentGenre TEXT)", [])
                .unwrap();
            conn.execute("INSERT INTO GameView (parentGenre) VALUES (?)", ["Action"])
                .unwrap();
            conn.execute("INSERT INTO GameView (parentGenre) VALUES (?)", ["Puzzle"])
                .unwrap();
            conn.execute("INSERT INTO GameView (parentGenre) VALUES (?)", [""])
                .unwrap(); // Should be filtered
        }

        let genres = get_genres().await.expect("Failed to get genres");
        assert_eq!(genres.len(), 2);
        assert!(genres.contains(&"Action".to_string()));
        assert!(genres.contains(&"Puzzle".to_string()));

        std::env::remove_var("VIC40_DB_PATH");
    }

    #[tokio::test]
    async fn test_get_sub_genres() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);

        {
            let conn = Connection::open(&db_path).unwrap();
            conn.execute("CREATE TABLE GameView (parentGenre TEXT, subGenre TEXT)", [])
                .unwrap();
            conn.execute(
                "INSERT INTO GameView (parentGenre, subGenre) VALUES (?, ?)",
                ["Platform", "Arcade"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO GameView (parentGenre, subGenre) VALUES (?, ?)",
                ["Platform", "Collect'em Up"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO GameView (parentGenre, subGenre) VALUES (?, ?)",
                ["Shoot'em Up", "Vertical"],
            )
            .unwrap();
        }

        let platform_sub_genres = get_sub_genres(Some("Platform".to_string()))
            .await
            .expect("Failed to get sub-genres");
        assert_eq!(platform_sub_genres.len(), 2);
        assert!(platform_sub_genres.contains(&"Arcade".to_string()));
        assert!(platform_sub_genres.contains(&"Collect'em Up".to_string()));

        let no_filter_sub_genres = get_sub_genres(None)
            .await
            .expect("Failed to get sub-genres without a genre");
        assert!(no_filter_sub_genres.is_empty());

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

        let extras = get_game_extras("game1".to_string())
            .await
            .expect("Failed to get extras");
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
            conn.execute("CREATE TABLE Games (GA_Id TEXT, Name TEXT, MU_Id TEXT, PR_Id TEXT, AR_Id TEXT, CR_Id TEXT, DE_Id TEXT, Adult TEXT, Control TEXT, PlayersFrom TEXT, PlayersTo TEXT, PlayersSim TEXT, Comment TEXT, ReviewRating TEXT, V_Trainers TEXT, V_Length TEXT, V_LoadingScreen TEXT, V_HighScoreSaver TEXT, V_IncludedDocs TEXT, V_TrueDriveEmu TEXT, V_PalNTSC TEXT, MemoText TEXT)", []).unwrap();
            conn.execute("CREATE TABLE GameView (id TEXT, name TEXT, filename TEXT, gameFilename TEXT, screenshotFilename TEXT, boxFrontFilename TEXT, titlescreenFilename TEXT, videoSnapFilename TEXT, sidFilename TEXT, crc TEXT, year TEXT, isPal INTEGER, isNtsc INTEGER, trueDriveEmu INTEGER, isClassic INTEGER, parentGenre TEXT, subGenre TEXT, developer_name TEXT, publisher_name TEXT, musician_name TEXT, languages TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Musicians (MU_Id TEXT, Photo TEXT, Nick TEXT, Grp TEXT, Musician TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Programmers (PR_Id TEXT, Programmer TEXT)", [])
                .unwrap();
            conn.execute("CREATE TABLE Artists (AR_Id TEXT, Artist TEXT)", [])
                .unwrap();
            conn.execute("CREATE TABLE Developers (DE_Id TEXT, Developer TEXT)", [])
                .unwrap();
            conn.execute("CREATE TABLE Extras (GA_Id TEXT, Path TEXT)", [])
                .unwrap();

            conn.execute(
                "INSERT INTO Artists (AR_Id, Artist) VALUES (?, ?)",
                ["gfx1", "Ejber Ozkan"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO Programmers (PR_Id, Programmer) VALUES (?, ?)",
                ["coder1", "Chris Programmer"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO Games (GA_Id, Name, AR_Id, PR_Id, Adult) VALUES (?, ?, ?, ?, ?)",
                ["1", "Maniac Mansion", "gfx1", "coder1", "False"],
            )
            .unwrap();
            conn.execute("INSERT INTO GameView (id, name, filename, parentGenre, subGenre, isPal, isNtsc, trueDriveEmu, isClassic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                rusqlite::params!["1", "Maniac Mansion", "maniac.d64", "Action", "Adventure", 1, 0, 0, 1]).unwrap();
        }

        let games = get_db_games(Some(10), Some(0), None)
            .await
            .expect("Failed basic fetch");
        assert_eq!(games.len(), 1);
        assert_eq!(games[0].name, "Maniac Mansion");

        // Test letter filter
        let filters_m = GameFilters {
            letter: Some("M".to_string()),
            ..Default::default()
        };
        let res_m = get_db_games(Some(10), Some(0), Some(filters_m))
            .await
            .unwrap();
        assert_eq!(res_m.len(), 1);

        let filters_z = GameFilters {
            letter: Some("Z".to_string()),
            ..Default::default()
        };
        let res_z = get_db_games(Some(10), Some(0), Some(filters_z))
            .await
            .unwrap();
        assert_eq!(res_z.len(), 0);

        // Test search
        let filters_sq = GameFilters {
            search_query: Some("Maniac".to_string()),
            ..Default::default()
        };
        let res_sq = get_db_games(Some(10), Some(0), Some(filters_sq))
            .await
            .unwrap();
        assert_eq!(res_sq.len(), 1);

        let filters_graphics = GameFilters {
            search_query: Some("Ejber".to_string()),
            ..Default::default()
        };
        let res_graphics = get_db_games(Some(10), Some(0), Some(filters_graphics))
            .await
            .unwrap();
        assert_eq!(res_graphics.len(), 1);

        let filters_programmer = GameFilters {
            search_query: Some("Programmer".to_string()),
            ..Default::default()
        };
        let res_programmer = get_db_games(Some(10), Some(0), Some(filters_programmer))
            .await
            .unwrap();
        assert_eq!(res_programmer.len(), 1);

        // Test hide adult
        let filters_adult = GameFilters {
            hide_adult: Some(true),
            ..Default::default()
        };
        let res_adult = get_db_games(Some(10), Some(0), Some(filters_adult))
            .await
            .unwrap();
        assert_eq!(res_adult.len(), 1);

        let filters_sub_genre = GameFilters {
            genre: Some("Action".to_string()),
            sub_genre: Some("Adventure".to_string()),
            ..Default::default()
        };
        let res_sub_genre = get_db_games(Some(10), Some(0), Some(filters_sub_genre))
            .await
            .unwrap();
        assert_eq!(res_sub_genre.len(), 1);

        std::env::remove_var("VIC40_DB_PATH");
    }

    #[tokio::test]
    async fn test_get_db_games_symbol_filter() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);

        {
            let conn = Connection::open(&db_path).unwrap();
            conn.execute("CREATE TABLE Games (GA_Id TEXT, Name TEXT, MU_Id TEXT, PR_Id TEXT, AR_Id TEXT, CR_Id TEXT, DE_Id TEXT, Adult TEXT, Control TEXT, PlayersFrom TEXT, PlayersTo TEXT, PlayersSim TEXT, Comment TEXT, ReviewRating TEXT, V_Trainers TEXT, V_Length TEXT, V_LoadingScreen TEXT, V_HighScoreSaver TEXT, V_IncludedDocs TEXT, V_TrueDriveEmu TEXT, V_PalNTSC TEXT, MemoText TEXT)", []).unwrap();
            conn.execute("CREATE TABLE GameView (id TEXT, name TEXT, filename TEXT, gameFilename TEXT, screenshotFilename TEXT, boxFrontFilename TEXT, titlescreenFilename TEXT, videoSnapFilename TEXT, sidFilename TEXT, crc TEXT, year TEXT, isPal INTEGER, isNtsc INTEGER, trueDriveEmu INTEGER, isClassic INTEGER, parentGenre TEXT, subGenre TEXT, developer_name TEXT, publisher_name TEXT, musician_name TEXT, languages TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Musicians (MU_Id TEXT, Photo TEXT, Nick TEXT, Grp TEXT, Musician TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Programmers (PR_Id TEXT, Programmer TEXT)", [])
                .unwrap();
            conn.execute("CREATE TABLE Artists (AR_Id TEXT, Artist TEXT)", [])
                .unwrap();
            conn.execute("CREATE TABLE Developers (DE_Id TEXT, Developer TEXT)", [])
                .unwrap();
            conn.execute("CREATE TABLE Extras (GA_Id TEXT, Path TEXT)", [])
                .unwrap();

            conn.execute(
                "INSERT INTO Games (GA_Id, Name, Adult) VALUES (?, ?, ?)",
                ["1", "1942", "False"],
            )
            .unwrap();
            conn.execute("INSERT INTO GameView (id, name, filename, parentGenre, subGenre, isPal, isNtsc, trueDriveEmu, isClassic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                rusqlite::params!["1", "1942", "1942.d64", "Action", "Shooter", 1, 0, 0, 1]).unwrap();
        }

        let filters = GameFilters {
            letter: Some("#".to_string()),
            ..Default::default()
        };
        let res = get_db_games(Some(10), Some(0), Some(filters))
            .await
            .unwrap();
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
            conn.execute("CREATE TABLE Games (GA_Id TEXT, Name TEXT, MU_Id TEXT, PR_Id TEXT, AR_Id TEXT, CR_Id TEXT, DE_Id TEXT, Adult TEXT, Control TEXT, PlayersFrom TEXT, PlayersTo TEXT, PlayersSim TEXT, Comment TEXT, ReviewRating TEXT, V_Trainers TEXT, V_Length TEXT, V_LoadingScreen TEXT, V_HighScoreSaver TEXT, V_IncludedDocs TEXT, V_TrueDriveEmu TEXT, V_PalNTSC TEXT, MemoText TEXT)", []).unwrap();
            conn.execute("CREATE TABLE GameView (id TEXT, name TEXT, filename TEXT, gameFilename TEXT, screenshotFilename TEXT, boxFrontFilename TEXT, titlescreenFilename TEXT, videoSnapFilename TEXT, sidFilename TEXT, crc TEXT, year TEXT, isPal INTEGER, isNtsc INTEGER, trueDriveEmu INTEGER, isClassic INTEGER, parentGenre TEXT, subGenre TEXT, developer_name TEXT, publisher_name HEX, musician_name TEXT, languages TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Musicians (MU_Id TEXT, Photo TEXT, Nick TEXT, Grp TEXT, Musician TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Programmers (PR_Id TEXT, Programmer TEXT)", [])
                .unwrap();
            conn.execute("CREATE TABLE Artists (AR_Id TEXT, Artist TEXT)", [])
                .unwrap();
            conn.execute("CREATE TABLE Developers (DE_Id TEXT, Developer TEXT)", [])
                .unwrap();
            conn.execute("CREATE TABLE Extras (GA_Id TEXT, Path TEXT)", [])
                .unwrap();

            for i in 1..=5 {
                let id = i.to_string();
                conn.execute(
                    "INSERT INTO Games (GA_Id, Name, Adult) VALUES (?, ?, ?)",
                    [&id, &format!("Game {}", i), "False"],
                )
                .unwrap();
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

    #[tokio::test]
    async fn test_get_db_game_count() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);

        {
            let conn = Connection::open(&db_path).unwrap();
            conn.execute("CREATE TABLE Games (GA_Id TEXT, Name TEXT, MU_Id TEXT, PR_Id TEXT, AR_Id TEXT, CR_Id TEXT, DE_Id TEXT, Adult TEXT, Control TEXT, PlayersFrom TEXT, PlayersTo TEXT, PlayersSim TEXT, Comment TEXT, ReviewRating TEXT, V_Trainers TEXT, V_Length TEXT, V_LoadingScreen TEXT, V_HighScoreSaver TEXT, V_IncludedDocs TEXT, V_TrueDriveEmu TEXT, V_PalNTSC TEXT, MemoText TEXT)", []).unwrap();
            conn.execute("CREATE TABLE GameView (id TEXT, name TEXT, filename TEXT, gameFilename TEXT, screenshotFilename TEXT, boxFrontFilename TEXT, titlescreenFilename TEXT, videoSnapFilename TEXT, sidFilename TEXT, crc TEXT, year TEXT, isPal INTEGER, isNtsc INTEGER, trueDriveEmu INTEGER, isClassic INTEGER, parentGenre TEXT, subGenre TEXT, developer_name TEXT, publisher_name TEXT, musician_name TEXT, languages TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Musicians (MU_Id TEXT, Photo TEXT, Nick TEXT, Grp TEXT, Musician TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Programmers (PR_Id TEXT, Programmer TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Artists (AR_Id TEXT, Artist TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Developers (DE_Id TEXT, Developer TEXT)", []).unwrap();
            conn.execute("CREATE TABLE Extras (GA_Id TEXT, Path TEXT)", []).unwrap();

            conn.execute(
                "INSERT INTO Games (GA_Id, Name, Adult) VALUES (?, ?, ?)",
                ["1", "Alpha Mission", "False"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO Games (GA_Id, Name, Adult) VALUES (?, ?, ?)",
                ["2", "Bubble Bobble", "False"],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO Games (GA_Id, Name, Adult) VALUES (?, ?, ?)",
                ["3", "California Games", "False"],
            )
            .unwrap();

            conn.execute("INSERT INTO GameView (id, name, filename, parentGenre, subGenre, isPal, isNtsc, trueDriveEmu, isClassic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rusqlite::params!["1", "Alpha Mission", "alpha.d64", "Shoot'em Up", "Vertical", 1, 0, 0, 0]).unwrap();
            conn.execute("INSERT INTO GameView (id, name, filename, parentGenre, subGenre, isPal, isNtsc, trueDriveEmu, isClassic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rusqlite::params!["2", "Bubble Bobble", "bubble.d64", "Platform", "Arcade", 1, 0, 0, 0]).unwrap();
            conn.execute("INSERT INTO GameView (id, name, filename, parentGenre, subGenre, isPal, isNtsc, trueDriveEmu, isClassic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rusqlite::params!["3", "California Games", "california.d64", "Sports", "Misc", 1, 0, 0, 0]).unwrap();
        }

        let total = get_db_game_count(None).await.unwrap();
        assert_eq!(total, 3);

        let genre_filtered = get_db_game_count(Some(GameFilters {
            genre: Some("Platform".to_string()),
            ..Default::default()
        }))
        .await
        .unwrap();
        assert_eq!(genre_filtered, 1);

        let search_filtered = get_db_game_count(Some(GameFilters {
            search_query: Some("California".to_string()),
            ..Default::default()
        }))
        .await
        .unwrap();
        assert_eq!(search_filtered, 1);

        let sub_genre_filtered = get_db_game_count(Some(GameFilters {
            genre: Some("Platform".to_string()),
            sub_genre: Some("Arcade".to_string()),
            ..Default::default()
        }))
        .await
        .unwrap();
        assert_eq!(sub_genre_filtered, 1);

        std::env::remove_var("VIC40_DB_PATH");
    }
}

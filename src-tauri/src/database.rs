use rusqlite::{Connection, OptionalExtension};
use std::path::Path;

const QUERY_SUPPORT_INDEXES: &[(&str, &[&str], &str)] = &[
    (
        "Games",
        &["GA_Id"],
        "CREATE INDEX IF NOT EXISTS idx_games_ga_id ON Games(GA_Id)",
    ),
    (
        "Games",
        &["Name"],
        "CREATE INDEX IF NOT EXISTS idx_games_name_nocase ON Games(Name COLLATE NOCASE)",
    ),
    (
        "Games",
        &["YE_Id"],
        "CREATE INDEX IF NOT EXISTS idx_games_ye_id ON Games(YE_Id)",
    ),
    (
        "Games",
        &["GE_Id"],
        "CREATE INDEX IF NOT EXISTS idx_games_ge_id ON Games(GE_Id)",
    ),
    (
        "Games",
        &["DE_Id"],
        "CREATE INDEX IF NOT EXISTS idx_games_de_id ON Games(DE_Id)",
    ),
    (
        "Games",
        &["PU_Id"],
        "CREATE INDEX IF NOT EXISTS idx_games_pu_id ON Games(PU_Id)",
    ),
    (
        "Games",
        &["MU_Id"],
        "CREATE INDEX IF NOT EXISTS idx_games_mu_id ON Games(MU_Id)",
    ),
    (
        "Games",
        &["LA_Id"],
        "CREATE INDEX IF NOT EXISTS idx_games_la_id ON Games(LA_Id)",
    ),
    (
        "Games",
        &["PR_Id"],
        "CREATE INDEX IF NOT EXISTS idx_games_pr_id ON Games(PR_Id)",
    ),
    (
        "Games",
        &["AR_Id"],
        "CREATE INDEX IF NOT EXISTS idx_games_ar_id ON Games(AR_Id)",
    ),
    (
        "Games",
        &["Classic"],
        "CREATE INDEX IF NOT EXISTS idx_games_classic ON Games(Classic)",
    ),
    (
        "Games",
        &["Adult"],
        "CREATE INDEX IF NOT EXISTS idx_games_adult ON Games(Adult)",
    ),
    (
        "Years",
        &["YE_Id"],
        "CREATE INDEX IF NOT EXISTS idx_years_ye_id ON Years(YE_Id)",
    ),
    (
        "Genres",
        &["GE_Id"],
        "CREATE INDEX IF NOT EXISTS idx_genres_ge_id ON Genres(GE_Id)",
    ),
    (
        "Genres",
        &["PG_Id"],
        "CREATE INDEX IF NOT EXISTS idx_genres_pg_id ON Genres(PG_Id)",
    ),
    (
        "PGenres",
        &["PG_Id"],
        "CREATE INDEX IF NOT EXISTS idx_pgenres_pg_id ON PGenres(PG_Id)",
    ),
    (
        "Developers",
        &["DE_Id"],
        "CREATE INDEX IF NOT EXISTS idx_developers_de_id ON Developers(DE_Id)",
    ),
    (
        "Publishers",
        &["PU_Id"],
        "CREATE INDEX IF NOT EXISTS idx_publishers_pu_id ON Publishers(PU_Id)",
    ),
    (
        "Musicians",
        &["MU_Id"],
        "CREATE INDEX IF NOT EXISTS idx_musicians_mu_id ON Musicians(MU_Id)",
    ),
    (
        "Languages",
        &["LA_Id"],
        "CREATE INDEX IF NOT EXISTS idx_languages_la_id ON Languages(LA_Id)",
    ),
    (
        "Programmers",
        &["PR_Id"],
        "CREATE INDEX IF NOT EXISTS idx_programmers_pr_id ON Programmers(PR_Id)",
    ),
    (
        "Artists",
        &["AR_Id"],
        "CREATE INDEX IF NOT EXISTS idx_artists_ar_id ON Artists(AR_Id)",
    ),
    (
        "Extras",
        &["GA_Id"],
        "CREATE INDEX IF NOT EXISTS idx_extras_ga_id ON Extras(GA_Id)",
    ),
    (
        "Extras",
        &["GA_Id", "DisplayOrder"],
        "CREATE INDEX IF NOT EXISTS idx_extras_ga_id_display_order ON Extras(GA_Id, DisplayOrder)",
    ),
];

const COVER_INDEX_POPULATE_SQL: &str = "
    INSERT OR REPLACE INTO GameCoverIndex (GA_Id, cover_path)
    SELECT
        GA_Id,
        MIN(Path) as cover_path
    FROM Extras
    WHERE LOWER(REPLACE(Path, '\\', '/')) LIKE 'cover/%'
      AND (
          LOWER(Path) LIKE '%.jpg'
          OR LOWER(Path) LIKE '%.jpeg'
          OR LOWER(Path) LIKE '%.png'
          OR LOWER(Path) LIKE '%.webp'
          OR LOWER(Path) LIKE '%.gif'
          OR LOWER(Path) LIKE '%.bmp'
      )
    GROUP BY GA_Id
";

const FTS_INDEX_POPULATE_SQL: &str = "
    INSERT INTO GameSearchIndex (
        id,
        name,
        developer_name,
        publisher_name,
        musician_name,
        coder_name,
        graphics_name
    )
    SELECT
        gv.id,
        gv.name,
        COALESCE(gv.developer_name, ''),
        COALESCE(gv.publisher_name, ''),
        COALESCE(gv.musician_name, ''),
        COALESCE(pr.Programmer, ''),
        COALESCE(ar.Artist, '')
    FROM GameView gv
    JOIN Games g ON gv.id = g.GA_Id
    LEFT JOIN Programmers pr ON g.PR_Id = pr.PR_Id
    LEFT JOIN Artists ar ON g.AR_Id = ar.AR_Id
";

pub fn get_db_path() -> String {
    std::env::var("VIC40_DB_PATH").unwrap_or_else(|_| {
        if Path::new("../gb64.sqlite").exists() {
            "../gb64.sqlite".to_string()
        } else if Path::new("gb64.sqlite").exists() {
            "gb64.sqlite".to_string()
        } else {
            "../../gb64.sqlite".to_string()
        }
    })
}

fn table_exists(conn: &Connection, table_name: &str) -> Result<bool, String> {
    conn.query_row(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1 LIMIT 1",
        [table_name],
        |_| Ok(()),
    )
    .optional()
    .map(|row| row.is_some())
    .map_err(|e| e.to_string())
}

fn table_has_columns(
    conn: &Connection,
    table_name: &str,
    required_columns: &[&str],
) -> Result<bool, String> {
    let pragma = format!("PRAGMA table_info('{table_name}')");
    let mut stmt = conn.prepare(&pragma).map_err(|e| e.to_string())?;
    let columns: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(required_columns
        .iter()
        .all(|required| columns.iter().any(|column| column == required)))
}

fn ensure_secure_table_on_connection(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS SecureSettings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn ensure_query_indexes(conn: &Connection) -> Result<(), String> {
    for (table_name, required_columns, index_sql) in QUERY_SUPPORT_INDEXES {
        if table_exists(conn, table_name)? && table_has_columns(conn, table_name, required_columns)?
        {
            conn.execute(index_sql, []).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn ensure_cover_index(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS GameCoverIndex (
            GA_Id TEXT PRIMARY KEY,
            cover_path TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_game_cover_index_ga_id ON GameCoverIndex(GA_Id)",
        [],
    )
    .map_err(|e| e.to_string())?;

    if !table_exists(conn, "Extras")? {
        return Ok(());
    }

    let cover_rows: i64 = conn
        .query_row("SELECT COUNT(*) FROM GameCoverIndex", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if cover_rows == 0 {
        conn.execute(COVER_INDEX_POPULATE_SQL, [])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn ensure_search_index(conn: &Connection) -> Result<(), String> {
    let can_build_search_index = table_exists(conn, "GameView")?
        && table_has_columns(
            conn,
            "GameView",
            &[
                "id",
                "name",
                "developer_name",
                "publisher_name",
                "musician_name",
            ],
        )?
        && table_exists(conn, "Games")?
        && table_has_columns(conn, "Games", &["GA_Id"])?;

    if !can_build_search_index {
        return Ok(());
    }

    conn.execute_batch(
        "
        CREATE VIRTUAL TABLE IF NOT EXISTS GameSearchIndex USING fts5(
            id UNINDEXED,
            name,
            developer_name,
            publisher_name,
            musician_name,
            coder_name,
            graphics_name,
            tokenize='porter unicode61 remove_diacritics 2',
            prefix='2,3'
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    let search_rows: i64 = conn
        .query_row("SELECT COUNT(*) FROM GameSearchIndex", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if search_rows == 0 {
        conn.execute("DELETE FROM GameSearchIndex", [])
            .map_err(|e| e.to_string())?;
        conn.execute(FTS_INDEX_POPULATE_SQL, [])
            .map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO GameSearchIndex(GameSearchIndex) VALUES('optimize')",
            [],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub fn ensure_query_support_objects(conn: &Connection) -> Result<(), String> {
    ensure_query_indexes(conn)?;
    ensure_cover_index(conn)?;
    ensure_search_index(conn)?;
    Ok(())
}

pub fn init_database() -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    ensure_query_support_objects(&conn)?;
    ensure_secure_table_on_connection(&conn)?;
    Ok(())
}

pub fn init_secure_table() -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    ensure_secure_table_on_connection(&conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::{tempdir, NamedTempFile};

    #[test]
    fn test_init_secure_table() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);

        init_secure_table().expect("Failed to init table");

        let conn = Connection::open(&db_path).unwrap();
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='SecureSettings'")
            .unwrap();
        let exists: bool = stmt.exists([]).unwrap();
        assert!(exists);

        std::env::remove_var("VIC40_DB_PATH");
    }

    #[test]
    fn test_get_db_path_prefers_environment_variable() {
        std::env::set_var("VIC40_DB_PATH", "custom.sqlite");
        assert_eq!(get_db_path(), "custom.sqlite");
        std::env::remove_var("VIC40_DB_PATH");
    }

    #[test]
    fn test_get_db_path_falls_back_to_local_files() {
        let temp_dir = tempdir().unwrap();
        let original_dir = std::env::current_dir().unwrap();
        let child_dir = temp_dir.path().join("workspace");
        std::fs::create_dir_all(&child_dir).unwrap();
        std::env::set_current_dir(&child_dir).unwrap();

        std::fs::write("gb64.sqlite", b"db").unwrap();
        assert_eq!(get_db_path(), "gb64.sqlite");

        std::fs::remove_file("gb64.sqlite").unwrap();
        std::fs::write("../gb64.sqlite", b"db").unwrap();
        assert_eq!(get_db_path(), "../gb64.sqlite");

        std::env::set_current_dir(original_dir).unwrap();
    }

    #[test]
    fn test_init_database_creates_cover_index_and_query_indexes() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);

        let conn = Connection::open(&db_path).unwrap();
        conn.execute("CREATE TABLE Games (GA_Id TEXT, Name TEXT, GE_Id TEXT, PR_Id TEXT, AR_Id TEXT, MU_Id TEXT, DE_Id TEXT, PU_Id TEXT, LA_Id TEXT, YE_Id TEXT, Classic TEXT, Adult TEXT)", []).unwrap();
        conn.execute(
            "CREATE TABLE GameView (id TEXT, name TEXT, developer_name TEXT, publisher_name TEXT, musician_name TEXT)",
            [],
        )
        .unwrap();
        conn.execute("CREATE TABLE Programmers (PR_Id TEXT, Programmer TEXT)", [])
            .unwrap();
        conn.execute("CREATE TABLE Artists (AR_Id TEXT, Artist TEXT)", [])
            .unwrap();
        conn.execute(
            "CREATE TABLE Extras (GA_Id TEXT, Path TEXT, DisplayOrder TEXT)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO Extras (GA_Id, Path, DisplayOrder) VALUES (?1, ?2, ?3)",
            ["1", "Cover/Test Cover.png", "1"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO Programmers (PR_Id, Programmer) VALUES (?1, ?2)",
            ["pr1", "Chris Yates"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO Artists (AR_Id, Artist) VALUES (?1, ?2)",
            ["ar1", "Ejber Ozkan"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO Games (GA_Id, Name, PR_Id, AR_Id) VALUES (?1, ?2, ?3, ?4)",
            ["1", "Tiger Heli", "pr1", "ar1"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO GameView (id, name, developer_name, publisher_name, musician_name) VALUES (?1, ?2, ?3, ?4, ?5)",
            ["1", "Tiger Heli", "SEUCK", "", ""],
        )
        .unwrap();
        drop(conn);

        init_database().expect("init_database should succeed");

        let conn = Connection::open(&db_path).unwrap();
        let cover: String = conn
            .query_row(
                "SELECT cover_path FROM GameCoverIndex WHERE GA_Id = ?1",
                ["1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(cover, "Cover/Test Cover.png");

        let games_indexes: Vec<String> = conn
            .prepare("PRAGMA index_list('Games')")
            .unwrap()
            .query_map([], |row| row.get(1))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert!(games_indexes.contains(&"idx_games_ga_id".to_string()));
        assert!(games_indexes.contains(&"idx_games_name_nocase".to_string()));

        let search_hit: String = conn
            .query_row(
                "SELECT id FROM GameSearchIndex WHERE GameSearchIndex MATCH ?1 LIMIT 1",
                ["ejber*"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(search_hit, "1");

        std::env::remove_var("VIC40_DB_PATH");
    }
}

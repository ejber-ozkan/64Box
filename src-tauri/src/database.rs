use rusqlite::Connection;
use std::path::Path;

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

pub fn init_secure_table() -> Result<(), String> {
    let conn = Connection::open(get_db_path()).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS SecureSettings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_init_secure_table() {
        let temp_db = NamedTempFile::new().unwrap();
        let db_path = temp_db.path().to_string_lossy().to_string();
        std::env::set_var("VIC40_DB_PATH", &db_path);
        
        init_secure_table().expect("Failed to init table");
        
        let conn = Connection::open(&db_path).unwrap();
        let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='SecureSettings'").unwrap();
        let exists: bool = stmt.exists([]).unwrap();
        assert!(exists);

        std::env::remove_var("VIC40_DB_PATH");
    }
}

use crate::database::{
    configure_runtime_db_path, get_db_path, import_mdb_to_sqlite, is_database_ready,
};
use crate::models::{DatabaseBootstrapStatus, DatabaseImportResult};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn open_mdb_file_dialog(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .add_filter("GameBase MDB", &["mdb"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file()
        .map(|path| path.to_string())
}

#[tauri::command]
pub fn get_database_bootstrap_status(app: tauri::AppHandle) -> Result<DatabaseBootstrapStatus, String> {
    let _ = configure_runtime_db_path(&app)?;
    let db_path = get_db_path();
    let ready = is_database_ready()?;
    Ok(DatabaseBootstrapStatus {
        ready,
        db_path,
        reason: if ready {
            None
        } else {
            Some("GB64 database is missing or has not been imported yet.".to_string())
        },
    })
}

#[tauri::command]
pub fn import_database_from_mdb(
    app: tauri::AppHandle,
    mdb_path: String,
) -> Result<DatabaseImportResult, String> {
    let _ = configure_runtime_db_path(&app)?;
    import_mdb_to_sqlite(&mdb_path)
}

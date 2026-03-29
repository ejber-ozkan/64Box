pub mod commands;
pub mod database;
pub mod models;
pub mod security;

// ---------------------------------------------------------------------------
// Application entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::files::scan_rom_directory,
            commands::emulator::launch_emulator,
            commands::files::download_media_asset,
            commands::files::read_file_bytes,
            commands::files::resolve_media_path,
            commands::files::find_all_media_variants,
            commands::system::open_directory_dialog,
            commands::system::open_file_dialog,
            commands::system::open_path_with_system_default,
            commands::system::exit_app,
            commands::system::set_window_mode,
            commands::system::get_window_size,
            commands::db::get_db_games,
            commands::db::get_db_game_count,
            commands::db::get_genres,
            commands::db::get_sub_genres,
            commands::db::get_game_extras,
            commands::db::save_secure_setting,
            commands::db::get_secure_setting,
            commands::setup::open_mdb_file_dialog,
            commands::setup::get_database_bootstrap_status,
            commands::setup::import_database_from_mdb,
        ])
        .setup(|app| {
            let _ = database::configure_runtime_db_path(app.handle());
            let _ = database::init_database();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running 64Box");
}

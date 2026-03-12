pub mod models;
pub mod security;
pub mod database;
pub mod commands;

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
            commands::system::exit_app,
            commands::system::set_window_mode,
            commands::system::get_window_size,
            commands::db::get_db_games,
            commands::db::get_genres,
            commands::db::get_game_extras,
            commands::db::save_secure_setting,
            commands::db::get_secure_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running 64Box");
}

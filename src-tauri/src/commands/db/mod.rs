mod games;
mod querying;
mod secure_settings;

use crate::models::{ExtraRow, GameFilters, GameRow};

#[tauri::command]
pub async fn get_genres() -> Result<Vec<String>, String> {
    games::get_genres().await
}

#[tauri::command]
pub async fn get_sub_genres(genre: Option<String>) -> Result<Vec<String>, String> {
    games::get_sub_genres(genre).await
}

#[tauri::command]
pub async fn get_db_games(
    limit: Option<usize>,
    offset: Option<usize>,
    filters: Option<GameFilters>,
) -> Result<Vec<GameRow>, String> {
    games::get_db_games(limit, offset, filters).await
}

#[tauri::command]
pub async fn get_game_detail(game_id: String) -> Result<Option<crate::models::GameDetailRow>, String> {
    games::get_game_detail(game_id).await
}

#[tauri::command]
pub async fn get_db_game_count(filters: Option<GameFilters>) -> Result<usize, String> {
    games::get_db_game_count(filters).await
}

#[tauri::command]
pub async fn get_game_extras(game_id: String) -> Result<Vec<ExtraRow>, String> {
    games::get_game_extras(game_id).await
}

#[tauri::command]
pub async fn save_secure_setting(key: String, value: String) -> Result<(), String> {
    secure_settings::save_secure_setting(key, value).await
}

#[tauri::command]
pub async fn get_secure_setting(key: String) -> Result<Option<String>, String> {
    secure_settings::get_secure_setting(key).await
}

#[cfg(test)]
mod tests;

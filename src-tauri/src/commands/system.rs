use tauri_plugin_dialog::DialogExt;
use tauri::Manager;

#[tauri::command]
pub async fn open_directory_dialog(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .map(|p| p.to_string())
}

#[tauri::command]
pub async fn open_file_dialog(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .add_filter("Executables", &["exe", "app", "bin", "sh"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file()
        .map(|p| p.to_string())
}

#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub async fn set_window_mode(app: tauri::AppHandle, fullscreen: bool, width: Option<f64>, height: Option<f64>) -> Result<(), String> {
    let window = app.get_webview_window("main")
        .or_else(|| app.webview_windows().values().next().cloned())
        .ok_or("No application window found")?;
    
    if fullscreen {
        window.set_fullscreen(true).map_err(|e| e.to_string())?;
    } else {
        window.set_fullscreen(false).map_err(|e| e.to_string())?;
        
        if let (Some(w), Some(h)) = (width, height) {
            window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: w, height: h }))
                .map_err(|e| e.to_string())?;
            window.center().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[derive(serde::Serialize)]
pub struct WindowSize {
    pub width: f64,
    pub height: f64,
}

#[tauri::command]
pub async fn get_window_size(app: tauri::AppHandle) -> Result<WindowSize, String> {
    let window = app.get_webview_window("main")
        .or_else(|| app.webview_windows().values().next().cloned())
        .ok_or("No application window found")?;
    
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let logical = size.to_logical::<f64>(window.scale_factor().map_err(|e| e.to_string())?);
    
    Ok(WindowSize {
        width: logical.width,
        height: logical.height,
    })
}

use super::{
    get_active_platform, get_platform_import_status_sync, get_supported_platforms,
    set_active_platform,
};

#[tokio::test]
async fn test_get_supported_platforms_includes_atari800_capabilities() {
    let platforms = get_supported_platforms().await.unwrap();
    let atari800 = platforms
        .iter()
        .find(|platform| platform.id == "atari800")
        .expect("Atari 800 profile should exist");

    assert_eq!(atari800.import_status, "notImported");
    assert_eq!(atari800.capabilities.music, "sap");
    assert!(atari800.folder_types.contains(&"games".to_string()));
    assert!(atari800.folder_types.contains(&"music".to_string()));
    assert!(atari800.folder_types.contains(&"photos".to_string()));
    assert!(atari800.folder_types.contains(&"screenshots".to_string()));
    assert!(atari800
        .supported_emulator_profile_ids
        .contains(&"altirra-atari800".to_string()));
    assert!(atari800
        .capabilities
        .launch_extensions
        .contains(&".xex".to_string()));
}

#[tokio::test]
async fn test_active_platform_defaults_to_c64() {
    let active = get_active_platform().await.unwrap();

    assert_eq!(active.active_platform_id, "c64");
    assert_eq!(active.last_used_platform_id, Some("c64".to_string()));
    assert!(!active.platform_selection_required);
}

#[tokio::test]
async fn test_set_active_platform_routes_unimported_atari800_to_import() {
    let response = set_active_platform("atari800".to_string()).await.unwrap();

    assert_eq!(response.active_platform_id, "atari800");
    assert!(response.requires_import);
    assert!(response.message.contains("imported"));
}

#[test]
fn test_platform_import_status_is_platform_scoped() {
    let status = get_platform_import_status_sync("atari800").unwrap();

    assert_eq!(status.platform_id, "atari800");
    assert_eq!(status.import_status, "notImported");
    assert_eq!(status.game_count, 0);
}

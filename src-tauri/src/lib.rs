#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let clerk_publishable_key = "pk_test_dWx0aW1hdGUtcGVnYXN1cy00MS5jbGVyay5hY2NvdW50cy5kZXYk";

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_clerk::ClerkPluginBuilder::new()
                .publishable_key(clerk_publishable_key)
                .with_tauri_store()
                .build(),
        )
        .setup(|_app| {
            // Updater disabled for now - needs proper configuration
            // #[cfg(desktop)]
            // app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
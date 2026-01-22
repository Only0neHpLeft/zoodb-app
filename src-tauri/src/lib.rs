#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file if present (development mode)
    // In production, set CLERK_PUBLISHABLE_KEY as an environment variable
    let _ = dotenvy::dotenv();

    // Read Clerk publishable key from environment (loaded from .env or system env)
    let clerk_publishable_key = std::env::var("CLERK_PUBLISHABLE_KEY")
        .expect("CLERK_PUBLISHABLE_KEY must be set. Add it to .env file or set as environment variable.");

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
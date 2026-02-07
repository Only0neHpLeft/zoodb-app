#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .menu(|handle| tauri::menu::Menu::default(handle))
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::SIZE,
                )
                .build(),
        )
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                if let Ok(exe) = std::env::current_exe() {
                    if exe.to_string_lossy().starts_with("/Volumes/") {
                        let lang = std::env::var("LANG").unwrap_or_default();
                        let (title, msg) = if lang.starts_with("cs") {
                            (
                                "Zoo DB",
                                "Zoo DB nelze spustit z diskového obrazu.\\n\\nPřetáhněte Zoo DB do složky Aplikace a spusťte ji odtud.",
                            )
                        } else {
                            (
                                "Zoo DB",
                                "Zoo DB cannot run from a disk image.\\n\\nDrag Zoo DB to the Applications folder and launch it from there.",
                            )
                        };
                        let script = format!(
                            "display dialog \"{}\" with title \"{}\" buttons {{\"OK\"}} default button \"OK\" with icon caution",
                            msg, title
                        );
                        let _ = std::process::Command::new("osascript")
                            .args(["-e", &script])
                            .status();
                        std::process::exit(0);
                    }
                }
            }

            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Application configuration module
/// Centralizes all app config including environment-specific values
///
/// Configuration values are loaded from tauri.conf.json (embedded at compile time)
/// with optional .env override for development

use serde::Deserialize;

#[derive(Deserialize)]
struct TauriConfigCustom {
    #[serde(rename = "clerkPublishableKey")]
    clerk_publishable_key: String,
}

#[derive(Deserialize)]
struct TauriConfigRoot {
    _config: TauriConfigCustom,
}

pub struct AppConfig {
    pub clerk_publishable_key: String,
}

impl AppConfig {
    /// Load application configuration
    /// - tauri.conf.json is the single source of truth (embedded at compile time via include_str!)
    /// - Development: .env file can override values for local testing
    pub fn load() -> Self {
        // Embed tauri.conf.json at compile time (Tauri best practice for config)
        const TAURI_CONFIG_JSON: &str = include_str!("../tauri.conf.json");

        // Parse config to extract custom _config section
        let tauri_config: TauriConfigRoot = serde_json::from_str(TAURI_CONFIG_JSON)
            .expect("Failed to parse tauri.conf.json - check _config section syntax");

        // Development mode: allow .env to override for local testing
        // Production mode: always use tauri.conf.json value
        let clerk_publishable_key = if cfg!(debug_assertions) {
            // Try to load .env file (optional in development)
            let _ = dotenvy::dotenv();

            // Check for env var override, fall back to config
            std::env::var("CLERK_PUBLISHABLE_KEY")
                .unwrap_or_else(|_| tauri_config._config.clerk_publishable_key)
        } else {
            // Production: use embedded config value
            tauri_config._config.clerk_publishable_key
        };

        Self {
            clerk_publishable_key,
        }
    }
}

/// Application configuration module
/// Centralizes all app config including environment-specific values
///
/// Configuration values are defined as constants with .env override for development

/// Production Clerk publishable key
/// This is a public key (safe to hardcode)
const CLERK_PUBLISHABLE_KEY: &str = "pk_test_dWx0aW1hdGUtcGVnYXN1cy00MS5jbGVyay5hY2NvdW50cy5kZXYk";

pub struct AppConfig {
    pub clerk_publishable_key: String,
}

impl AppConfig {
    /// Load application configuration
    /// - Production: uses hardcoded constants
    /// - Development: .env file can override values for local testing
    pub fn load() -> Self {
        // Development mode: allow .env to override for local testing
        let clerk_publishable_key = if cfg!(debug_assertions) {
            // Try to load .env file (optional in development)
            let _ = dotenvy::dotenv();

            // Check for env var override, fall back to constant
            std::env::var("CLERK_PUBLISHABLE_KEY")
                .unwrap_or_else(|_| CLERK_PUBLISHABLE_KEY.to_string())
        } else {
            // Production: use hardcoded constant
            CLERK_PUBLISHABLE_KEY.to_string()
        };

        Self {
            clerk_publishable_key,
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:lumio.db",
                    vec![
                        tauri_plugin_sql::Migration {
                            version: 1,
                            description: "create_cache_entries",
                            sql: "CREATE TABLE IF NOT EXISTS cache_entries (
                                book_id TEXT PRIMARY KEY,
                                path TEXT NOT NULL,
                                size INTEGER NOT NULL,
                                last_accessed TEXT NOT NULL,
                                status TEXT NOT NULL
                            );",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                    ],
                )
                .build(),
        )
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                use argon2::{Algorithm, Argon2, Params, Version};
                let mut key = vec![0_u8; 32];
                let params = Params::new(10_000, 10, 4, Some(32)).expect("valid argon2 params");
                let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
                argon
                    .hash_password_into(password.as_bytes(), b"lumio-stronghold-salt", &mut key)
                    .expect("failed to derive stronghold key");
                key
            })
            .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Runtime, Url, plugin::TauriPlugin};

/// True only for LocalKit's own bundled pages. The webview may never leave
/// them, so no link, script or redirect can take the window to the web.
fn is_app_url(url: &Url) -> bool {
    match (url.scheme(), url.host_str()) {
        // Bundled files on macOS and Linux.
        ("tauri", Some("localhost")) => true,
        // Bundled files on Windows (WebView2 needs an http(s) origin).
        ("http" | "https", Some("tauri.localhost")) => url.port().is_none(),
        // The Vite dev server, only in debug builds (`npm run tauri dev`).
        ("http", Some("localhost")) => cfg!(debug_assertions) && url.port() == Some(5173),
        _ => false,
    }
}

/// Refuses every navigation to a URL that isn't the app's own.
fn navigation_guard<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("navigation-guard")
        .on_navigation(|_webview, url| is_app_url(url))
        .build()
}

fn main() {
    tauri::Builder::default()
        .plugin(navigation_guard())
        .run(tauri::generate_context!())
        .expect("error while running LocalKit");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn allowed(url: &str) -> bool {
        is_app_url(&Url::parse(url).unwrap())
    }

    #[test]
    fn allows_the_bundled_app() {
        assert!(allowed("tauri://localhost/"));
        assert!(allowed("tauri://localhost/index.html"));
        assert!(allowed("http://tauri.localhost/"));
        assert!(allowed("https://tauri.localhost/assets/index.js"));
    }

    #[test]
    fn refuses_the_web() {
        assert!(!allowed("https://example.com/"));
        assert!(!allowed("http://example.com/"));
        assert!(!allowed("https://tauri.localhost.example.com/"));
        assert!(!allowed("http://tauri.localhost:8080/"));
        assert!(!allowed("tauri://example.com/"));
        assert!(!allowed("file:///Users/example/notes.txt"));
        assert!(!allowed("data:text/html,hi"));
        assert!(!allowed("javascript:alert(1)"));
    }

    #[test]
    fn allows_the_dev_server_only_in_debug_builds() {
        assert_eq!(allowed("http://localhost:5173/"), cfg!(debug_assertions));
        assert!(!allowed("http://localhost:3000/"));
        assert!(!allowed("https://localhost:5173/"));
    }
}

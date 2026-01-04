// Desktop-only: Emitter used for emit(), Manager used for get_webview_window()
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::{Emitter, Manager};

// Desktop-only imports
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    WindowEvent,
};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_autostart::MacosLauncher;

// Desktop-only: Global flag to track if we should close to tray
#[cfg(not(any(target_os = "android", target_os = "ios")))]
static CLOSE_TO_TRAY: AtomicBool = AtomicBool::new(true);

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn force_focus(window: tauri::Window) {
    #[cfg(target_os = "macos")]
    {
        use objc2::{class, msg_send, runtime::AnyObject};
        unsafe {
            let cls = class!(NSApplication);
            let app: *mut AnyObject = msg_send![cls, sharedApplication];
            let _: () = msg_send![app, activateIgnoringOtherApps: true];
        }
    }
    let _ = window.set_focus();
}

#[cfg(any(target_os = "android", target_os = "ios"))]
#[tauri::command]
fn force_focus(_window: tauri::Window) {
    // No-op on mobile
}

// Desktop-only commands
#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn set_close_to_tray(enabled: bool) {
    CLOSE_TO_TRAY.store(enabled, Ordering::SeqCst);
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn enable_autostart(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().enable().map_err(|e| e.to_string())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn disable_autostart(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().disable().map_err(|e| e.to_string())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn get_autostart_status(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
async fn check_for_update(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;
    match app.updater().map_err(|e| e.to_string())?.check().await {
        Ok(Some(update)) => Ok(Some(update.version)),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No update available")?;

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| e.to_string())?;

    app.restart();
}

#[tauri::command]
fn send_os_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn is_mobile() -> bool {
    cfg!(any(target_os = "android", target_os = "ios"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Base builder with cross-platform plugins
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init());

    // Desktop-only: single instance with callback
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(
            |app: &tauri::AppHandle, args: Vec<String>, _cwd: String| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
                // Handle Deep Link args
                if let Some(url) = args.iter().find(|arg| arg.starts_with("show-tracker://")) {
                    let _ = app.emit("deep-link-received", vec![url.clone()]);
                }
            },
        ));
    }

    // Desktop-only plugins and setup
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_autostart::init(
                MacosLauncher::LaunchAgent,
                Some(vec!["--minimized"]),
            ))
            .setup(|app| {
                // Create menu items
                let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
                let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

                #[cfg(target_os = "macos")]
                let tray_icon = tauri::include_image!("icons/tray-icon.png");
                #[cfg(target_os = "windows")]
                let tray_icon = tauri::include_image!("icons/32x32.png");
                #[cfg(target_os = "linux")]
                let tray_icon = tauri::include_image!("icons/32x32.png");

                let _tray = TrayIconBuilder::new()
                    .icon(tray_icon)
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .tooltip("AShowTracker")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;

                if let Some(window) = app.get_webview_window("main") {
                    // Force maximize on startup as per user request
                    let _ = window.maximize();
                }

                if std::env::args().any(|arg| arg == "--minimized") {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }

                Ok(())
            })
            .on_window_event(|window, event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    if CLOSE_TO_TRAY.load(Ordering::SeqCst) {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
            });
    }

    // Mobile setup
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        builder = builder.setup(|_app| {
            // Mobile-specific initialization
            Ok(())
        });
    }

    // Register commands - desktop has more commands than mobile
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        force_focus,
        set_close_to_tray,
        enable_autostart,
        disable_autostart,
        get_autostart_status,
        check_for_update,
        install_update,
        send_os_notification,
        is_mobile
    ]);

    #[cfg(any(target_os = "android", target_os = "ios"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        force_focus,
        send_os_notification,
        is_mobile
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use std::sync::Mutex;

use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

/// 保存内置 Python 后端子进程句柄，便于退出时清理
struct BackendChild(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .manage(BackendChild(Mutex::new(None)))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // 启动内置 Python 拟合后端（sidecar），监听 127.0.0.1:8000
      match app.shell().sidecar("medviz-backend") {
        Ok(cmd) => match cmd.spawn() {
          Ok((mut rx, child)) => {
            app.state::<BackendChild>().0.lock().unwrap().replace(child);
            // 持续读取输出，避免管道阻塞
            tauri::async_runtime::spawn(async move {
              while rx.recv().await.is_some() {}
            });
          }
          Err(e) => eprintln!("[medviz] 后端 sidecar 启动失败: {e}"),
        },
        Err(e) => eprintln!("[medviz] 未找到后端 sidecar: {e}"),
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      // 应用退出时结束后端进程，避免遗留
      if let tauri::RunEvent::ExitRequested { .. } = event {
        if let Some(child) = app_handle.state::<BackendChild>().0.lock().unwrap().take() {
          let _ = child.kill();
        }
      }
    });
}

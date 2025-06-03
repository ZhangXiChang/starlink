#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod viewport;

use anyhow::Result;

fn main() -> Result<()> {
    let app_name = "应用名称";
    #[cfg(not(target_arch = "wasm32"))]
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(not_wasm::run(app_name))?;
    #[cfg(target_arch = "wasm32")]
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?
        .block_on(wasm::run(app_name))?;
    Ok(())
}

#[cfg(not(target_arch = "wasm32"))]
mod not_wasm {
    use anyhow::{Result, anyhow};
    use eframe::egui;

    use crate::viewport::Viewport;

    pub async fn run(app_name: impl Into<String>) -> Result<()> {
        env_logger::builder()
            .filter_level(log::LevelFilter::Error)
            .parse_default_env()
            .init();
        log::debug!("日志开始记录");
        let app_name = app_name.into() as String;
        eframe::run_native(
            &app_name.clone(),
            eframe::NativeOptions {
                viewport: egui::ViewportBuilder::default().with_decorations(false),
                ..Default::default()
            },
            Box::new(|cc| Ok(Box::new(Viewport::new(app_name, cc)?))),
        )
        .map_err(|err| anyhow!("{}", err))?;
        Ok(())
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    use anyhow::{Context, Result, anyhow};
    use web_sys::wasm_bindgen::JsCast;

    use crate::viewport::Viewport;

    pub async fn run(app_name: impl Into<String>) -> Result<()> {
        eframe::WebLogger::init(log::LevelFilter::Debug)?;
        log::debug!("日志开始记录");
        let document = web_sys::window()
            .context("没有窗口")?
            .document()
            .context("没有文档")?;
        let app_name = app_name.into() as String;
        document.set_title(&app_name);
        let canvas = document
            .query_selector("#viewport")
            .map_err(|err| anyhow!("{:?}", err))?
            .context("没有找到画板元素")?
            .dyn_into::<web_sys::HtmlCanvasElement>()
            .map_err(|_| anyhow!("这个元素不是画板"))?;
        eframe::WebRunner::new()
            .start(
                canvas,
                eframe::WebOptions::default(),
                Box::new(|cc| Ok(Box::new(Viewport::new(app_name, cc)?))),
            )
            .await
            .map_err(|err| anyhow!("{:?}", err))?;
        Ok(())
    }
}

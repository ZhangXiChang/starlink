#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod viewport;

use anyhow::anyhow;

use crate::viewport::Viewport;

const APP_NAME: &str = "应用名称";

#[cfg(not(target_family = "wasm"))]
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    use eframe::egui;
    use std::sync::Arc;

    env_logger::builder()
        .filter_level(log::LevelFilter::Error)
        .parse_default_env()
        .init();
    log::debug!("日志开始记录");
    let app_icon = image::load_from_memory(include_bytes!("../../../assets/images/app_icon.png"))?
        .into_rgba8();
    eframe::run_native(
        APP_NAME,
        eframe::NativeOptions {
            viewport: egui::ViewportBuilder::default()
                .with_icon(Arc::new(egui::IconData {
                    width: app_icon.width(),
                    height: app_icon.height(),
                    rgba: app_icon.into_vec(),
                }))
                .with_inner_size(egui::vec2(1150., 750.))
                .with_decorations(false),
            ..Default::default()
        },
        Box::new(|cc| Ok(Box::new(Viewport::new(APP_NAME, cc)?))),
    )
    .map_err(|err| anyhow!("{}", err))?;
    Ok(())
}

#[cfg(target_family = "wasm")]
fn main() {
    wasm_bindgen_futures::spawn_local(async move {
        if let Err(err) = async move {
            use anyhow::Context;
            use web_sys::wasm_bindgen::JsCast;

            eframe::WebLogger::init(log::LevelFilter::Trace)?;
            log::debug!("日志开始记录");
            let document = gloo::utils::document();
            document.set_title(APP_NAME);
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
                    Box::new(|cc| Ok(Box::new(Viewport::new(APP_NAME, cc)?))),
                )
                .await
                .map_err(|err| anyhow!("{:?}", err))?;
            anyhow::Ok(())
        }
        .await
        {
            gloo::console::error!(err.to_string());
        }
    });
}

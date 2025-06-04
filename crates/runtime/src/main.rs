#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod viewport;

use anyhow::anyhow;

use crate::viewport::Viewport;

#[cfg(not(target_arch = "wasm32"))]
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    use eframe::egui;

    let app_name = "应用名称";
    env_logger::builder()
        .filter_level(log::LevelFilter::Error)
        .parse_default_env()
        .init();
    log::debug!("日志开始记录");
    eframe::run_native(
        app_name,
        eframe::NativeOptions {
            viewport: egui::ViewportBuilder::default().with_decorations(false),
            ..Default::default()
        },
        Box::new(|cc| Ok(Box::new(Viewport::new(app_name, cc)?))),
    )
    .map_err(|err| anyhow!("{}", err))?;
    Ok(())
}

#[cfg(target_arch = "wasm32")]
fn main() {
    wasm_bindgen_futures::spawn_local(async move {
        use anyhow::Context;
        use web_sys::wasm_bindgen::JsCast;

        if let Err(err) = async move {
            eframe::WebLogger::init(log::LevelFilter::Trace)?;
            log::debug!("日志开始记录");
            let document = gloo::utils::document();
            let app_name = "应用名称".to_string();
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
            anyhow::Ok(())
        }
        .await
        {
            gloo::console::error!(err.to_string());
        }
    });
}

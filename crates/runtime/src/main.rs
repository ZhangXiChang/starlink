#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod system;
mod ui_draw;
mod utils;
mod viewport;

fn main() {
    cei::main();
}

#[cfg(not(target_family = "wasm"))]
mod cei {
    use std::sync::Arc;

    use anyhow::{Result, anyhow};
    use eframe::egui;

    use crate::viewport::Viewport;

    #[tokio::main]
    pub async fn main() {
        #[cfg(debug_assertions)]
        env_logger::builder()
            .filter_level(log::LevelFilter::Error)
            .parse_default_env()
            .init();
        log::debug!("日志开始记录");
        if let Err(err) = run().await {
            log::error!("{}", err);
        }
    }
    async fn run() -> Result<()> {
        eframe::run_native(
            "应用程序标题",
            eframe::NativeOptions {
                viewport: {
                    let app_icon = image::load_from_memory(include_bytes!(
                        "../../../assets/images/app_icon.png"
                    ))?
                    .into_rgba8();
                    egui::ViewportBuilder::default()
                        .with_icon(Arc::new(egui::IconData {
                            width: app_icon.width(),
                            height: app_icon.height(),
                            rgba: app_icon.into_vec(),
                        }))
                        .with_inner_size(egui::vec2(1150., 750.))
                        .with_decorations(false)
                },
                ..Default::default()
            },
            Box::new(|cc| Ok(Box::new(Viewport::new(cc)?))),
        )
        .map_err(|err| anyhow!("{}", err))?;
        Ok(())
    }
}

#[cfg(target_family = "wasm")]
mod cei {
    use anyhow::{Context, Result, anyhow};
    use web_sys::wasm_bindgen::JsCast;

    use crate::viewport::Viewport;

    pub fn main() {
        wasm_bindgen_futures::spawn_local(async move {
            std::panic::set_hook(Box::new(|info| {
                gloo::console::error!(info.to_string());
            }));
            eframe::WebLogger::init(log::LevelFilter::Trace).unwrap();
            log::debug!("日志开始记录");
            if let Err(err) = run().await {
                log::error!("{}", err);
            }
        });
    }
    async fn run() -> Result<()> {
        eframe::WebRunner::new()
            .start(
                {
                    let document = gloo::utils::document();
                    document.set_title("应用程序标题");
                    document
                        .query_selector("#viewport")
                        .map_err(|err| anyhow!("{:?}", err))?
                        .context("没有找到画板元素")?
                        .dyn_into::<web_sys::HtmlCanvasElement>()
                        .map_err(|_| anyhow!("这个元素不是画板"))?
                },
                eframe::WebOptions::default(),
                Box::new(|cc| Ok(Box::new(Viewport::new(cc)?))),
            )
            .await
            .map_err(|err| anyhow!("{:?}", err))?;
        Ok(())
    }
}

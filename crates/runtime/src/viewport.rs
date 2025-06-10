use std::sync::Arc;

use anyhow::{Context, Result};
use eframe::egui;
use parking_lot::Mutex;

use crate::{ui_draw::UIDraw, utils::async_task};

pub struct Viewport {
    ui_draw: Arc<Mutex<Option<UIDraw>>>,
}
impl Viewport {
    pub fn new(cc: &eframe::CreationContext) -> Result<Self> {
        async_task({
            let ctx = cc.egui_ctx.clone();
            async move {
                if let Err(err) = async move {
                    let font;
                    #[cfg(not(target_family = "wasm"))]
                    {
                        font = include_bytes!("../../../assets/fonts/SourceHanSansCN-Bold.otf")
                            .to_vec();
                    }
                    #[cfg(target_family = "wasm")]
                    {
                        use crate::utils::load_resource;

                        font = load_resource("./assets/fonts/SourceHanSansCN-Bold.otf").await?;
                    }
                    let mut font_definitions = egui::FontDefinitions::default();
                    font_definitions.font_data.insert(
                        "SourceHanSansCN-Bold".into(),
                        egui::FontData::from_owned(font).into(),
                    );
                    font_definitions
                        .families
                        .get_mut(&egui::FontFamily::Proportional)
                        .context("没有Proportional")?
                        .insert(0, "SourceHanSansCN-Bold".into());
                    font_definitions
                        .families
                        .get_mut(&egui::FontFamily::Monospace)
                        .context("没有Monospace")?
                        .push("SourceHanSansCN-Bold".into());
                    ctx.set_fonts(font_definitions);
                    anyhow::Ok(())
                }
                .await
                {
                    log::error!("{}", err);
                }
            }
        });
        let ui_draw = Arc::new(Mutex::new(None));
        async_task({
            let ui_draw = ui_draw.clone();
            async move {
                if let Err(err) = async move {
                    *ui_draw.lock() = Some(UIDraw::new().await?);
                    anyhow::Ok(())
                }
                .await
                {
                    log::error!("{}", err);
                }
            }
        });
        Ok(Self { ui_draw })
    }
}
impl eframe::App for Viewport {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        if let Some(ui_draw) = &mut *self.ui_draw.lock() {
            ui_draw.update(ctx);
        }
    }
}

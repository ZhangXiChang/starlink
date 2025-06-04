use std::sync::Arc;

use anyhow::{Context, Result};
use eframe::egui;

pub struct Viewport {
    app_name: String,
}
impl Viewport {
    pub fn new(app_name: impl Into<String>, cc: &eframe::CreationContext) -> Result<Self> {
        let setup_font = {
            let egui_ctx = cc.egui_ctx.clone();
            async move {
                if let Err(err) = async move {
                    let mut font = Vec::<u8>::new();
                    #[cfg(not(target_arch = "wasm32"))]
                    {
                        use tokio::{fs::File, io::AsyncReadExt};

                        File::open("./resources/fonts/SourceHanSansCN-Bold.otf")
                            .await?
                            .read_to_end(&mut font)
                            .await?;
                    }
                    #[cfg(target_arch = "wasm32")]
                    {
                        use gloo::net::http::Request;

                        let font = &mut font;
                        *font = Request::get("./resources/fonts/SourceHanSansCN-Bold.otf")
                            .send()
                            .await?
                            .binary()
                            .await?;
                    }
                    let mut font_definitions = egui::FontDefinitions::default();
                    font_definitions.font_data.insert(
                        "SourceHanSansCN-Bold".to_string(),
                        Arc::new(egui::FontData::from_owned(font)),
                    );
                    font_definitions
                        .families
                        .get_mut(&egui::FontFamily::Proportional)
                        .context("没有Proportional")?
                        .insert(0, "SourceHanSansCN-Bold".to_string());
                    font_definitions
                        .families
                        .get_mut(&egui::FontFamily::Monospace)
                        .context("没有Monospace")?
                        .push("SourceHanSansCN-Bold".to_string());
                    egui_ctx.set_fonts(font_definitions);
                    anyhow::Ok(())
                }
                .await
                {
                    log::error!("{}", err)
                }
            }
        };
        #[cfg(not(target_arch = "wasm32"))]
        tokio::spawn(setup_font);
        #[cfg(target_arch = "wasm32")]
        wasm_bindgen_futures::spawn_local(setup_font);
        Ok(Self {
            app_name: app_name.into(),
        })
    }
}
impl eframe::App for Viewport {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let mut egui_frame = egui::Frame::new().fill(ctx.style().visuals.window_fill);
        if !cfg!(target_arch = "wasm32") {
            egui_frame.stroke = ctx.style().visuals.window_stroke;
        }
        egui::CentralPanel::default()
            .frame(egui_frame)
            .show(ctx, |ui| {
                if !cfg!(target_arch = "wasm32") {
                    let titlebar_rect = ui.available_rect_before_wrap().with_max_y(32.);
                    let response = ui.allocate_rect(titlebar_rect, egui::Sense::click_and_drag());
                    if response.drag_started_by(egui::PointerButton::Primary) {
                        ui.ctx().send_viewport_cmd(egui::ViewportCommand::StartDrag);
                    }
                    if response.double_clicked() {
                        if let Some(maximized) = ui.input(|state| state.viewport().maximized) {
                            ui.ctx()
                                .send_viewport_cmd(egui::ViewportCommand::Maximized(!maximized));
                        }
                    }
                    ui.painter().text(
                        titlebar_rect.center(),
                        egui::Align2::CENTER_CENTER,
                        &self.app_name,
                        egui::FontId::proportional(20.),
                        ui.style().visuals.text_color(),
                    );
                    ui.painter().line_segment(
                        [
                            titlebar_rect.left_bottom() + egui::vec2(5., 0.),
                            titlebar_rect.right_bottom() + egui::vec2(-5., 0.),
                        ],
                        ui.visuals().widgets.noninteractive.bg_stroke,
                    );
                    ui.scope_builder(
                        egui::UiBuilder::new()
                            .max_rect(titlebar_rect)
                            .layout(egui::Layout::right_to_left(egui::Align::Center)),
                        |ui| {
                            ui.visuals_mut().button_frame = true;
                            ui.spacing_mut().item_spacing.x = 2.;

                            ui.add_space(5.);
                            if ui
                                .add(egui::Button::new("❌").min_size(egui::vec2(24., 24.)))
                                .clicked()
                            {
                                ui.ctx().send_viewport_cmd(egui::ViewportCommand::Close);
                            }
                            if ui
                                .add(egui::Button::new("🗗").min_size(egui::vec2(24., 24.)))
                                .clicked()
                            {
                                if let Some(maximized) =
                                    ui.input(|state| state.viewport().maximized)
                                {
                                    ui.ctx().send_viewport_cmd(egui::ViewportCommand::Maximized(
                                        !maximized,
                                    ));
                                }
                            }
                            if ui
                                .add(egui::Button::new("🗕").min_size(egui::vec2(24., 24.)))
                                .clicked()
                            {
                                ui.ctx()
                                    .send_viewport_cmd(egui::ViewportCommand::Minimized(true));
                            }
                        },
                    );
                }
                egui::Window::new("子应用")
                    .constrain_to(ui.available_rect_before_wrap())
                    .show(ctx, |ui| {
                        ui.label("ewgfergeh");
                    });
            });
    }
}

use std::sync::Arc;

use anyhow::{Context, Result};
use eframe::egui;

pub struct Viewport {
    app_name: String,
}
impl Viewport {
    pub fn new(app_name: impl ToString, cc: &eframe::CreationContext) -> Result<Self> {
        let setup_font = {
            let egui_ctx = cc.egui_ctx.clone();
            async move {
                if let Err(err) = async move {
                    let mut font = Vec::<u8>::new();
                    #[cfg(not(target_family = "wasm"))]
                    {
                        let font = &mut font;
                        *font = include_bytes!("../../../assets/fonts/SourceHanSansCN-Bold.otf")
                            .to_vec();
                    }
                    #[cfg(target_family = "wasm")]
                    {
                        use gloo::net::http::Request;

                        let font = &mut font;
                        *font = Request::get("./assets/fonts/SourceHanSansCN-Bold.otf")
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
        #[cfg(not(target_family = "wasm"))]
        tokio::spawn(setup_font);
        #[cfg(target_family = "wasm")]
        wasm_bindgen_futures::spawn_local(setup_font);
        Ok(Self {
            app_name: app_name.to_string(),
        })
    }
}
impl eframe::App for Viewport {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let mut egui_frame = egui::Frame::new().fill(ctx.style().visuals.window_fill);
        if !cfg!(target_family = "wasm") {
            egui_frame.stroke = ctx.style().visuals.window_stroke;
        }
        egui::CentralPanel::default()
            .frame(egui_frame)
            .show(ctx, |ui| {
                ui.spacing_mut().item_spacing = egui::Vec2::ZERO;

                if !cfg!(target_family = "wasm") {
                    let response = ui
                        .interact(
                            egui::Rect::from_points(&[
                                ui.max_rect().right_bottom() - egui::vec2(1., 1.),
                                ui.max_rect().right_bottom(),
                            ]),
                            egui::Id::new("window_resize_south_east"),
                            egui::Sense::drag(),
                        )
                        .on_hover_cursor(egui::CursorIcon::ResizeSouthEast);
                    if response.drag_started_by(egui::PointerButton::Primary) {
                        ctx.send_viewport_cmd(egui::ViewportCommand::BeginResize(
                            egui::ResizeDirection::SouthEast,
                        ));
                    }
                }
                let mut strip_builder = egui_extras::StripBuilder::new(ui);
                if !cfg!(target_family = "wasm") {
                    strip_builder = strip_builder.size(egui_extras::Size::exact(32.));
                }
                strip_builder
                    .size(egui_extras::Size::remainder())
                    .vertical(|mut strip| {
                        if !cfg!(target_family = "wasm") {
                            strip.cell(|ui| {
                                let response = ui.interact(
                                    ui.max_rect(),
                                    egui::Id::new("titlebar_window_drag_maximized"),
                                    egui::Sense::click_and_drag(),
                                );
                                if response.drag_started_by(egui::PointerButton::Primary) {
                                    ui.ctx().send_viewport_cmd(egui::ViewportCommand::StartDrag);
                                }
                                if response.double_clicked() {
                                    if let Some(maximized) =
                                        ui.input(|state| state.viewport().maximized)
                                    {
                                        ui.ctx().send_viewport_cmd(
                                            egui::ViewportCommand::Maximized(!maximized),
                                        );
                                    }
                                }
                                ui.painter().text(
                                    ui.max_rect().center(),
                                    egui::Align2::CENTER_CENTER,
                                    &self.app_name,
                                    egui::FontId::proportional(20.),
                                    ui.style().visuals.text_color(),
                                );
                                ui.with_layout(
                                    egui::Layout::right_to_left(egui::Align::Center),
                                    |ui| {
                                        ui.visuals_mut().button_frame = true;
                                        ui.spacing_mut().item_spacing.x = 2.;

                                        ui.add_space(4.);
                                        if ui
                                            .add(
                                                egui::Button::new("❌")
                                                    .min_size(egui::vec2(24., 24.)),
                                            )
                                            .clicked()
                                        {
                                            ui.ctx()
                                                .send_viewport_cmd(egui::ViewportCommand::Close);
                                        }
                                        if ui
                                            .add(
                                                egui::Button::new("🗗")
                                                    .min_size(egui::vec2(24., 24.)),
                                            )
                                            .clicked()
                                        {
                                            if let Some(maximized) =
                                                ui.input(|state| state.viewport().maximized)
                                            {
                                                ui.ctx().send_viewport_cmd(
                                                    egui::ViewportCommand::Maximized(!maximized),
                                                );
                                            }
                                        }
                                        if ui
                                            .add(
                                                egui::Button::new("🗕")
                                                    .min_size(egui::vec2(24., 24.)),
                                            )
                                            .clicked()
                                        {
                                            ui.ctx().send_viewport_cmd(
                                                egui::ViewportCommand::Minimized(true),
                                            );
                                        }
                                    },
                                );
                                ui.painter().line_segment(
                                    [ui.max_rect().left_bottom(), ui.max_rect().right_bottom()],
                                    ui.visuals().widgets.noninteractive.bg_stroke,
                                );
                            });
                        }
                        strip.cell(|ui| {
                            let window_movable_area = ui.max_rect();
                            egui_extras::StripBuilder::new(ui)
                                .size(egui_extras::Size::exact(24.))
                                .size(egui_extras::Size::remainder())
                                .vertical(|mut strip| {
                                    strip.cell(|ui| {
                                        ui.horizontal_centered(|ui| {
                                            ui.spacing_mut().item_spacing.x = 2.;

                                            ui.add_space(4.);
                                            if ui.button("添加节点").clicked() {}
                                        });
                                        ui.painter().line_segment(
                                            [
                                                ui.max_rect().left_bottom() + egui::vec2(4., 0.),
                                                ui.max_rect().right_bottom() + egui::vec2(-4., 0.),
                                            ],
                                            ui.visuals().widgets.noninteractive.bg_stroke,
                                        );
                                    });
                                    strip.cell(|ui| {
                                        egui::Window::new("子应用")
                                            .constrain_to(window_movable_area)
                                            .default_pos(ui.max_rect().shrink(64.).left_top())
                                            .collapsible(false)
                                            .vscroll(true)
                                            .show(ctx, |ui| {
                                                ui.label("内容");
                                            });
                                    });
                                });
                        });
                    });
            });
    }
}

use anyhow::{Context, Result};
use eframe::egui;
use egui_notify::Toasts;
use uuid::Uuid;

use crate::utils::{cei::async_task, open_by_os};

trait WindowViewport {
    fn update(&mut self, ui: &mut egui::Ui);
}

struct Window {
    id: egui::Id,
    title: String,
    is_open: bool,
    is_exit: bool,
}
impl Window {
    fn new(id: egui::Id, title: impl Into<String>, default_open: bool) -> Self {
        Self {
            id,
            title: title.into(),
            is_open: default_open,
            is_exit: false,
        }
    }
}

struct Demo;
impl WindowViewport for Demo {
    fn update(&mut self, ui: &mut egui::Ui) {
        if ui.button("qwdqwdqwd").clicked() {}
    }
}

pub struct Viewport {
    toasts: Toasts,
    windows: Vec<(Window, Box<dyn WindowViewport>)>,
}
impl Viewport {
    pub fn new(cc: &eframe::CreationContext) -> Result<Self> {
        async_task(set_font(cc.egui_ctx.clone()));
        Ok(Self {
            toasts: Toasts::new()
                .with_anchor(egui_notify::Anchor::BottomRight)
                .with_margin(egui::vec2(1., 32.)),
            windows: vec![],
        })
    }
    fn control_bar(&mut self, ui: &mut egui::Ui) {
        #[cfg(not(target_family = "wasm"))]
        {
            let control_bar_response = ui.interact(
                ui.max_rect(),
                egui::Id::new("control_bar"),
                egui::Sense::click_and_drag(),
            );
            if control_bar_response.drag_started_by(egui::PointerButton::Primary) {
                ui.ctx().send_viewport_cmd(egui::ViewportCommand::StartDrag);
            }
            if control_bar_response.double_clicked() {
                if let Some(maximized) = ui.input(|state| state.viewport().maximized) {
                    ui.ctx()
                        .send_viewport_cmd(egui::ViewportCommand::Maximized(!maximized));
                }
            }
        }
        ui.painter().line_segment(
            [ui.max_rect().left_bottom(), ui.max_rect().right_bottom()],
            ui.visuals().noninteractive().bg_stroke,
        );
        ui.horizontal_centered(|ui| {
            ui.spacing_mut().item_spacing.x = 2.;

            ui.add_space(4.);
            ui.menu_button("关于", |ui| {
                if ui.link("by 张喜昌").clicked() {
                    if let Err(err) = open_by_os("https://github.com/ZhangXiChang") {
                        self.toasts.error(err.to_string());
                    }
                }
                if ui.link("GitHub").clicked() {
                    if let Err(err) = open_by_os("https://github.com/ZhangXiChang/starlink") {
                        self.toasts.error(err.to_string());
                    }
                }
            });

            #[cfg(not(target_family = "wasm"))]
            {
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.spacing_mut().item_spacing.x = 2.;

                    ui.add_space(4.);
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
                        if let Some(maximized) = ui.input(|state| state.viewport().maximized) {
                            ui.ctx()
                                .send_viewport_cmd(egui::ViewportCommand::Maximized(!maximized));
                        }
                    }
                    if ui
                        .add(egui::Button::new("🗕").min_size(egui::vec2(24., 24.)))
                        .clicked()
                    {
                        ui.ctx()
                            .send_viewport_cmd(egui::ViewportCommand::Minimized(true));
                    }
                });
            }
        });
    }
    fn content_area(&mut self, ui: &mut egui::Ui) {
        let content_area_response = ui.interact(
            ui.max_rect(),
            egui::Id::new("content_area"),
            egui::Sense::click(),
        );
        content_area_response.context_menu(|ui| {
            if ui.button("测试应用").clicked() {
                self.windows.push((
                    Window::new(egui::Id::new(Uuid::new_v4()), "测试应用", true),
                    Box::new(Demo),
                ));
                ui.close_menu();
            }
        });
        ui.painter().text(
            ui.max_rect().center(),
            egui::Align2::CENTER_CENTER,
            "右击空白处打开应用",
            egui::FontId::proportional(48.),
            ui.visuals().weak_text_color(),
        );
        self.windows.retain_mut(|(window, viewport)| {
            egui::Window::new(&window.title)
                .id(window.id)
                .constrain_to(ui.max_rect())
                .default_pos(ui.max_rect().shrink(64.).left_top())
                .collapsible(false)
                .open(&mut window.is_open)
                .show(ui.ctx(), |ui| {
                    viewport.update(ui);
                });
            !window.is_exit
        });
    }
    fn task_bar(&mut self, ui: &mut egui::Ui) {
        ui.painter().line_segment(
            [ui.max_rect().left_top(), ui.max_rect().right_top()],
            ui.visuals().noninteractive().bg_stroke,
        );
        ui.horizontal_centered(|ui| {
            ui.spacing_mut().item_spacing.x = 2.;

            self.windows.retain_mut(|(window, _)| {
                ui.toggle_value(&mut window.is_open, &window.title)
                    .context_menu(|ui| {
                        if ui.button("退出").clicked() {
                            window.is_exit = true;
                            ui.close_menu();
                        }
                    });
                !window.is_exit
            });
        });
    }
}
impl eframe::App for Viewport {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        ctx.style_mut(|style| {
            style.spacing.item_spacing = egui::Vec2::ZERO;
        });
        #[allow(unused_mut)]
        let mut egui_frame = egui::Frame::new().fill(ctx.style().visuals.window_fill);
        #[cfg(not(target_family = "wasm"))]
        {
            egui_frame.stroke = ctx.style().visuals.window_stroke;
        }
        egui::CentralPanel::default()
            .frame(egui_frame)
            .show(ctx, |ui| {
                #[cfg(not(target_family = "wasm"))]
                {
                    let window_resize_south_east = ui
                        .interact(
                            egui::Rect::from_points(&[
                                ui.max_rect().right_bottom() - egui::vec2(1., 1.),
                                ui.max_rect().right_bottom(),
                            ]),
                            egui::Id::new("window_resize_south_east"),
                            egui::Sense::drag(),
                        )
                        .on_hover_cursor(egui::CursorIcon::ResizeSouthEast);
                    if window_resize_south_east.drag_started_by(egui::PointerButton::Primary) {
                        ui.ctx()
                            .send_viewport_cmd(egui::ViewportCommand::BeginResize(
                                egui::ResizeDirection::SouthEast,
                            ));
                    }
                }
                egui_extras::StripBuilder::new(ui)
                    .size(egui_extras::Size::exact(32.))
                    .size(egui_extras::Size::remainder())
                    .size(egui_extras::Size::exact(24.))
                    .vertical(|mut strip| {
                        strip.cell(|ui| self.control_bar(ui));
                        strip.cell(|ui| self.content_area(ui));
                        strip.cell(|ui| self.task_bar(ui));
                    });
            });
        self.toasts.show(ctx);
    }
}

async fn set_font(ctx: egui::Context) {
    if let Err(err) = async move {
        let font;
        #[cfg(not(target_family = "wasm"))]
        {
            font = include_bytes!("../../../assets/fonts/SourceHanSansCN-Bold.otf").to_vec();
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

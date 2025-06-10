use std::{collections::HashMap, sync::Arc};

use anyhow::Result;
use eframe::egui;
use egui_notify::Toast;
use parking_lot::Mutex;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::{
    system::{Command, System, UIComponent},
    utils::{async_task, open_path},
};

struct Demo;
impl UIComponent for Demo {
    fn update(&mut self, id: &egui::Id, ui: &mut egui::Ui, system: &System) {
        if ui.button("关闭").clicked() {
            system.send_command(Command::Close(*id));
        }
        if ui.button("土司").clicked() {
            system.toast(Toast::success("成功发送"));
        }
    }
}

struct SubWindow {
    title: String,
    is_open: bool,
}
impl SubWindow {
    fn new(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            is_open: true,
        }
    }
}

pub struct UIDraw {
    system: System,
    sub_windows: Arc<Mutex<HashMap<egui::Id, (SubWindow, Box<dyn UIComponent + Send + Sync>)>>>,
}
impl UIDraw {
    pub async fn new() -> Result<Self> {
        let (sender, mut receiver) = mpsc::unbounded_channel::<Command>();
        let sub_windows = Arc::new(Mutex::new(HashMap::new()));
        async_task({
            let sub_windows = sub_windows.clone();
            async move {
                while let Some(command) = receiver.recv().await {
                    match command {
                        Command::Close(id) => {
                            sub_windows.lock().remove(&id);
                        }
                    }
                }
            }
        });
        Ok(Self {
            system: System::new(sender).await?,
            sub_windows,
        })
    }
    pub fn update(&mut self, ctx: &egui::Context) {
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
                #[allow(unused_mut)]
                let mut strip_builder = egui_extras::StripBuilder::new(ui);
                #[cfg(not(target_family = "wasm"))]
                {
                    strip_builder = strip_builder.size(egui_extras::Size::exact(32.));
                }
                strip_builder
                    .size(egui_extras::Size::remainder())
                    .vertical(|mut strip| {
                        #[cfg(not(target_family = "wasm"))]
                        {
                            strip.cell(|ui| self.title_bar(ui));
                        }
                        strip.cell(|ui| self.window_body(ui));
                    });
            });
        self.system.update_toasts(ctx);
    }
    #[cfg(not(target_family = "wasm"))]
    fn title_bar(&mut self, ui: &mut egui::Ui) {
        let title_bar_window_drag_maximized = ui.interact(
            ui.max_rect(),
            egui::Id::new("title_bar_window_drag_maximized"),
            egui::Sense::click_and_drag(),
        );
        if title_bar_window_drag_maximized.drag_started_by(egui::PointerButton::Primary) {
            ui.ctx().send_viewport_cmd(egui::ViewportCommand::StartDrag);
        }
        if title_bar_window_drag_maximized.double_clicked() {
            if let Some(maximized) = ui.input(|state| state.viewport().maximized) {
                ui.ctx()
                    .send_viewport_cmd(egui::ViewportCommand::Maximized(!maximized));
            }
        }
        ui.painter().line_segment(
            [ui.max_rect().left_bottom(), ui.max_rect().right_bottom()],
            ui.visuals().noninteractive().bg_stroke,
        );
        ui.painter().text(
            ui.max_rect().center(),
            egui::Align2::CENTER_CENTER,
            "窗口标题",
            egui::FontId::proportional(20.),
            ui.visuals().text_color(),
        );
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
    fn window_body(&mut self, ui: &mut egui::Ui) {
        ui.painter().text(
            ui.max_rect().center(),
            egui::Align2::CENTER_CENTER,
            "右击空白处打开应用",
            egui::FontId::proportional(48.),
            ui.visuals().noninteractive().bg_stroke.color,
        );
        let window_body_area = ui.max_rect();
        egui_extras::StripBuilder::new(ui)
            .size(egui_extras::Size::exact(24.))
            .size(egui_extras::Size::remainder())
            .size(egui_extras::Size::exact(24.))
            .vertical(|mut strip| {
                strip.cell(|ui| {
                    ui.horizontal_centered(|ui| {
                        ui.spacing_mut().item_spacing.x = 2.;

                        ui.painter().line_segment(
                            [
                                ui.max_rect().left_bottom() + egui::vec2(4., 0.),
                                ui.max_rect().right_bottom() + egui::vec2(-4., 0.),
                            ],
                            ui.visuals().noninteractive().bg_stroke,
                        );
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            ui.add_space(4.);
                            ui.menu_button("关于", |ui| {
                                if ui.link("by 张喜昌").clicked() {
                                    if let Err(err) = open_path("https://github.com/ZhangXiChang") {
                                        self.system.toast(Toast::error(err.to_string()));
                                    }
                                }
                                if ui.link("GitHub").clicked() {
                                    if let Err(err) =
                                        open_path("https://github.com/ZhangXiChang/starlink")
                                    {
                                        self.system.toast(Toast::error(err.to_string()));
                                    }
                                }
                            });
                        });
                    });
                });
                strip.cell(|ui| {
                    ui.interact(
                        ui.max_rect(),
                        egui::Id::new("sub_app_view_context_menu"),
                        egui::Sense::click(),
                    )
                    .context_menu(|ui| {
                        if ui.button("测试应用").clicked() {
                            self.sub_windows.lock().insert(
                                egui::Id::new(Uuid::new_v4()),
                                (SubWindow::new("测试应用"), Box::new(Demo)),
                            );
                            ui.close_menu();
                        }
                    });
                    for (id, (sub_window, ui_component)) in &mut *self.sub_windows.lock() {
                        egui::Window::new(&sub_window.title)
                            .id(*id)
                            .constrain_to(window_body_area)
                            .default_pos(ui.max_rect().shrink(64.).left_top())
                            .collapsible(false)
                            .open(&mut sub_window.is_open)
                            .show(ui.ctx(), |ui| {
                                ui_component.update(id, ui, &self.system);
                            });
                    }
                });
                strip.cell(|ui| {
                    ui.painter().line_segment(
                        [
                            ui.max_rect().left_top() + egui::vec2(4., 0.),
                            ui.max_rect().right_top() + egui::vec2(-4., 0.),
                        ],
                        ui.visuals().noninteractive().bg_stroke,
                    );
                    ui.horizontal_centered(|ui| {
                        ui.spacing_mut().item_spacing.x = 2.;

                        ui.add_space(4.);
                        for (id, (sub_window, _)) in &mut *self.sub_windows.lock() {
                            ui.toggle_value(&mut sub_window.is_open, &sub_window.title)
                                .context_menu(|ui| {
                                    if ui.button("退出").clicked() {
                                        self.system.send_command(Command::Close(*id));
                                        ui.close_menu();
                                    }
                                });
                        }
                    });
                });
            });
    }
}

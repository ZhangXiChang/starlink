use std::{collections::HashMap, sync::Arc};

use anyhow::{Context, Result};
use eframe::egui;
use user_interface::{SWCommand, UserInterface};
use uuid::Uuid;

use crate::utils::{async_task, open_path};

struct ConnectNodeUI;
impl UserInterface for ConnectNodeUI {
    fn draw(&mut self, _ui: &mut egui::Ui, _commands: &mut Vec<SWCommand>) {}
}

struct SubWindow {
    title: String,
    ui: Box<dyn UserInterface>,
}
impl SubWindow {
    fn new(title: impl Into<String>, ui: Box<dyn UserInterface>) -> Self {
        Self {
            title: title.into(),
            ui,
        }
    }
}

pub struct Viewport {
    #[cfg(not(target_family = "wasm"))]
    app_name: String,
    sub_windows: HashMap<egui::Id, SubWindow>,
}
impl Viewport {
    pub fn new(
        #[cfg(not(target_family = "wasm"))] app_name: impl Into<String>,
        cc: &eframe::CreationContext,
    ) -> Result<Self> {
        async_task({
            let egui_ctx = cc.egui_ctx.clone();
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
        });
        Ok(Self {
            #[cfg(not(target_family = "wasm"))]
            app_name: app_name.into(),
            sub_windows: Default::default(),
        })
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
        ui.painter().text(
            ui.max_rect().center(),
            egui::Align2::CENTER_CENTER,
            &self.app_name,
            egui::FontId::proportional(20.),
            ui.visuals().text_color(),
        );
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            ui.visuals_mut().button_frame = true;
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
        ui.painter().line_segment(
            [ui.max_rect().left_bottom(), ui.max_rect().right_bottom()],
            ui.visuals().noninteractive().bg_stroke,
        );
    }
    fn window_body(&mut self, ui: &mut egui::Ui) {
        ui.painter().text(
            ui.max_rect().center(),
            egui::Align2::CENTER_CENTER,
            "鼠标右击空白处打开菜单",
            egui::FontId::proportional(48.),
            ui.visuals().noninteractive().bg_stroke.color,
        );
        let window_body_area = ui.max_rect();
        egui_extras::StripBuilder::new(ui)
            .size(egui_extras::Size::exact(24.))
            .size(egui_extras::Size::remainder())
            .vertical(|mut strip| {
                strip.cell(|ui| {
                    ui.horizontal_centered(|ui| {
                        ui.spacing_mut().item_spacing.x = 2.;

                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            ui.add_space(4.);
                            ui.menu_button("About", |ui| {
                                if ui.link("GitHub Repository").clicked() {
                                    if let Err(err) =
                                        open_path("https://github.com/ZhangXiChang/starlink")
                                    {
                                        log::error!("{}", err);
                                    }
                                }
                                if ui.link("Starlink by ZhangXiChang").clicked() {
                                    if let Err(err) = open_path("https://github.com/ZhangXiChang") {
                                        log::error!("{}", err);
                                    }
                                }
                            });
                        });
                    });
                    ui.painter().line_segment(
                        [
                            ui.max_rect().left_bottom() + egui::vec2(4., 0.),
                            ui.max_rect().right_bottom() + egui::vec2(-4., 0.),
                        ],
                        ui.visuals().noninteractive().bg_stroke,
                    );
                });
                strip.cell(|ui| {
                    ui.interact(
                        ui.max_rect(),
                        egui::Id::new("sub_app_view_context_menu"),
                        egui::Sense::click(),
                    )
                    .context_menu(|ui| {
                        if ui.button("连接节点").clicked() {
                            self.sub_windows.insert(
                                egui::Id::new(Uuid::new_v4()),
                                SubWindow::new("连接节点", Box::new(ConnectNodeUI)),
                            );
                            ui.close_menu();
                        }
                    });
                    let mut sub_windows_closed = Vec::<egui::Id>::new();
                    for (id, sub_window) in &mut self.sub_windows {
                        let mut is_open = true;
                        let mut commands = Vec::<SWCommand>::new();
                        egui::Window::new(&sub_window.title)
                            .id(*id)
                            .constrain_to(window_body_area)
                            .default_pos(ui.max_rect().shrink(64.).left_top())
                            .default_size(egui::vec2(400., 300.))
                            .collapsible(false)
                            .open(&mut is_open)
                            .show(ui.ctx(), |ui| sub_window.ui.draw(ui, &mut commands));
                        for command in commands {
                            match command {
                                SWCommand::Close => is_open = false,
                                SWCommand::SetUserInterface(user_interface) => {
                                    sub_window.ui = user_interface
                                }
                            }
                        }
                        if !is_open {
                            sub_windows_closed.push(*id);
                        }
                    }
                    for id in sub_windows_closed {
                        self.sub_windows.remove(&id);
                    }
                });
            });
    }
}
impl eframe::App for Viewport {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        #[allow(unused_mut)]
        let mut egui_frame = egui::Frame::new().fill(ctx.style().visuals.window_fill);
        #[cfg(not(target_family = "wasm"))]
        {
            egui_frame.stroke = ctx.style().visuals.window_stroke;
        }
        egui::CentralPanel::default()
            .frame(egui_frame)
            .show(ctx, |ui| {
                ui.spacing_mut().item_spacing = egui::Vec2::ZERO;

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
                        ctx.send_viewport_cmd(egui::ViewportCommand::BeginResize(
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
    }
}

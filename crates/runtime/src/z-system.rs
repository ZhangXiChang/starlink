use std::sync::Arc;

use anyhow::Result;
use eframe::egui;
use egui_notify::{Toast, Toasts};
use parking_lot::Mutex;
use tokio::sync::mpsc;

pub trait UIComponent {
    fn update(&mut self, id: &egui::Id, ui: &mut egui::Ui, system: &System);
}

pub enum Command {
    Close(egui::Id),
}

#[derive(Clone)]
pub struct System {
    toasts: Arc<Mutex<Toasts>>,
    command_sender: mpsc::UnboundedSender<Command>,
}
impl System {
    pub async fn new(command_sender: mpsc::UnboundedSender<Command>) -> Result<Self> {
        Ok(Self {
            toasts: Arc::new(Mutex::new(
                Toasts::new()
                    .with_anchor(egui_notify::Anchor::BottomRight)
                    .with_margin(egui::vec2(1., 32.)),
            )),
            command_sender,
        })
    }
    pub fn update_toasts(&self, ctx: &egui::Context) {
        self.toasts.lock().show(ctx);
    }
    pub fn toast(&self, toast: Toast) {
        self.toasts.lock().add(toast);
    }
    pub fn send_command(&self, command: Command) {
        _ = self.command_sender.send(command);
    }
}

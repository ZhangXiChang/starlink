pub trait UserInterface {
    fn draw(&mut self, ui: &mut egui::Ui, commands: &mut Vec<SWCommand>);
}

pub enum SWCommand {
    Close,
    SetUserInterface(Box<dyn UserInterface>),
}

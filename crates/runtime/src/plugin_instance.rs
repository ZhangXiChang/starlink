use std::path::Path;

use anyhow::Result;
use libloading::Library;
use plugin_interface::{Plugin, PluginInfo};

pub struct PluginInstance {
    instance: Box<dyn Plugin>,
    #[allow(dead_code)]
    library: Library,
}
impl PluginInstance {
    pub fn load(path: impl AsRef<Path>) -> Result<Self> {
        let (library, instance) = unsafe {
            let library = Library::new(path.as_ref())?;
            let instance =
                *library.get::<extern "C" fn() -> Box<Box<dyn Plugin>>>(b"instantiation")?();
            (library, instance)
        };
        Ok(Self { library, instance })
    }
}
impl Plugin for PluginInstance {
    fn plugin_info(&self) -> &PluginInfo {
        self.instance.plugin_info()
    }
    fn execute(&mut self) -> Result<()> {
        self.instance.execute()
    }
}

use std::path::Path;

use anyhow::Result;
use libloading::Library;
use plugin_interface::{PluginInfo, PluginInterface};

pub struct PluginInstance {
    instance: Box<dyn PluginInterface>,
    #[allow(dead_code)]
    library: Library,
}
impl PluginInstance {
    pub fn load(path: impl into<String>) -> Result<Self> {
        let (library, instance) = unsafe {
            let library = Library::new(path.as_ref())?;
            let instance = *library
                .get::<extern "C" fn() -> Box<Box<dyn PluginInterface>>>(b"instantiation")?(
            );
            (library, instance)
        };
        Ok(Self { library, instance })
    }
}
impl PluginInterface for PluginInstance {
    fn plugin_info(&self) -> &PluginInfo {
        self.instance.plugin_info()
    }
}

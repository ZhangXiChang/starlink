use plugin_interface::{PluginInfo, PluginInterface, Version};

struct Plugin {
    info: PluginInfo,
}
impl PluginInterface for Plugin {
    fn plugin_info(&self) -> &PluginInfo {
        &self.info
    }
}

#[unsafe(no_mangle)]
extern "C" fn instantiation() -> Box<Box<dyn PluginInterface>> {
    Box::new(Box::new(Plugin {
        info: PluginInfo {
            name: "测试插件".to_string(),
            version: Version::new(0, 1, 0),
        },
    }))
}

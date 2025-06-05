use plugin_interface::{Plugin, PluginInfo, Version};

struct TestPlugin {
    info: PluginInfo,
}
impl Plugin for TestPlugin {
    fn plugin_info(&self) -> &PluginInfo {
        &self.info
    }
}

#[unsafe(no_mangle)]
extern "C" fn instantiation() -> Box<Box<dyn Plugin>> {
    Box::new(Box::new(TestPlugin {
        info: PluginInfo {
            name: "测试插件".to_string(),
            version: Version::new(0, 1, 0),
        },
    }))
}

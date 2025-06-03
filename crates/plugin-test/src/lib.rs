use plugin_interface::{Plugin, PluginInfo, Result, Version};

struct TestPlugin {
    info: PluginInfo,
}
impl Plugin for TestPlugin {
    fn plugin_info(&self) -> &PluginInfo {
        &self.info
    }
    fn execute(&mut self) -> Result<()> {
        println!("你好，世界");
        Ok(())
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

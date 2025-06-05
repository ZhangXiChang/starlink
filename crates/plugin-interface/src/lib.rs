pub use semver::Version;

#[derive(Debug)]
pub struct PluginInfo {
    pub name: String,
    pub version: Version,
}

pub trait Plugin {
    fn plugin_info(&self) -> &PluginInfo;
}

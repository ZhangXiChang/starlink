pub use semver::Version;

pub trait PluginInterface {
    fn plugin_info(&self) -> &PluginInfo;
}

#[derive(Debug)]
pub struct PluginInfo {
    pub name: String,
    pub version: Version,
}

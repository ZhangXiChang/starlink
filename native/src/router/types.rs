use serde::{Deserialize, Serialize};
use specta::datatype::DataType;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(transparent)]
pub struct IpcJsonValue(pub serde_json::Value);
impl specta::Type for IpcJsonValue {
    fn definition(types: &mut specta::Types) -> DataType {
        <specta_typescript::Unknown>::definition(types)
    }
}
impl From<IpcJsonValue> for serde_json::Value {
    fn from(value: IpcJsonValue) -> Self {
        value.0
    }
}
impl From<serde_json::Value> for IpcJsonValue {
    fn from(value: serde_json::Value) -> Self {
        Self(value)
    }
}

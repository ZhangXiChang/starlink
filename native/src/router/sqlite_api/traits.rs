use eyre::{Result, eyre};
use utils::option_ext::OptionGet;

pub trait IntoSQLiteValue {
    fn into_sqlite_value(self) -> Result<tokio_rusqlite::types::Value>;
}
impl IntoSQLiteValue for serde_json::Value {
    fn into_sqlite_value(self) -> Result<tokio_rusqlite::types::Value> {
        match self {
            serde_json::Value::Null => Ok(tokio_rusqlite::types::Value::Null),
            serde_json::Value::Bool(value) => Ok(value.into()),
            serde_json::Value::Number(value) => Ok(value.as_i64().get()?.into()),
            serde_json::Value::String(value) => Ok(value.into()),
            serde_json::Value::Array(value) => Ok(value
                .into_iter()
                .map(|v| Ok(v.as_u64().get()? as _))
                .collect::<Result<Vec<u8>>>()?
                .into()),
            serde_json::Value::Object(_) => Err(eyre!("目标不能为对象")),
        }
    }
}

pub trait IntoJSONValue {
    fn into_json_value(self) -> serde_json::Value;
}
impl IntoJSONValue for tokio_rusqlite::types::Value {
    fn into_json_value(self) -> serde_json::Value {
        match self {
            tokio_rusqlite::types::Value::Null => serde_json::Value::Null,
            tokio_rusqlite::types::Value::Integer(value) => value.into(),
            tokio_rusqlite::types::Value::Real(value) => value.into(),
            tokio_rusqlite::types::Value::Text(value) => value.into(),
            tokio_rusqlite::types::Value::Blob(value) => value.into(),
        }
    }
}

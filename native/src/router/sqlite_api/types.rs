#[taurpc::ipc_type]
pub struct IpcSQLiteUpdateEvent {
    pub update_type: i32,
    pub db_name: String,
    pub table_name: String,
    pub row_id: i64,
}

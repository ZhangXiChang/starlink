mod traits;
mod types;
mod utils;

use std::sync::Arc;

use ::utils::option_ext::OptionGet;
use eyre::eyre;
use sharded_slab::Slab;
use tauri::{Runtime, Window, ipc::Channel};
use tokio_rusqlite::{hooks::Action, params_from_iter};

use crate::{
    error::MapStringError,
    router::{
        sqlite_api::{traits::IntoJSONValue, types::IpcSQLiteUpdateEvent, utils::json_sql_params},
        types::IpcJsonValue,
    },
};

#[taurpc::procedures(path = "sqlite")]
pub trait SQLiteApi {
    async fn open_db<R: Runtime>(window: Window<R>, path: String) -> Result<usize, String>;
    async fn close_db(handle: usize) -> Result<(), String>;
    async fn execute_sql(handle: usize, sql: String) -> Result<(), String>;
    async fn execute(handle: usize, sql: String, params: Vec<IpcJsonValue>) -> Result<(), String>;
    async fn query(
        handle: usize,
        sql: String,
        params: Vec<IpcJsonValue>,
    ) -> Result<Vec<IpcJsonValue>, String>;
    async fn on_update(handle: usize, channel: Channel<IpcSQLiteUpdateEvent>)
    -> Result<(), String>;
}

#[derive(Clone, Default)]
pub struct SQLiteApiImpl {
    connection_pool: Arc<Slab<tokio_rusqlite::Connection>>,
}
#[taurpc::resolvers]
impl SQLiteApi for SQLiteApiImpl {
    async fn open_db<R: Runtime>(
        self,
        #[allow(unused_variables)] window: Window<R>,
        path: String,
    ) -> Result<usize, String> {
        async {
            let db_path;
            #[cfg(not(debug_assertions))]
            {
                use tauri::Manager;

                db_path = window.path().app_local_data_dir()?.join(path)
            }
            #[cfg(debug_assertions)]
            {
                #[cfg(target_os = "android")]
                {
                    use tauri::Manager;

                    db_path = window.path().app_local_data_dir()?.join(path)
                }
                #[cfg(not(target_os = "android"))]
                {
                    db_path = path;
                }
            }
            eyre::Ok(
                self.connection_pool
                    .insert(tokio_rusqlite::Connection::open(db_path).await?)
                    .get()?,
            )
        }
        .await
        .mse()
    }
    async fn close_db(self, handle: usize) -> Result<(), String> {
        async {
            if let Some(connection) = self.connection_pool.take(handle) {
                connection.close().await?;
            }
            eyre::Ok(())
        }
        .await
        .mse()
    }
    async fn execute_sql(self, handle: usize, sql: String) -> Result<(), String> {
        async {
            self.connection_pool
                .get_owned(handle)
                .get()?
                .call(move |connection| {
                    connection.execute_batch(&sql)?;
                    eyre::Ok(())
                })
                .await
                .map_err(|err| eyre!(err))?;
            eyre::Ok(())
        }
        .await
        .mse()
    }
    async fn execute(
        self,
        handle: usize,
        sql: String,
        params: Vec<IpcJsonValue>,
    ) -> Result<(), String> {
        async {
            let params = params.into_iter().map(Into::into).collect();
            self.connection_pool
                .get_owned(handle)
                .get()?
                .call(move |connection| {
                    connection.execute(&sql, params_from_iter(json_sql_params(params)?))?;
                    eyre::Ok(())
                })
                .await
                .map_err(|err| eyre!(err))?;
            eyre::Ok(())
        }
        .await
        .mse()
    }
    async fn query(
        self,
        handle: usize,
        sql: String,
        params: Vec<IpcJsonValue>,
    ) -> Result<Vec<IpcJsonValue>, String> {
        async {
            let params = params.into_iter().map(Into::into).collect();
            eyre::Ok(
                self.connection_pool
                    .get_owned(handle)
                    .get()?
                    .call(move |connection| {
                        let mut statement = connection.prepare(&sql)?;
                        let column_names = statement
                            .column_names()
                            .into_iter()
                            .map(|v| v.to_string())
                            .collect::<Vec<String>>();
                        let result = statement
                            .query_map(params_from_iter(json_sql_params(params)?), |row| {
                                let mut object = serde_json::Map::new();
                                for (i, key) in column_names.iter().enumerate() {
                                    object.insert(
                                        key.clone(),
                                        row.get::<_, tokio_rusqlite::types::Value>(i)?
                                            .into_json_value(),
                                    );
                                }
                                Ok(IpcJsonValue::from(serde_json::Value::Object(object)))
                            })?
                            .collect::<Result<Vec<_>, _>>()?;
                        eyre::Ok(result)
                    })
                    .await
                    .map_err(|err| eyre!(err))?,
            )
        }
        .await
        .mse()
    }
    async fn on_update(
        self,
        handle: usize,
        channel: Channel<IpcSQLiteUpdateEvent>,
    ) -> Result<(), String> {
        async {
            self.connection_pool
                .get_owned(handle)
                .get()?
                .call(move |connection| {
                    connection.update_hook(Some(
                        move |action: Action, db_name: &str, table_name: &str, row_id| {
                            if let Err(err) = channel.send(IpcSQLiteUpdateEvent {
                                update_type: match action {
                                    Action::SQLITE_DELETE => 9,
                                    Action::SQLITE_INSERT => 18,
                                    Action::SQLITE_UPDATE => 23,
                                    _ => -1,
                                },
                                db_name: db_name.to_string(),
                                table_name: table_name.to_string(),
                                row_id,
                            }) {
                                log::error!("{}", err);
                            }
                        },
                    ));
                    eyre::Ok(())
                })
                .await
                .map_err(|err| eyre!(err))?;
            eyre::Ok(())
        }
        .await
        .mse()
    }
}

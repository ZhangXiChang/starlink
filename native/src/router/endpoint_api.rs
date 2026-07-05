use std::sync::Arc;

use endpoint::{Endpoint, RelayConfig};
use sharded_slab::Slab;
use tauri::{Runtime, Window};
use utils::option_ext::OptionGet;

use crate::{error::MapStringError, router::types::IpcJsonValue};

#[taurpc::procedures(path = "endpoint")]
pub trait EndpointApi {
    async fn generate_secret_key() -> Vec<u8>;
    async fn get_secret_key_id(secret_key: Vec<u8>) -> Result<String, String>;
    async fn generate_group_id() -> String;
    async fn generate_ticket(group_id: String, bootstrap: Vec<String>) -> Result<String, String>;
    async fn open_endpoint<R: Runtime>(
        window: Window<R>,
        secret_key: Vec<u8>,
        person: IpcJsonValue,
        relay_configs: Vec<IpcJsonValue>,
    ) -> Result<usize, String>;
    async fn close_endpoint(handle: usize) -> Result<(), String>;
    async fn id(handle: usize) -> Result<String, String>;
    async fn person_protocol_next_event(handle: usize) -> Result<String, String>;
    async fn person_protocol_event(handle: usize, method: String) -> Result<IpcJsonValue, String>;
    async fn request_person(handle: usize, id: String) -> Result<IpcJsonValue, String>;
    async fn request_friend(handle: usize, id: String) -> Result<bool, String>;
    async fn request_chat(handle: usize, id: String) -> Result<Option<usize>, String>;
    async fn subscribe_group(handle: usize, ticket: String) -> Result<usize, String>;
}

#[derive(Clone, Default)]
pub struct EndpointApiImpl {
    endpoint_pool: Arc<Slab<Endpoint>>,
}
#[taurpc::resolvers]
impl EndpointApi for EndpointApiImpl {
    async fn generate_secret_key(self) -> Vec<u8> {
        endpoint::generate_secret_key()
    }
    async fn get_secret_key_id(self, secret_key: Vec<u8>) -> Result<String, String> {
        endpoint::get_secret_key_id(secret_key).mse()
    }
    async fn generate_group_id(self) -> String {
        endpoint::generate_group_id()
    }
    async fn generate_ticket(
        self,
        group_id: String,
        bootstrap: Vec<String>,
    ) -> Result<String, String> {
        endpoint::generate_ticket(group_id, bootstrap).mse()
    }
    async fn open_endpoint<R: Runtime>(
        self,
        #[allow(unused_variables)] window: Window<R>,
        secret_key: Vec<u8>,
        person: IpcJsonValue,
        relay_configs: Vec<IpcJsonValue>,
    ) -> Result<usize, String> {
        async {
            let store_path;
            #[cfg(not(debug_assertions))]
            {
                use tauri::Manager;

                store_path = window.path().app_local_data_dir()?.join("store");
            }
            #[cfg(debug_assertions)]
            {
                #[cfg(target_os = "android")]
                {
                    use tauri::Manager;

                    store_path = window.path().app_local_data_dir()?.join("store");
                }
                #[cfg(not(target_os = "android"))]
                {
                    store_path = "store";
                }
            }
            eyre::Ok(
                self.endpoint_pool
                    .insert(
                        Endpoint::new(
                            secret_key,
                            serde_json::from_value(person.into())?,
                            store_path,
                            relay_configs
                                .into_iter()
                                .map(|v| serde_json::from_value::<RelayConfig>(v.into()))
                                .collect::<Result<_, _>>()?,
                        )
                        .await?,
                    )
                    .get()?,
            )
        }
        .await
        .mse()
    }
    async fn close_endpoint(self, handle: usize) -> Result<(), String> {
        async {
            if let Some(endpoint) = self.endpoint_pool.take(handle) {
                endpoint.close().await?;
            }
            eyre::Ok(())
        }
        .await
        .mse()
    }
    async fn id(self, handle: usize) -> Result<String, String> {
        Ok(self.endpoint_pool.get(handle).get().mse()?.id())
    }
    async fn person_protocol_next_event(self, handle: usize) -> Result<String, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .person_protocol_next_event()
            .await
            .mse()?)
    }
    async fn person_protocol_event(
        self,
        handle: usize,
        method: String,
    ) -> Result<IpcJsonValue, String> {
        Ok(self
            .endpoint_pool
            .get(handle)
            .get()
            .mse()?
            .person_protocol_event(method)
            .mse()?
            .into())
    }
    async fn request_person(self, handle: usize, id: String) -> Result<IpcJsonValue, String> {
        async {
            eyre::Ok(IpcJsonValue::from(serde_json::to_value(
                &self
                    .endpoint_pool
                    .get_owned(handle)
                    .get()?
                    .request_person(id)
                    .await?,
            )?))
        }
        .await
        .mse()
    }
    async fn request_friend(self, handle: usize, id: String) -> Result<bool, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .request_friend(id)
            .await
            .mse()?)
    }
    async fn request_chat(self, handle: usize, id: String) -> Result<Option<usize>, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .request_chat(id)
            .await
            .mse()?)
    }
    async fn subscribe_group(self, handle: usize, ticket: String) -> Result<usize, String> {
        Ok(self
            .endpoint_pool
            .get_owned(handle)
            .get()
            .mse()?
            .subscribe_group(ticket)
            .await
            .mse()?)
    }
}

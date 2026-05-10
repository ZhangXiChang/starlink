mod error;

use endpoint::RelayConfig;
use eyre::Result;
use wasm_bindgen::{JsError, JsValue, prelude::wasm_bindgen};

use crate::error::MapJsError;

#[wasm_bindgen(start)]
fn start() {
    console_error_panic_hook::set_once();
    wasm_logger::init(wasm_logger::Config::new(log::Level::Info));
}

#[wasm_bindgen]
pub struct Endpoint(endpoint::Endpoint);
#[wasm_bindgen]
impl Endpoint {
    pub async fn new(
        secret_key: Vec<u8>,
        person: JsValue,
        relay_configs: Vec<JsValue>,
    ) -> Result<Self, JsError> {
        Ok(Self(
            endpoint::Endpoint::new(
                secret_key,
                serde_wasm_bindgen::from_value(person)?,
                "",
                relay_configs
                    .into_iter()
                    .map(|v| serde_wasm_bindgen::from_value::<RelayConfig>(v))
                    .collect::<Result<_, _>>()?,
            )
            .await
            .mje()?,
        ))
    }
    pub async fn close(self) -> Result<(), JsError> {
        self.0.close().await.mje()?;
        Ok(())
    }
    pub fn id(&self) -> String {
        self.0.id()
    }
    pub async fn person_protocol_next_event(&self) -> Result<String, JsError> {
        self.0.person_protocol_next_event().await.mje()
    }
    pub fn person_protocol_event(&self, method: String) -> Result<JsValue, JsError> {
        Ok(serde_wasm_bindgen::to_value(
            &self.0.person_protocol_event(method).mje()?,
        )?)
    }
    pub async fn request_person(&self, id: String) -> Result<JsValue, JsError> {
        Ok(serde_wasm_bindgen::to_value(
            &self.0.request_person(id).await.mje()?,
        )?)
    }
    pub async fn request_friend(&self, id: String) -> Result<bool, JsError> {
        self.0.request_friend(id).await.mje()
    }
    pub async fn request_chat(&self, id: String) -> Result<Option<usize>, JsError> {
        self.0.request_chat(id).await.mje()
    }
    pub async fn send_chat_text_message(
        &self,
        connection: usize,
        message: JsValue,
    ) -> Result<(), JsError> {
        self.0
            .send_chat_text_message(connection, serde_wasm_bindgen::from_value(message)?)
            .await
            .mje()
    }
    pub async fn next_chat_text_message(&self, connection: usize) -> Result<JsValue, JsError> {
        Ok(serde_wasm_bindgen::to_value(
            &self.0.next_chat_text_message(connection).await.mje()?,
        )?)
    }
    pub async fn subscribe_group(&self, ticket: String) -> Result<usize, JsError> {
        self.0.subscribe_group(ticket).await.mje()
    }
}

#[wasm_bindgen]
pub fn generate_secret_key() -> Vec<u8> {
    endpoint::generate_secret_key()
}
#[wasm_bindgen]
pub fn get_secret_key_id(secret_key: Vec<u8>) -> Result<String, JsError> {
    endpoint::get_secret_key_id(secret_key).mje()
}
#[wasm_bindgen]
pub fn generate_group_id() -> String {
    endpoint::generate_group_id()
}
#[wasm_bindgen]
pub fn generate_ticket(group_id: String, bootstrap: Vec<String>) -> Result<String, JsError> {
    endpoint::generate_ticket(group_id, bootstrap).mje()
}

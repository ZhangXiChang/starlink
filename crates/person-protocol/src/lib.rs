use std::sync::Arc;

use eyre::{Result, bail, eyre};
use futures::channel::oneshot;
use iroh::{
    Endpoint, EndpointId,
    endpoint::Connection,
    protocol::{AcceptError, ProtocolHandler},
};
use rkyv::Archive;
use strum::Display;

pub const ALPN: &[u8] = b"person/v1";

#[derive(Archive, rkyv::Serialize, rkyv::Deserialize)]
enum Request {
    Person,
    Friend,
    Chat,
}

#[derive(Archive, rkyv::Serialize, rkyv::Deserialize)]
enum Response {
    Person(Person),
    Friend(bool),
    Chat(bool),
}

#[derive(
    Archive, rkyv::Serialize, rkyv::Deserialize, Debug, Clone, serde::Serialize, serde::Deserialize,
)]
pub struct Person {
    pub name: String,
    pub avatar: Option<Vec<u8>>,
    pub bio: String,
}

#[derive(
    Archive, rkyv::Serialize, rkyv::Deserialize, Debug, Clone, serde::Serialize, serde::Deserialize,
)]
pub struct ChatTextMessage {
    pub id: String,
    pub sender_id: String,
    pub created_at: String,
    pub content: String,
}

#[derive(Display)]
pub enum Event {
    FriendRequest(FriendRequest),
    ChatRequest(ChatRequest),
}

pub struct FriendRequest {
    response_sender: oneshot::Sender<bool>,
    remote_id: EndpointId,
}
impl FriendRequest {
    pub fn remote_id(&self) -> EndpointId {
        self.remote_id
    }
    pub fn accept(self) -> Result<()> {
        self.response_sender
            .send(true)
            .map_err(|_| eyre!("发送同意好友请求消息失败"))?;
        Ok(())
    }
    pub fn reject(self) -> Result<()> {
        self.response_sender
            .send(false)
            .map_err(|_| eyre!("发送拒绝好友请求消息失败"))?;
        Ok(())
    }
}

pub struct ChatRequest {
    response_sender: oneshot::Sender<bool>,
    connection: Connection,
}
impl ChatRequest {
    pub fn remote_id(&self) -> EndpointId {
        self.connection.remote_id()
    }
    pub fn accept(self) -> Result<Connection> {
        self.response_sender
            .send(true)
            .map_err(|_| eyre!("发送同意聊天请求消息失败"))?;
        Ok(self.connection)
    }
    pub fn reject(self) -> Result<()> {
        self.response_sender
            .send(false)
            .map_err(|_| eyre!("发送拒绝聊天请求消息失败"))?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct PersonProtocol {
    endpoint: Endpoint,
    person: Arc<Person>,
    event_sender: async_channel::Sender<Event>,
    event_receiver: async_channel::Receiver<Event>,
}
impl PersonProtocol {
    pub fn new(endpoint: Endpoint, person: Person) -> Self {
        let (event_sender, event_receiver) = async_channel::bounded(10);
        Self {
            endpoint,
            person: Arc::new(person),
            event_sender,
            event_receiver,
        }
    }
    async fn handle_connection(&self, connection: Connection) -> Result<()> {
        if let Ok((mut send, mut recv)) = connection.accept_bi().await {
            if let Ok(data) = recv.read_to_end(usize::MAX).await {
                match rkyv::from_bytes::<Request, rkyv::rancor::Error>(&data)? {
                    Request::Person => {
                        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Response::Person(
                            (*self.person).clone(),
                        ))?)
                        .await?;
                        send.finish()?;
                        connection.closed().await;
                    }
                    Request::Friend => {
                        let (sender, receiver) = oneshot::channel::<bool>();
                        self.event_sender
                            .send(Event::FriendRequest(FriendRequest {
                                remote_id: connection.remote_id(),
                                response_sender: sender,
                            }))
                            .await?;
                        let result = receiver.await?;
                        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Response::Friend(
                            result,
                        ))?)
                        .await?;
                        send.finish()?;
                        connection.closed().await;
                    }
                    Request::Chat => {
                        let (sender, receiver) = oneshot::channel::<bool>();
                        self.event_sender
                            .send(Event::ChatRequest(ChatRequest {
                                response_sender: sender,
                                connection,
                            }))
                            .await?;
                        let result = receiver.await?;
                        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Response::Chat(
                            result,
                        ))?)
                        .await?;
                        send.finish()?;
                    }
                }
            }
        }
        Ok(())
    }
    pub async fn next_event(&self) -> Result<Event> {
        Ok(self.event_receiver.recv().await?)
    }
    pub async fn request_person(&self, id: EndpointId) -> Result<Person> {
        let connection = self.endpoint.connect(id, ALPN).await?;
        let (mut send, mut recv) = connection.open_bi().await?;
        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Request::Person)?)
            .await?;
        send.finish()?;
        let Response::Person(person) = rkyv::from_bytes::<Response, rkyv::rancor::Error>(
            &recv.read_to_end(usize::MAX).await?,
        )?
        else {
            bail!("响应数据非预期");
        };
        Ok(person)
    }
    pub async fn request_friend(&self, id: EndpointId) -> Result<bool> {
        let connection = self.endpoint.connect(id, ALPN).await?;
        let (mut send, mut recv) = connection.open_bi().await?;
        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Request::Friend)?)
            .await?;
        send.finish()?;
        let Response::Friend(result) = rkyv::from_bytes::<Response, rkyv::rancor::Error>(
            &recv.read_to_end(usize::MAX).await?,
        )?
        else {
            bail!("响应数据非预期");
        };
        Ok(result)
    }
    pub async fn request_chat(&self, id: EndpointId) -> Result<Option<Connection>> {
        let connection = self.endpoint.connect(id, ALPN).await?;
        let (mut send, mut recv) = connection.open_bi().await?;
        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&Request::Chat)?)
            .await?;
        send.finish()?;
        let Response::Chat(result) = rkyv::from_bytes::<Response, rkyv::rancor::Error>(
            &recv.read_to_end(usize::MAX).await?,
        )?
        else {
            bail!("响应数据非预期");
        };
        if !result {
            return Ok(None);
        }
        Ok(Some(connection))
    }
    pub async fn send_chat_text_message(
        connection: &Connection,
        message: ChatTextMessage,
    ) -> Result<()> {
        let mut send = connection.open_uni().await?;
        send.write_all(&rkyv::to_bytes::<rkyv::rancor::Error>(&message)?)
            .await?;
        send.finish()?;
        Ok(())
    }
    pub async fn next_chat_text_message(connection: &Connection) -> Result<ChatTextMessage> {
        let mut recv = connection.accept_uni().await?;
        Ok(rkyv::from_bytes::<ChatTextMessage, rkyv::rancor::Error>(
            &recv.read_to_end(64 * 1024).await?,
        )?)
    }
}
impl ProtocolHandler for PersonProtocol {
    async fn accept(&self, connection: Connection) -> Result<(), AcceptError> {
        self.handle_connection(connection)
            .await
            .map_err(|err| AcceptError::User {
                source: n0_error::AnyError::from_std_box(err.into()),
                meta: n0_error::meta(),
            })
    }
}

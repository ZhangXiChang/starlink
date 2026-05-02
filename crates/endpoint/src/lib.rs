use std::{path::Path, sync::Arc};

use base64::{Engine, prelude::BASE64_STANDARD};
use eyre::Result;
use iroh::{
    EndpointId, RelayMode, SecretKey,
    address_lookup::{PkarrPublisher, PkarrResolver},
    endpoint::Connection,
    protocol::Router,
};
use iroh_blobs::{BlobsProtocol, api::Store};
use iroh_gossip::{
    Gossip, TopicId,
    api::{GossipReceiver, GossipSender},
};
use iroh_relay::RelayQuicConfig;
use parking_lot::Mutex;
use person_protocol::{Person, PersonProtocol};
use serde::{Deserialize, Serialize};
use sharded_slab::Slab;
use utils::option_ext::OptionGet;

#[derive(Serialize, Deserialize)]
pub struct Ticket {
    pub id: TopicId,
    pub bootstrap: Vec<EndpointId>,
}

#[derive(Serialize, Deserialize)]
pub struct RelayConfig {
    url: String,
    quic_port: u16,
}

#[derive(Clone)]
pub struct Endpoint {
    router: Router,
    person_protocol: PersonProtocol,
    gossip_protocol: Gossip,
    _blobs_protocol: BlobsProtocol,
    connection_pool: Arc<Slab<Connection>>,
    person_protocol_event: Arc<Mutex<Option<person_protocol::Event>>>,
    group_pool: Arc<Slab<(GossipSender, GossipReceiver)>>,
}
impl Endpoint {
    pub async fn new(
        secret_key: Vec<u8>,
        person: Person,
        #[allow(unused_variables)] store_path: impl AsRef<Path>,
        relay_configs: Vec<RelayConfig>,
    ) -> Result<Self> {
        let relay_map = RelayMode::Default.relay_map();
        for config in relay_configs {
            relay_map.insert(
                config.url.parse()?,
                Arc::new(iroh::RelayConfig::new(
                    config.url.parse()?,
                    Some(RelayQuicConfig::new(config.quic_port)),
                )),
            );
        }
        #[allow(unused_mut)]
        let mut endpoint_builder = iroh::endpoint::Builder::empty()
            .relay_mode(RelayMode::Custom(relay_map))
            .address_lookup(PkarrPublisher::n0_dns())
            .address_lookup(PkarrResolver::n0_dns());
        #[cfg(not(target_family = "wasm"))]
        {
            use iroh::address_lookup::{DhtAddressLookup, DnsAddressLookup, MdnsAddressLookup};

            endpoint_builder = endpoint_builder
                .address_lookup(MdnsAddressLookup::builder())
                .address_lookup(DnsAddressLookup::n0_dns())
                .address_lookup(DhtAddressLookup::builder());
        }
        let endpoint = endpoint_builder
            .secret_key(SecretKey::from_bytes(secret_key.as_slice().try_into()?))
            .bind()
            .await?;
        let person_protocol = PersonProtocol::new(endpoint.clone(), person);
        let gossip_protocol = Gossip::builder().spawn(endpoint.clone());
        let store: Store;
        #[cfg(not(target_family = "wasm"))]
        {
            use eyre::eyre;
            use iroh_blobs::store::fs::FsStore;

            store = FsStore::load(store_path.as_ref())
                .await
                .map_err(|err| eyre!(err))?
                .into();
        }
        #[cfg(target_family = "wasm")]
        {
            use iroh_blobs::store::mem::MemStore;

            store = MemStore::new().into();
        }
        let blobs_protocol = BlobsProtocol::new(&store, None);
        let router = Router::builder(endpoint)
            .accept(person_protocol::ALPN, person_protocol.clone())
            .accept(iroh_gossip::ALPN, gossip_protocol.clone())
            .accept(iroh_blobs::ALPN, blobs_protocol.clone())
            .spawn();
        Ok(Self {
            router,
            person_protocol,
            gossip_protocol,
            _blobs_protocol: blobs_protocol,
            connection_pool: Default::default(),
            person_protocol_event: Default::default(),
            group_pool: Default::default(),
        })
    }
    pub async fn close(self) -> Result<()> {
        self.router.shutdown().await?;
        Ok(())
    }
    pub fn id(&self) -> String {
        self.router.endpoint().id().to_string()
    }
    pub async fn person_protocol_next_event(&self) -> Result<String> {
        let event = self.person_protocol.next_event().await?;
        let event_type = event.to_string();
        self.person_protocol_event.lock().replace(event);
        Ok(event_type)
    }
    pub fn person_protocol_event(&self, method: String) -> Result<serde_json::Value> {
        match self.person_protocol_event.lock().take().get()? {
            person_protocol::Event::FriendRequest(friend_request) => match method.as_ref() {
                "remote_id" => return Ok(friend_request.remote_id().to_string().into()),
                "accept" => friend_request.accept()?,
                "reject" => friend_request.reject()?,
                _ => (),
            },
            person_protocol::Event::ChatRequest(chat_request) => match method.as_ref() {
                "remote_id" => return Ok(chat_request.remote_id().to_string().into()),
                "accept" => {
                    return Ok(self
                        .connection_pool
                        .insert(chat_request.accept()?)
                        .get()?
                        .into());
                }
                "reject" => chat_request.reject()?,
                _ => (),
            },
        }
        Ok(().into())
    }
    pub async fn request_person(&self, id: String) -> Result<Person> {
        Ok(self.person_protocol.request_person(id.parse()?).await?)
    }
    pub async fn request_friend(&self, id: String) -> Result<bool> {
        Ok(self.person_protocol.request_friend(id.parse()?).await?)
    }
    pub async fn request_chat(&self, id: String) -> Result<Option<usize>> {
        Ok(self
            .person_protocol
            .request_chat(id.parse()?)
            .await?
            .map(|v| self.connection_pool.insert(v).get())
            .transpose()?)
    }
    pub async fn subscribe_group(&self, ticket: String) -> Result<usize> {
        let ticket = serde_json::from_slice::<Ticket>(&BASE64_STANDARD.decode(ticket)?)?;
        let group = self
            .gossip_protocol
            .subscribe(ticket.id, ticket.bootstrap)
            .await?
            .split();
        Ok(self.group_pool.insert(group).get()?)
    }
}

pub fn generate_secret_key() -> Vec<u8> {
    iroh::SecretKey::generate().to_bytes().to_vec()
}
pub fn get_secret_key_id(secret_key: Vec<u8>) -> Result<String> {
    Ok(
        iroh::SecretKey::from_bytes(secret_key.as_slice().try_into()?)
            .public()
            .to_string(),
    )
}
pub fn generate_group_id() -> String {
    TopicId::from_bytes(rand::random()).to_string()
}
pub fn generate_ticket(group_id: String, bootstrap: Vec<String>) -> Result<String> {
    Ok(BASE64_STANDARD.encode(serde_json::to_vec(&Ticket {
        id: group_id.parse()?,
        bootstrap: bootstrap
            .into_iter()
            .map(|v| v.parse())
            .collect::<Result<_, _>>()?,
    })?))
}

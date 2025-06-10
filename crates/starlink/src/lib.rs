#[cfg(not(target_family = "wasm"))]
use std::path::PathBuf;

use anyhow::Result;
use iroh::{Endpoint, NodeAddr, protocol::Router};
use iroh_gossip::{
    net::{Gossip, GossipReceiver, GossipSender},
    proto::TopicId,
};

#[cfg(not(target_family = "wasm"))]
use iroh_blobs::{
    net_protocol::Blobs,
    rpc::client::blobs::{DownloadProgress, WrapOption},
    store::{ExportFormat, ExportMode, fs::Store},
    ticket::BlobTicket,
    util::SetTagOption,
};

#[derive(Clone)]
pub struct Starlink {
    router: Router,
    gossip: Gossip,
    #[cfg(not(target_family = "wasm"))]
    blobs: Blobs<Store>,
}
impl Starlink {
    pub async fn new() -> Result<Self> {
        #[allow(unused_mut)]
        let mut endpoint_builder = Endpoint::builder().discovery_n0();
        #[cfg(not(target_family = "wasm"))]
        {
            endpoint_builder = endpoint_builder.discovery_local_network().discovery_dht();
        }
        let endpoint = endpoint_builder.bind().await?;
        let gossip = Gossip::builder().spawn(endpoint.clone()).await?;
        #[cfg(not(target_family = "wasm"))]
        let blobs = Blobs::persistent("./cache/").await?.build(&endpoint);
        #[allow(unused_mut)]
        let mut router_builder =
            Router::builder(endpoint).accept(iroh_gossip::ALPN, gossip.clone());
        #[cfg(not(target_family = "wasm"))]
        {
            router_builder = router_builder.accept(iroh_blobs::ALPN, blobs.clone());
        }
        let router = router_builder.spawn();
        Ok(Self {
            router,
            gossip,
            #[cfg(not(target_family = "wasm"))]
            blobs,
        })
    }
    pub async fn node_addr(&self) -> Result<NodeAddr> {
        self.router.endpoint().node_addr().await
    }
    pub async fn subscribe_topic(
        &self,
        topic: TopicId,
        peer_node_addrs: Vec<NodeAddr>,
    ) -> Result<(GossipSender, GossipReceiver)> {
        let mut peer_node_ids = Vec::new();
        for peer_node_addr in peer_node_addrs {
            peer_node_ids.push(peer_node_addr.node_id);
            self.router.endpoint().add_node_addr(peer_node_addr)?;
        }
        let (sender, receiver) = self
            .gossip
            .subscribe_and_join(topic, peer_node_ids)
            .await?
            .split();
        Ok((sender, receiver))
    }
    #[cfg(not(target_family = "wasm"))]
    pub async fn shared_file(&self, path: PathBuf) -> Result<BlobTicket> {
        let add_outcome = self
            .blobs
            .client()
            .add_from_path(path, false, SetTagOption::Auto, WrapOption::NoWrap)
            .await?
            .await?;
        Ok(BlobTicket::new(
            self.router.endpoint().node_addr().await?,
            add_outcome.hash,
            add_outcome.format,
        )?)
    }
    #[cfg(not(target_family = "wasm"))]
    pub async fn download_file(&self, ticket: BlobTicket) -> Result<DownloadProgress> {
        Ok(self
            .blobs
            .client()
            .download(ticket.hash(), ticket.node_addr().clone())
            .await?)
    }
    #[cfg(not(target_family = "wasm"))]
    pub async fn save_file(&self, ticket: BlobTicket, file_name: String) -> Result<()> {
        self.blobs
            .client()
            .export(
                ticket.hash(),
                std::env::current_dir()?.join(file_name),
                ExportFormat::Blob,
                ExportMode::TryReference,
            )
            .await?
            .await?;
        Ok(())
    }
}

use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::PathBuf,
};

use clap::Parser;
use eyre::{Result, eyre};
use iroh_relay::server::{
    CertConfig, DEFAULT_CERT_RELOAD_INTERVAL, QuicConfig, RelayConfig, Server, ServerConfig,
    TlsConfig, reloading_resolver,
};
use serde::{Deserialize, Serialize};
use tokio::fs;

const CONFIG_PATH: &str = "config.toml";

#[derive(Serialize, Deserialize)]
struct Config {
    bind_http_port: u16,
    bind_https_port: u16,
    bind_quic_port: u16,
    key_path: PathBuf,
    fullchain_path: PathBuf,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            bind_http_port: 10280,
            bind_https_port: 10281,
            bind_quic_port: 10282,
            key_path: ".key".into(),
            fullchain_path: ".cer".into(),
        }
    }
}

impl Config {
    fn http_addr(&self) -> SocketAddr {
        Self::bind_addr(self.bind_http_port)
    }

    fn https_addr(&self) -> SocketAddr {
        Self::bind_addr(self.bind_https_port)
    }

    fn quic_addr(&self) -> SocketAddr {
        Self::bind_addr(self.bind_quic_port)
    }

    fn bind_addr(port: u16) -> SocketAddr {
        SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), port)
    }
}

#[derive(Parser)]
struct Args {
    #[arg(long)]
    init: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .init();
    log::info!("日志开始记录");

    let args = Args::parse();
    if args.init {
        init_config().await?;
        return Ok(());
    }

    let config = load_config().await?;
    let server = spawn_server(config).await?;
    run_server(server).await
}

async fn init_config() -> Result<()> {
    fs::write(CONFIG_PATH, toml::to_string_pretty(&Config::default())?).await?;
    log::info!("配置文件初始化成功");
    Ok(())
}

async fn load_config() -> Result<Config> {
    log::info!("加载配置文件");
    let Ok(config_bytes) = fs::read(CONFIG_PATH).await else {
        return Err(eyre!("没有找到配置文件，使用--init初始化配置"));
    };
    Ok(toml::from_slice::<Config>(&config_bytes)?)
}

async fn spawn_server(config: Config) -> Result<Server> {
    log::info!("配置定期热加载证书文件");
    if !config.key_path.try_exists()? {
        return Err(eyre!("证书私钥文件不存在: {}", config.key_path.display()));
    }
    if !config.fullchain_path.try_exists()? {
        return Err(eyre!(
            "证书链文件不存在: {}",
            config.fullchain_path.display()
        ));
    }

    let http_addr = config.http_addr();
    let https_addr = config.https_addr();
    let quic_addr = config.quic_addr();

    let tls_server_config_builder = rustls::ServerConfig::builder().with_no_client_auth();
    let resolver = reloading_resolver(
        tls_server_config_builder.crypto_provider(),
        config.fullchain_path,
        config.key_path,
        DEFAULT_CERT_RELOAD_INTERVAL,
    )
    .await?;
    let tls_server_config = tls_server_config_builder.with_cert_resolver(resolver);

    log::info!("开始创建线程");
    let mut relay_config = RelayConfig::new(http_addr);
    relay_config.tls = Some(TlsConfig::new(
        https_addr,
        CertConfig::Manual {
            server_config: tls_server_config,
        },
    ));
    let mut relay_server_config = ServerConfig::default();
    relay_server_config.relay = Some(relay_config);
    relay_server_config.quic = Some(QuicConfig::new(quic_addr));
    Ok(Server::spawn(relay_server_config).await?)
}

async fn run_server(mut server: Server) -> Result<()> {
    log::info!("线程创建完毕，服务器已启动");
    let should_shutdown = tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            log::info!("用户手动结束");
            true
        }
        result = server.join() => {
            result??;
            log::info!("程序自行退出");
            false
        }
    };
    if should_shutdown {
        server.shutdown().await?;
    }
    log::info!("服务器已关闭");
    Ok(())
}

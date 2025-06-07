use anyhow::Result;

#[cfg(not(target_family = "wasm"))]
pub fn async_task<T>(task: T)
where
    T: Future<Output = ()> + Send + 'static,
{
    tokio::spawn(task);
}

#[cfg(target_family = "wasm")]
pub fn async_task<T>(task: T)
where
    T: Future<Output = ()> + 'static,
{
    wasm_bindgen_futures::spawn_local(task);
}

pub fn open_path(path: impl AsRef<str>) -> Result<()> {
    #[cfg(not(target_family = "wasm"))]
    opener::open(path.as_ref())?;
    #[cfg(target_family = "wasm")]
    {
        use anyhow::anyhow;

        gloo::utils::window()
            .open_with_url(path.as_ref())
            .map_err(|err| anyhow!("{:?}", err))?;
    }
    Ok(())
}

#[cfg(target_family = "wasm")]
pub async fn load_resource(path: impl AsRef<str>) -> Result<Vec<u8>> {
    let resource;
    #[cfg(not(target_family = "wasm"))]
    {
        use tokio::{fs::File, io::AsyncReadExt};

        resource = Vec::new();
        File::open(path.as_ref())
            .await?
            .read_to_end(&mut resource)
            .await?;
    }
    #[cfg(target_family = "wasm")]
    {
        use gloo::net::http::Request;

        resource = Request::get(path.as_ref()).send().await?.binary().await?;
    }
    Ok(resource)
}

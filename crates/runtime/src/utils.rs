use anyhow::Result;

pub fn open_by_os(path: impl Into<String>) -> Result<()> {
    #[cfg(not(target_family = "wasm"))]
    opener::open(path.into())?;
    #[cfg(target_family = "wasm")]
    {
        use anyhow::anyhow;

        gloo::utils::window()
            .open_with_url(&path.into())
            .map_err(|err| anyhow!("{:?}", err))?;
    }
    Ok(())
}

pub async fn load_resource(path: impl Into<String>) -> Result<Vec<u8>> {
    let mut resource = vec![];
    #[cfg(not(target_family = "wasm"))]
    {
        use tokio::{fs::File, io::AsyncReadExt};

        File::open(path.into())
            .await?
            .read_to_end(&mut resource)
            .await?;
    }
    #[cfg(target_family = "wasm")]
    {
        use gloo::net::http::Request;
        let resource = &mut resource;
        *resource = Request::get(&path.into()).send().await?.binary().await?;
    }
    Ok(resource)
}

#[cfg(not(target_family = "wasm"))]
pub mod cei {
    pub fn async_task<T>(task: T)
    where
        T: Future<Output = ()> + Send + 'static,
    {
        tokio::spawn(task);
    }
}

#[cfg(target_family = "wasm")]
pub mod cei {
    pub fn async_task<T>(task: T)
    where
        T: Future<Output = ()> + 'static,
    {
        wasm_bindgen_futures::spawn_local(task);
    }
}

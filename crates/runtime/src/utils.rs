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

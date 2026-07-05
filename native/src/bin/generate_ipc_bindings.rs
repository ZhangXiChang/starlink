use app_lib::router;
use eyre::Result;

const BINDINGS_PATH: &str = "src/generated/ipc_bindings.ts";

#[tokio::main]
async fn main() -> Result<()> {
    taurpc::Exporter::new().export(&router::<tauri::Wry>(), BINDINGS_PATH)?;
    remove_unused_unlisten_import()?;
    Ok(())
}

fn remove_unused_unlisten_import() -> Result<()> {
    let bindings = std::fs::read_to_string(BINDINGS_PATH)?;
    if !bindings.contains("Promise<UnlistenFn>") {
        std::fs::write(BINDINGS_PATH, bindings.replace(", type UnlistenFn", ""))?;
    }
    Ok(())
}

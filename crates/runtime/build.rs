fn main() {
    let target = std::env::var("TARGET").unwrap();
    if target.contains("windows") {
        embed_resource::compile("../../platform-related/windows/.rc", embed_resource::NONE)
            .manifest_optional()
            .unwrap();
    }
}

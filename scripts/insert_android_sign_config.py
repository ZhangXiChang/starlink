from argparse import ArgumentParser
from pathlib import Path
import re
from shutil import copyfile
import sys
from textwrap import indent

ANDROID_PROJECT_DIR = Path("native/gen/android")
GRADLE_BUILD_SCRIPT = ANDROID_PROJECT_DIR / "app/build.gradle.kts"
GENERATED_KEYSTORE_PROPERTIES = ANDROID_PROJECT_DIR / "keystore.properties"

SIGNING_CONFIGS_CODE = """\
signingConfigs {
    create("release") {
        val keystorePropertiesFile = rootProject.file("keystore.properties")
        val keystoreProperties = Properties()
        if (keystorePropertiesFile.exists()) {
            keystoreProperties.load(FileInputStream(keystorePropertiesFile))
        }
        keyAlias = keystoreProperties["keyAlias"] as String
        keyPassword = keystoreProperties["password"] as String
        storeFile = file(keystoreProperties["storeFile"] as String)
        storePassword = keystoreProperties["password"] as String
    }
}
"""
USE_SIGNING_CONFIGS_CODE = 'signingConfig = signingConfigs.getByName("release")'
GENERATED_SIGNING_CONFIG_MARKERS = (
    'val keystorePropertiesFile = rootProject.file("keystore.properties")',
    'storePassword = keystoreProperties["password"] as String',
)


class KeystorePropertiesError(ValueError):
    pass


def format_keystore_properties_error(properties_path: Path) -> str:
    return (
        "错误：无法初始化 Android 签名配置\n"
        "\n"
        "原因：\n"
        f"  未读取到可用的签名配置文件：{properties_path}\n"
        "  该文件不存在，或文件内容为空。\n"
        "\n"
        "应该怎么做：\n"
        f"  请确保 {properties_path} 满足以下条件：\n"
        "  1. 文件存在于项目根目录\n"
        "  2. 文件内容不为空\n"
        "  3. 文件包含以下字段：\n"
        "     storeFile=你的 keystore 文件路径\n"
        "     keyAlias=你的 key alias\n"
        "     password=你的 keystore/key 密码\n"
        "\n"
        "完成后重新运行 android:init。"
    )


def validate_keystore_properties(properties_path: Path):
    if properties_path.exists() and properties_path.read_text(encoding="utf-8").strip():
        return

    raise KeystorePropertiesError(format_keystore_properties_error(properties_path))


def find_matching_brace(source: str, opening_brace_index: int) -> int:
    depth = 0
    for index in range(opening_brace_index, len(source)):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index
    raise ValueError("无法找到匹配的右花括号")


def find_block(source: str, block_header: str, start: int = 0) -> tuple[int, int, int]:
    pattern = re.compile(rf"(?m)^[ \t]*{re.escape(block_header)}[ \t\r\n]*\{{")
    match = pattern.search(source, start)
    if match is None:
        raise ValueError(f"无法找到{block_header}配置块")

    header_index = match.start()
    opening_brace_index = match.end() - 1
    closing_brace_index = find_matching_brace(source, opening_brace_index)
    return header_index, opening_brace_index, closing_brace_index


def find_insertion_point_after_opening_brace_line(
    source: str, opening_brace_index: int
) -> int:
    newline_index = source.find("\n", opening_brace_index)
    if newline_index == -1:
        return opening_brace_index + 1
    return newline_index + 1


def is_generated_signing_config(block: str) -> bool:
    return all(marker in block for marker in GENERATED_SIGNING_CONFIG_MARKERS)


def detect_line_ending(source: str) -> str:
    return "\r\n" if "\r\n" in source else "\n"


def normalize_release_signing_config_line(source: str, release_close: int) -> str:
    config_index = source.rfind(USE_SIGNING_CONFIGS_CODE, 0, release_close)
    if config_index == -1:
        return source

    close_line_start = source.rfind("\n", 0, release_close) + 1
    if close_line_start > config_index:
        return source

    config_end = config_index + len(USE_SIGNING_CONFIGS_CODE)
    if source[config_end:release_close].strip():
        return source

    return (
        source[:config_end]
        + detect_line_ending(source)
        + source[config_end:]
    )


def remove_misplaced_generated_signing_configs(source: str) -> str:
    start = 0
    while True:
        android_header, _, _ = find_block(source, "android")
        try:
            signing_header, _, signing_close = find_block(source, "signingConfigs", start)
        except ValueError:
            return source

        if signing_header >= android_header:
            return source

        signing_block = source[signing_header : signing_close + 1]
        if not is_generated_signing_config(signing_block):
            start = signing_close + 1
            continue

        remove_start = source.rfind("\n", 0, signing_header) + 1
        remove_end = signing_close + 1
        if source.startswith("\r\n", remove_end):
            remove_end += 2
        elif source.startswith("\n", remove_end):
            remove_end += 1
        source = source[:remove_start] + source[remove_end:]
        start = remove_start


def ensure_import(source: str, import_name: str) -> str:
    import_line = f"import {import_name}"
    if import_line in source:
        return source

    lines = source.splitlines(keepends=True)
    insert_index = 0
    for index, line in enumerate(lines):
        if line.startswith("import "):
            insert_index = index + 1

    lines.insert(insert_index, f"{import_line}\n")
    return "".join(lines)


def ensure_android_signing_config(source: str) -> str:
    source = ensure_import(source, "java.util.Properties")
    source = ensure_import(source, "java.io.FileInputStream")
    source = remove_misplaced_generated_signing_configs(source)

    _, android_open, android_close = find_block(source, "android")
    android_body = source[android_open + 1 : android_close]
    if "signingConfigs" not in android_body or 'create("release")' not in android_body:
        insert_at = find_insertion_point_after_opening_brace_line(source, android_open)
        source = (
            source[:insert_at]
            + indent(SIGNING_CONFIGS_CODE, "    ")
            + source[insert_at:]
        )

    _, android_open, android_close = find_block(source, "android")
    _, build_types_open, _ = find_block(source, "buildTypes", android_open)
    _, release_open, release_close = find_block(
        source, 'getByName("release")', build_types_open
    )
    release_body = source[release_open + 1 : release_close]

    if 'signingConfig = signingConfigs.getByName("release")' in release_body:
        return normalize_release_signing_config_line(source, release_close)

    release_close_line_start = source.rfind("\n", 0, release_close) + 1
    return (
        source[:release_close_line_start]
        + indent(USE_SIGNING_CONFIGS_CODE, "            ")
        + detect_line_ending(source)
        + source[release_close_line_start:]
    )


def main():
    arg_parser = ArgumentParser()
    arg_parser.add_argument("path", help="keystore.properties文件路径")
    arg = arg_parser.parse_args()

    keystore_properties_path = Path(arg.path)
    try:
        validate_keystore_properties(keystore_properties_path)
    except KeystorePropertiesError as error:
        print(error, file=sys.stderr)
        raise SystemExit(1) from None

    GENERATED_KEYSTORE_PROPERTIES.parent.mkdir(parents=True, exist_ok=True)
    copyfile(keystore_properties_path, GENERATED_KEYSTORE_PROPERTIES)

    gradle_build_script = GRADLE_BUILD_SCRIPT.read_text(encoding="utf-8")
    gradle_build_script = ensure_android_signing_config(gradle_build_script)
    GRADLE_BUILD_SCRIPT.write_text(gradle_build_script, encoding="utf-8")


if __name__ == "__main__":
    main()

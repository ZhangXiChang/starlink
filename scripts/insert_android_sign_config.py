from argparse import ArgumentParser
from os import path
from shutil import copyfile
from typing import Optional
from kopyt import Parser
from kopyt.node import (
    CallSuffix,
    ImportHeader,
    LineStringLiteral,
    PostfixUnaryExpression,
    SimpleIdentifier,
    ValueArgument,
)
from kopyt.position import Position


def is_postfix_unary_expression(node) -> bool:
    return isinstance(node, PostfixUnaryExpression)


def is_simple_identifier(node, value: Optional[str] = None) -> bool:
    if not isinstance(node, SimpleIdentifier):
        return False
    if value is not None and node.value != value:
        return False
    return True


def is_call_suffix(node) -> bool:
    return isinstance(node, CallSuffix)


def get_call_suffix_with_lambda(node) -> Optional[CallSuffix]:
    if is_call_suffix(node) and node.lambda_expression is not None:
        return node
    return None


def find_suffixes_with_lambda(postfix_node: PostfixUnaryExpression) -> list[CallSuffix]:
    result = []
    for suffix in postfix_node.suffixes:
        call_suffix = get_call_suffix_with_lambda(suffix)
        if call_suffix:
            result.append(call_suffix)
    return result


def find_expression_by_name(
    root_statements, name: str
) -> Optional[PostfixUnaryExpression]:
    for statement in root_statements:
        if not is_postfix_unary_expression(statement.statement):
            continue
        expr = statement.statement
        if is_simple_identifier(expr.expression, name):
            return statement.statement
    return None


def find_call_suffix_with_release_arg(
    postfix_node: PostfixUnaryExpression,
) -> Optional[CallSuffix]:
    if not is_simple_identifier(postfix_node.expression, "getByName"):
        return None

    for suffix in postfix_node.suffixes:
        if not is_call_suffix(suffix):
            continue
        if suffix.arguments is None:
            continue

        for arg in suffix.arguments:
            if not isinstance(arg, ValueArgument):
                continue
            if not isinstance(arg.value, LineStringLiteral):
                continue
            if arg.value.value == '"release"':
                return suffix

    return None


def find_release_buildtype_suffix(
    android_statement: PostfixUnaryExpression,
) -> Optional[CallSuffix]:
    for buildtypes_suffix in android_statement.suffixes:
        call_suffix = get_call_suffix_with_lambda(buildtypes_suffix)
        if not call_suffix:
            continue

        buildtypes_lambda = call_suffix.lambda_expression.value
        buildtypes_expr = find_expression_by_name(
            buildtypes_lambda.statements, "buildTypes"
        )
        if not buildtypes_expr:
            continue

        release_suffix = find_call_suffix_with_release_arg(buildtypes_expr)
        if release_suffix:
            return release_suffix

    return None


arg_parser = ArgumentParser()
arg_parser.add_argument("path", help="keystore.properties文件路径")
arg = arg_parser.parse_args()

if not path.exists(arg.path):
    print(
        f"{arg.path}文件不存在，请创建{arg.path}文件填写storeFile、keyAlias、password参数"
    )
    exit(1)
copyfile(arg.path, "native/gen/android/keystore.properties")

gradle_build_script_file = open(
    "native/gen/android/app/build.gradle.kts", "r+", encoding="utf-8"
)
gradle_build_script = Parser(gradle_build_script_file.read()).parse_script()

gradle_build_script.imports = list(gradle_build_script.imports) + [
    ImportHeader(Position(1, 1), "java.io.FileInputStream", False, None)
]

signing_configs_code = """signingConfigs {
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
}"""
use_signing_configs_code = 'signingConfig = signingConfigs.getByName("release")'

for root_statement in gradle_build_script.statements:
    if not is_postfix_unary_expression(root_statement.statement):
        continue

    android_expr = root_statement.statement
    if not is_simple_identifier(android_expr.expression, "android"):
        continue

    call_suffixes = find_suffixes_with_lambda(android_expr)
    if not call_suffixes:
        continue

    android_call = call_suffixes[0]
    android_lambda = android_call.lambda_expression.value

    android_lambda.statements = [Parser(signing_configs_code).parse_statement()] + list(
        android_lambda.statements
    )

    release_suffix = find_release_buildtype_suffix(android_expr)
    if release_suffix and release_suffix.lambda_expression:
        release_suffix.lambda_expression.value.statements = list(
            release_suffix.lambda_expression.value.statements
        ) + [Parser(use_signing_configs_code).parse_statement()]

    break

gradle_build_script_file.seek(0)
gradle_build_script_file.truncate()
gradle_build_script_file.write(gradle_build_script.__str__())
gradle_build_script_file.close()

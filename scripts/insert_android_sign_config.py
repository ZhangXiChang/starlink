from argparse import ArgumentParser
from os import path
from shutil import copyfile
from kopyt import Parser
from kopyt.node import (
    ImportHeader,
    PostfixUnaryExpression,
    SimpleIdentifier,
    CallSuffix,
    ValueArgument,
    LineStringLiteral,
)
from kopyt.position import Position

arg_parser = ArgumentParser()
arg_parser.add_argument("path", help="keystore.properties文件路径")
arg = arg_parser.parse_args()

if not path.exists(arg.path):
    print(f"{arg.path}文件不存在，请创建在项目根目录{arg.path}文件填写storeFile、keyAlias、password参数")
    exit(-1)
copyfile(arg.path, "native/gen/android/keystore.properties")

gradle_build_script_file = open(
    "native/gen/android/app/build.gradle.kts", "r+", encoding="utf-8"
)
gradle_build_script = Parser(gradle_build_script_file.read()).parse_script()
gradle_build_script.imports = list(gradle_build_script.imports) + [
    ImportHeader(
        Position(1, 1),
        "java.io.FileInputStream",
        False,
        None,
    )
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
    if isinstance(root_statement.statement, PostfixUnaryExpression):
        if isinstance(root_statement.statement.expression, SimpleIdentifier):
            if root_statement.statement.expression.value == "android":
                for android_suffixe in root_statement.statement.suffixes:
                    if isinstance(android_suffixe, CallSuffix):
                        if android_suffixe.lambda_expression != None:
                            android_suffixe.lambda_expression.value.statements = [
                                Parser(signing_configs_code).parse_statement()
                            ] + list(android_suffixe.lambda_expression.value.statements)
                            for (
                                android_statement
                            ) in android_suffixe.lambda_expression.value.statements:
                                if isinstance(
                                    android_statement.statement, PostfixUnaryExpression
                                ):
                                    if isinstance(
                                        android_statement.statement.expression,
                                        SimpleIdentifier,
                                    ):
                                        if (
                                            android_statement.statement.expression.value
                                            == "buildTypes"
                                        ):
                                            for (
                                                buildtypes_suffixe
                                            ) in android_statement.statement.suffixes:
                                                if isinstance(
                                                    buildtypes_suffixe, CallSuffix
                                                ):
                                                    if (
                                                        buildtypes_suffixe.lambda_expression
                                                        != None
                                                    ):
                                                        for (
                                                            buildtypes_statement
                                                        ) in (
                                                            buildtypes_suffixe.lambda_expression.value.statements
                                                        ):
                                                            if isinstance(
                                                                buildtypes_statement.statement,
                                                                PostfixUnaryExpression,
                                                            ):
                                                                if isinstance(
                                                                    buildtypes_statement.statement.expression,
                                                                    SimpleIdentifier,
                                                                ):
                                                                    if (
                                                                        buildtypes_statement.statement.expression.value
                                                                        == "getByName"
                                                                    ):
                                                                        for getbyname_suffixe in (
                                                                            buildtypes_statement.statement.suffixes
                                                                        ):
                                                                            if isinstance(
                                                                                getbyname_suffixe,
                                                                                CallSuffix,
                                                                            ):
                                                                                if (
                                                                                    getbyname_suffixe.arguments
                                                                                    != None
                                                                                ):
                                                                                    for getbyname_suffixe_argument in (
                                                                                        getbyname_suffixe.arguments
                                                                                    ):
                                                                                        if isinstance(
                                                                                            getbyname_suffixe_argument,
                                                                                            ValueArgument,
                                                                                        ):
                                                                                            if isinstance(
                                                                                                getbyname_suffixe_argument.value,
                                                                                                LineStringLiteral,
                                                                                            ):
                                                                                                if (
                                                                                                    getbyname_suffixe_argument.value.value
                                                                                                    == '"release"'
                                                                                                ):
                                                                                                    if (
                                                                                                        getbyname_suffixe.lambda_expression
                                                                                                        != None
                                                                                                    ):
                                                                                                        getbyname_suffixe.lambda_expression.value.statements = list(
                                                                                                            getbyname_suffixe.lambda_expression.value.statements
                                                                                                        ) + [
                                                                                                            Parser(
                                                                                                                use_signing_configs_code
                                                                                                            ).parse_statement()
                                                                                                        ]
gradle_build_script_file.seek(0)
gradle_build_script_file.truncate()
gradle_build_script_file.write(gradle_build_script.__str__())
gradle_build_script_file.close()

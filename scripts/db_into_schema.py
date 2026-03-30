import os
import re
import sqlite3
from argparse import ArgumentParser

arg_parser = ArgumentParser()
arg_parser.add_argument("db_path", help="数据库路径")
arg = arg_parser.parse_args()

db_conn = sqlite3.connect(arg.db_path)
db_schema = db_conn.execute(
    "SELECT sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE 'sqlean_%'"
).fetchall()
db_conn.close()
os.remove(arg.db_path)

file = open("public/db_schema.sql", "w", encoding="utf-8")
statements = []
for row in db_schema:
    row = re.sub(
        r'(CREATE\s+(?:TEMPORARY\s+|VIRTUAL\s+|UNIQUE\s+)?(?:TABLE|INDEX|VIEW|TRIGGER)\s*)(["\'`\[])',
        r"\1IF NOT EXISTS \2",
        row[0],
    )
    statements.append(row + ";")
file.write("\n".join(statements))
file.close()

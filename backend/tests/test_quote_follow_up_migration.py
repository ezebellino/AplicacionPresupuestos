import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, text


def test_additive_reminder_migration_preserves_existing_quotes(tmp_path):
    path = Path(__file__).parents[1] / "alembic/versions/0016_quote_follow_up.py"
    spec = importlib.util.spec_from_file_location("follow_up_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_engine(f"sqlite:///{(tmp_path / 'migration.db').as_posix()}")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE quotes (id INTEGER PRIMARY KEY, status TEXT, total NUMERIC)"))
        connection.execute(text("INSERT INTO quotes VALUES (1, 'issued', 123.45), (2, 'accepted', 200)"))
        original = connection.execute(text("SELECT * FROM quotes ORDER BY id")).all()
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            assert connection.execute(text("SELECT id, status, total FROM quotes ORDER BY id")).all() == original
            assert connection.execute(text("SELECT follow_up_at FROM quotes")).scalars().all() == [None, None]
            migration.downgrade()
            assert "follow_up_at" not in {column["name"] for column in inspect(connection).get_columns("quotes")}
            migration.upgrade()
            assert connection.execute(text("SELECT id, status, total FROM quotes ORDER BY id")).all() == original
    engine.dispose()

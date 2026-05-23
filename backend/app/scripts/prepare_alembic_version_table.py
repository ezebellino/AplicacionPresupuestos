from sqlalchemy import create_engine, text

from app.core.config import settings


def main() -> None:
    engine = create_engine(settings.sqlalchemy_database_url)

    with engine.begin() as connection:
        if connection.dialect.name == "postgresql":
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS alembic_version (
                      version_num VARCHAR(64) NOT NULL PRIMARY KEY
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    ALTER TABLE alembic_version
                    ALTER COLUMN version_num TYPE VARCHAR(64)
                    """
                )
            )
            return

        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS alembic_version (
                  version_num VARCHAR(64) NOT NULL PRIMARY KEY
                )
                """
            )
        )


if __name__ == "__main__":
    main()

from sqlalchemy import ForeignKeyConstraint, UniqueConstraint, create_engine, inspect

from app.infra.models import Base, CostCategory, QuoteStatus


def test_initial_schema_contains_core_tables():
    tables = set(Base.metadata.tables.keys())

    assert {
        "tenants",
        "users",
        "clients",
        "cost_items",
        "quotes",
        "quote_items",
    }.issubset(tables)


def test_enums_match_mvp_states_and_categories():
    assert [item.value for item in CostCategory] == [
        "equipment",
        "materials",
        "labor",
        "services",
    ]
    assert [item.value for item in QuoteStatus] == [
        "draft",
        "issued",
        "accepted",
        "rejected",
    ]


def test_quote_items_include_timestamps():
    columns = set(Base.metadata.tables["quote_items"].columns.keys())

    assert {"created_at", "updated_at"}.issubset(columns)


def test_tenant_scoped_tables_have_tenant_indexes():
    expected_indexes = {
        "users": ("tenant_id",),
        "clients": ("tenant_id",),
        "cost_items": ("tenant_id",),
        "quotes": ("tenant_id",),
        "quote_items": ("tenant_id",),
    }

    for table_name, columns in expected_indexes.items():
        table = Base.metadata.tables[table_name]
        index_columns = {tuple(index.columns.keys()) for index in table.indexes}

        assert columns in index_columns


def test_tenant_owned_tables_have_composite_identity_constraints():
    for table_name in ["clients", "cost_items", "quotes"]:
        table = Base.metadata.tables[table_name]
        unique_columns = {
            tuple(constraint.columns.keys())
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        }

        assert ("id", "tenant_id") in unique_columns


def test_cross_tenant_relationships_use_composite_foreign_keys():
    expected_foreign_keys = {
        "quotes": {
            (("client_id", "tenant_id"), "clients", ("id", "tenant_id")),
        },
        "quote_items": {
            (("quote_id", "tenant_id"), "quotes", ("id", "tenant_id")),
            (("source_cost_item_id", "tenant_id"), "cost_items", ("id", "tenant_id")),
        },
    }

    for table_name, expected_specs in expected_foreign_keys.items():
        table = Base.metadata.tables[table_name]
        foreign_key_specs = {
            (
                tuple(constraint.column_keys),
                constraint.referred_table.name,
                tuple(element.column.name for element in constraint.elements),
            )
            for constraint in table.constraints
            if isinstance(constraint, ForeignKeyConstraint)
        }

        assert expected_specs.issubset(foreign_key_specs)


def test_metadata_creates_sqlite_schema():
    engine = create_engine("sqlite+pysqlite:///:memory:")

    try:
        Base.metadata.create_all(engine)

        table_names = set(inspect(engine).get_table_names())
        assert {
            "tenants",
            "users",
            "clients",
            "cost_items",
            "quotes",
            "quote_items",
        }.issubset(table_names)
    finally:
        Base.metadata.drop_all(engine)

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

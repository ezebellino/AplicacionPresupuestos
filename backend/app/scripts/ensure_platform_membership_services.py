import argparse
from decimal import Decimal

from sqlalchemy import select

from app.domain.enums import CostCategory
from app.infra.db import SessionLocal
from app.infra.models import CostItem, User


MEMBERSHIP_SERVICES = (
    {
        "name": "Cobro Mensual",
        "description": "Membresia mensual FacturEasy.",
        "unit_cost": Decimal("5000.00"),
    },
    {
        "name": "Cobro Trimestral",
        "description": "Membresia trimestral FacturEasy con 5% de bonificacion.",
        "unit_cost": Decimal("14250.00"),
    },
    {
        "name": "Cobro Semestral",
        "description": "Membresia semestral FacturEasy con 10% de bonificacion.",
        "unit_cost": Decimal("27000.00"),
    },
    {
        "name": "Cobro Anual",
        "description": "Membresia anual FacturEasy con 15% de bonificacion.",
        "unit_cost": Decimal("51000.00"),
    },
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or update the default membership services for the FacturEasy platform tenant.",
    )
    parser.add_argument(
        "--email",
        required=True,
        help="Platform admin email used to resolve the platform tenant.",
    )
    args = parser.parse_args()

    email = args.email.strip().lower()
    if not email:
        raise SystemExit("--email cannot be empty")

    with SessionLocal() as db:
        platform_admin = db.scalar(
            select(User).where(
                User.email == email,
                User.role == "platform_admin",
                User.is_active.is_(True),
            )
        )

        if platform_admin is None:
            raise SystemExit("platform_admin not found for that email")

        created = 0
        updated = 0

        for service in MEMBERSHIP_SERVICES:
            item = db.scalar(
                select(CostItem).where(
                    CostItem.tenant_id == platform_admin.tenant_id,
                    CostItem.name == service["name"],
                )
            )

            if item is None:
                item = CostItem(
                    tenant_id=platform_admin.tenant_id,
                    category=CostCategory.SERVICES,
                    name=service["name"],
                    description=service["description"],
                    unit="servicio",
                    unit_cost=service["unit_cost"],
                    tax_rate=None,
                    is_active=True,
                )
                db.add(item)
                created += 1
                continue

            item.category = CostCategory.SERVICES
            item.description = service["description"]
            item.unit = "servicio"
            item.unit_cost = service["unit_cost"]
            item.tax_rate = None
            item.is_active = True
            updated += 1

        db.commit()

    print(
        f"Platform membership services synchronized for {email}: "
        f"{created} created, {updated} updated"
    )


if __name__ == "__main__":
    main()

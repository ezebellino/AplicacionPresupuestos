import argparse

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.infra.db import SessionLocal
from app.infra.models import Tenant, User


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or promote the FacturEasy platform admin user.",
    )
    parser.add_argument("--email", required=True, help="Platform admin email.")
    parser.add_argument(
        "--password",
        help="Password to set. Required when the user does not exist.",
    )
    parser.add_argument(
        "--tenant-name",
        default="FacturEasy Platform",
        help="Tenant name used when creating the first platform admin.",
    )
    args = parser.parse_args()

    email = args.email.strip().lower()
    if not email:
        raise SystemExit("--email cannot be empty")

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))

        if user is None:
            if not args.password or len(args.password) < 8:
                raise SystemExit("--password is required and must be at least 8 characters")

            tenant = Tenant(name=args.tenant_name.strip() or "FacturEasy Platform")
            user = User(
                tenant=tenant,
                email=email,
                password_hash=hash_password(args.password),
                role="platform_admin",
            )
            db.add(tenant)
            db.add(user)
            action = "created"
        else:
            user.role = "platform_admin"
            user.is_active = True
            if args.password:
                if len(args.password) < 8:
                    raise SystemExit("--password must be at least 8 characters")
                user.password_hash = hash_password(args.password)
            action = "promoted"

        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise SystemExit(f"Could not ensure platform admin: {exc.orig}") from exc

    print(f"Platform admin {action}: {email}")


if __name__ == "__main__":
    main()

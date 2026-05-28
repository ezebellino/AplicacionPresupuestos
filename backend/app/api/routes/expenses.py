from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.infra.models import User
from app.schemas.expenses import (
    ExpenseCategoryCreate,
    ExpenseCategoryList,
    ExpenseCategoryRead,
    ExpenseEntryCreate,
    ExpenseEntryList,
    ExpenseEntryRead,
    ExpenseEntryUpdate,
)
from app.services.expenses_service import (
    create_expense_category,
    create_expense_entry,
    deactivate_expense_category,
    list_expense_categories,
    list_expense_entries,
    serialize_expense_entry,
    update_expense_entry,
)


router = APIRouter()


@router.get("", response_model=ExpenseEntryList)
def list_current_tenant_expenses(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, object]:
    return {
        "items": [
            serialize_expense_entry(entry)
            for entry in list_expense_entries(db, current_user.tenant_id)
        ]
    }


@router.post("", response_model=ExpenseEntryRead, status_code=status.HTTP_201_CREATED)
def create_current_tenant_expense(
    payload: ExpenseEntryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        entry = create_expense_entry(db, current_user.tenant_id, payload, current_user)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return serialize_expense_entry(entry)


@router.patch("/{expense_id}", response_model=ExpenseEntryRead)
def update_current_tenant_expense(
    expense_id: UUID,
    payload: ExpenseEntryUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        entry = update_expense_entry(db, current_user.tenant_id, expense_id, payload, current_user)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    return serialize_expense_entry(entry)


@router.get("/categories", response_model=ExpenseCategoryList)
def list_current_tenant_expense_categories(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, object]:
    return {"items": list_expense_categories(db, current_user.tenant_id)}


@router.post("/categories", response_model=ExpenseCategoryRead, status_code=status.HTTP_201_CREATED)
def create_current_tenant_expense_category(
    payload: ExpenseCategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return create_expense_category(db, current_user.tenant_id, payload, current_user)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_current_tenant_expense_category(
    category_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    deleted = deactivate_expense_category(db, current_user.tenant_id, category_id, current_user)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

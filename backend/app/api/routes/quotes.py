from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.infra.models import User
from app.schemas.quotes import (
    QuoteCreate,
    QuoteItemCreate,
    QuoteItemRead,
    QuoteItemUpdate,
    QuoteList,
    QuoteRead,
    QuoteUpdate,
)
from app.services.quotes_service import (
    QuoteConflictError,
    QuoteValidationError,
    accept_quote,
    add_quote_item,
    create_quote,
    delete_quote_item,
    get_quote,
    issue_quote,
    list_quotes,
    reject_quote,
    serialize_quote,
    serialize_quote_item,
    update_quote,
    update_quote_item,
)


router = APIRouter()


@router.get("", response_model=QuoteList)
def list_current_tenant_quotes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, object]:
    return {
        "items": [
            serialize_quote(quote)
            for quote in list_quotes(db, current_user.tenant_id)
        ]
    }


@router.post("", response_model=QuoteRead, status_code=status.HTTP_201_CREATED)
def create_current_tenant_quote(
    payload: QuoteCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        quote = create_quote(db, current_user.tenant_id, payload)
    except QuoteConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    return serialize_quote(quote)


@router.get("/{quote_id}", response_model=QuoteRead)
def get_current_tenant_quote(
    quote_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    quote = get_quote(db, current_user.tenant_id, quote_id)

    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found",
        )

    return serialize_quote(quote)


@router.patch("/{quote_id}", response_model=QuoteRead)
def update_current_tenant_quote(
    quote_id: UUID,
    payload: QuoteUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        quote = update_quote(db, current_user.tenant_id, quote_id, payload)
    except QuoteConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except QuoteValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found",
        )

    return serialize_quote(quote)


@router.post(
    "/{quote_id}/items",
    response_model=QuoteItemRead,
    status_code=status.HTTP_201_CREATED,
)
def add_current_tenant_quote_item(
    quote_id: UUID,
    payload: QuoteItemCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        item = add_quote_item(db, current_user.tenant, quote_id, payload)
    except QuoteConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except QuoteValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote or cost item not found",
        )

    return serialize_quote_item(item)


@router.patch("/{quote_id}/items/{item_id}", response_model=QuoteItemRead)
def update_current_tenant_quote_item(
    quote_id: UUID,
    item_id: UUID,
    payload: QuoteItemUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        item = update_quote_item(
            db,
            current_user.tenant_id,
            quote_id,
            item_id,
            payload,
        )
    except QuoteConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except QuoteValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote item not found",
        )

    return serialize_quote_item(item)


@router.delete("/{quote_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_tenant_quote_item(
    quote_id: UUID,
    item_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    try:
        deleted = delete_quote_item(db, current_user.tenant_id, quote_id, item_id)
    except QuoteConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote item not found",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{quote_id}/issue", response_model=QuoteRead)
def issue_current_tenant_quote(
    quote_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        quote = issue_quote(db, current_user.tenant_id, quote_id)
    except QuoteConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found",
        )

    return serialize_quote(quote)


@router.post("/{quote_id}/accept", response_model=QuoteRead)
def accept_current_tenant_quote(
    quote_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        quote = accept_quote(db, current_user.tenant_id, quote_id)
    except QuoteConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found",
        )

    return serialize_quote(quote)


@router.post("/{quote_id}/reject", response_model=QuoteRead)
def reject_current_tenant_quote(
    quote_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        quote = reject_quote(db, current_user.tenant_id, quote_id)
    except QuoteConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found",
        )

    return serialize_quote(quote)

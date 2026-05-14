from enum import StrEnum


class CostCategory(StrEnum):
    EQUIPMENT = "equipment"
    MATERIALS = "materials"
    LABOR = "labor"
    SERVICES = "services"


class QuoteStatus(StrEnum):
    DRAFT = "draft"
    ISSUED = "issued"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

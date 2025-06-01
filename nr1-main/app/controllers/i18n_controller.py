from fastapi import HTTPException, status
from app.schemas import SetLanguageIn
from ..services.i18n_service import (
    get_translations_service,
    set_language_service,
)

def get_translations():
    return get_translations_service()

def set_language(data: SetLanguageIn):
    return set_language_service(data)

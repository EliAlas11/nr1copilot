from fastapi import HTTPException, status
from ..services.i18n_service import (
    get_translations_service,
    set_language_service,
)

def get_translations():
    return get_translations_service()

def set_language(data):
    return set_language_service(data)

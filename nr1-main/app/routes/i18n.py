from fastapi import APIRouter
from ..controllers.i18n_controller import (
    get_translations,
    set_language,
)

router = APIRouter(prefix="/api/v1/i18n", tags=["I18N"])

@router.get("/translations")
def translations():
    return get_translations()

@router.post("/set-language")
def set_lang(data: dict):
    return set_language(data)

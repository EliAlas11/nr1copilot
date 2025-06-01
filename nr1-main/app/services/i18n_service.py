from app.schemas import SetLanguageIn, SetLanguageOut, TranslationsOut

def get_translations_service() -> TranslationsOut:
    # TODO: Implement translation retrieval logic
    return TranslationsOut(translations={"en": "English only"})

def set_language_service(data: SetLanguageIn) -> SetLanguageOut:
    # TODO: Implement language setting logic
    return SetLanguageOut(message=f"Language set to {data.language}")

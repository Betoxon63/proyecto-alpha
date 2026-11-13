from django.apps import AppConfig


class CardexAuditoriaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cardex_auditoria'

    def ready(self):
        import cardex_auditoria.signals
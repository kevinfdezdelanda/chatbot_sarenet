from django.apps import AppConfig
from .state import update_query_engine, load_and_index_documents



class AppSarebotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app_sarebot'
    
    def ready(self):
        load_and_index_documents()
        update_query_engine()
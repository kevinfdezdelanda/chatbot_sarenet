from django.apps import AppConfig
from .state import NODES, update_query_engine



class AppSarebotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app_sarebot'
    
    def ready(self):
        if NODES:
            update_query_engine()
# from django.urls import path
# from . import views
#
# urlpatterns = [
#     path('', views.home, name='home'),
#     path('register/', views.register_view, name='register'),
#     path('login/', views.login_view, name='login'),
#     path('logout/', views.logout_view, name='logout'),
#     path('dashboard/', views.dashboard, name='dashboard'),
#     path('transfer/', views.transfer_view, name='transfer'),
#     path('transactions/', views.transaction_history, name='transactions'),
#     path('open-account/', views.open_account_view, name='open_account'),
#     path('account/<int:account_id>/', views.account_detail, name='account_detail'),
#     path('profile/', views.profile_view, name='profile'),
#     path('account/<int:account_id>/freeze/', views.freeze_account_view, name='freeze_account'),
#     path('account/<int:account_id>/actions/', views.account_actions_view, name='account_actions'),
#     path('change-currency/', views.change_currency_view, name='change_currency'),
#     path('set-currency/<int:currency_id>/', views.set_display_currency, name='set_display_currency'),
#     path('dashboard/', views.dashboard, name='dashboard'),
#     path('change-currency/', views.change_currency_view, name='change_currency'),
#     path('set-display-currency/<int:currency_id>/', views.set_display_currency, name='set_display_currency'),
#     path('exchange-rates/', views.exchange_rates_view, name='exchange_rates'),
#     path('pending_accounts/', views.pending_accounts_view, name='pending_accounts'),
# ]

from django.urls import path
from . import views

# urlpatterns = [
#     path('', views.home, name='home'),
#     path('login/', views.login_view, name='login'),
#     path('register/', views.register_view, name='register'),
#     path('logout/', views.logout_view, name='logout'),
#     path('dashboard/', views.dashboard, name='dashboard'),
#     path('transfer/', views.transfer_view, name='transfer'),
#     path('transactions/', views.transaction_history, name='transactions'),  # Было transaction_history
#     path('open_account/', views.open_account_view, name='open_account'),
#     path('account/<int:account_id>/', views.account_detail, name='account_detail'),
#     path('profile/', views.profile_view, name='profile'),
#     path('freeze_account/<int:account_id>/', views.freeze_account_view, name='freeze_account'),
#     path('account_actions/<int:account_id>/', views.account_actions_view, name='account_actions'),
#     path('change_currency/', views.change_currency_view, name='change_currency'),
#     path('set_display_currency/<int:currency_id>/', views.set_display_currency, name='set_display_currency'),
#     path('exchange_rates/', views.exchange_rates_view, name='exchange_rates'),
#     path('pending_accounts/', views.pending_accounts_view, name='pending_accounts'),
# ]
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('transfer/', views.transfer_view, name='transfer'),
    path('transactions/', views.transaction_history, name='transactions'),
    path('open_account/', views.open_account_view, name='open_account'),
    path('account/<int:account_id>/', views.account_detail, name='account_detail'),
    path('profile/', views.profile_view, name='profile'),
    path('freeze_account/<int:account_id>/', views.freeze_account_view, name='freeze_account'),
    path('account_actions/<int:account_id>/', views.account_actions_view, name='account_actions'),
    path('change_currency/', views.change_currency_view, name='change_currency'),
    path('set_display_currency/<int:currency_id>/', views.set_display_currency, name='set_display_currency'),
    path('exchange_rates/', views.exchange_rates_view, name='exchange_rates'),
    path('pending_accounts/', views.pending_accounts_view, name='pending_accounts'),
    path('create_government_account/', views.create_government_account_view, name='create_government_account'),  # Новый маршрут
]
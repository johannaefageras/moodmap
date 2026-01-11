"""
URL patterns for user authentication.
"""
from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('me/', views.UserProfileView.as_view(), name='profile'),
    path('me/password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('me/delete/', views.DeleteAccountView.as_view(), name='delete-account'),
]

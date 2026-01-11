"""
Custom User model for Humörkarta.

Uses email as the primary identifier instead of username.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager for User model with email as identifier."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError('E-postadress krävs')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser måste ha is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser måste ha is_superuser=True')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model using email instead of username.
    
    Minimal profile - privacy first, no unnecessary data collection.
    """
    email = models.EmailField(
        'e-postadress',
        unique=True,
        error_messages={
            'unique': 'En användare med denna e-postadress finns redan.',
        },
    )
    
    # Optional display name (not required for privacy)
    display_name = models.CharField('visningsnamn', max_length=50, blank=True)
    
    # Account status
    is_active = models.BooleanField('aktiv', default=True)
    is_staff = models.BooleanField('personal', default=False)
    
    # Timestamps
    date_joined = models.DateTimeField('registreringsdatum', default=timezone.now)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    class Meta:
        verbose_name = 'användare'
        verbose_name_plural = 'användare'
    
    def __str__(self):
        return self.email
    
    def get_short_name(self):
        """Return display name or email prefix."""
        return self.display_name or self.email.split('@')[0]

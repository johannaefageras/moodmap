"""
Tests for custom User model.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class UserModelTests(TestCase):
    """Tests for the custom User model."""
    
    def test_create_user_with_email(self):
        """Test creating a user with email is successful."""
        email = 'test@example.com'
        password = 'testpass123'
        user = User.objects.create_user(email=email, password=password)
        
        self.assertEqual(user.email, email)
        self.assertTrue(user.check_password(password))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
    
    def test_new_user_email_normalized(self):
        """Test email is normalized for new users."""
        sample_emails = [
            ['test1@EXAMPLE.com', 'test1@example.com'],
            ['Test2@Example.com', 'Test2@example.com'],
            ['TEST3@EXAMPLE.COM', 'TEST3@example.com'],
            ['test4@example.COM', 'test4@example.com'],
        ]
        
        for email, expected in sample_emails:
            user = User.objects.create_user(email=email, password='test123')
            self.assertEqual(user.email, expected)
    
    def test_new_user_without_email_raises_error(self):
        """Test that creating user without email raises error."""
        with self.assertRaises(ValueError):
            User.objects.create_user(email='', password='test123')
    
    def test_create_superuser(self):
        """Test creating a superuser."""
        user = User.objects.create_superuser(
            email='admin@example.com',
            password='admin123'
        )
        
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
    
    def test_create_superuser_without_is_staff_raises_error(self):
        """Test superuser must have is_staff=True."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email='admin@example.com',
                password='admin123',
                is_staff=False
            )
    
    def test_create_superuser_without_is_superuser_raises_error(self):
        """Test superuser must have is_superuser=True."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email='admin@example.com',
                password='admin123',
                is_superuser=False
            )
    
    def test_user_str(self):
        """Test user string representation."""
        user = User.objects.create_user(
            email='test@example.com',
            password='test123'
        )
        self.assertEqual(str(user), 'test@example.com')
    
    def test_user_get_short_name_with_display_name(self):
        """Test get_short_name returns display_name when set."""
        user = User.objects.create_user(
            email='test@example.com',
            password='test123',
            display_name='Johan'
        )
        self.assertEqual(user.get_short_name(), 'Johan')
    
    def test_user_get_short_name_without_display_name(self):
        """Test get_short_name returns email prefix when no display_name."""
        user = User.objects.create_user(
            email='test@example.com',
            password='test123'
        )
        self.assertEqual(user.get_short_name(), 'test')
    
    def test_user_display_name_optional(self):
        """Test that display_name is optional."""
        user = User.objects.create_user(
            email='test@example.com',
            password='test123'
        )
        self.assertEqual(user.display_name, '')
    
    def test_user_email_unique(self):
        """Test that email must be unique."""
        User.objects.create_user(
            email='test@example.com',
            password='test123'
        )
        
        with self.assertRaises(Exception):
            User.objects.create_user(
                email='test@example.com',
                password='different123'
            )

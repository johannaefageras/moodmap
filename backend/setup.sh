#!/usr/bin/env bash
#
# Humörkarta Backend Setup Script
# Run this once to set up your development environment.
#
# Assumes conda environment "moodmap" already exists.
# Create it with: conda create -n moodmap python=3.12
#

set -e

echo "🌟 Humörkarta Backend Setup"
echo "=========================="
echo ""

cd "$(dirname "$0")"

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "❌ conda not found. Please install Anaconda/Miniconda first."
    exit 1
fi

# Activate conda environment
echo "→ Activating conda environment 'moodmap'..."
eval "$(conda shell.bash hook)"
conda activate moodmap
echo "✓ Conda environment activated"

# Check Python version
python_version=$(python --version 2>&1 | cut -d' ' -f2)
echo "✓ Python version: $python_version"

# Install dependencies
echo "→ Installing dependencies..."
pip install -r requirements.txt --quiet
echo "✓ Dependencies installed"

# Run migrations
echo "→ Running database migrations..."
python manage.py migrate --verbosity 0
echo "✓ Database migrations complete"

# Create superuser if needed
echo ""
echo "Would you like to create a superuser? (y/n)"
read -r create_super

if [ "$create_super" = "y" ] || [ "$create_super" = "Y" ]; then
    python manage.py createsuperuser
fi

echo ""
echo "=========================="
echo "✓ Setup complete!"
echo ""
echo "To start the development server:"
echo "  cd backend"
echo "  conda activate moodmap"
echo "  python manage.py runserver"
echo ""
echo "API will be available at: http://localhost:8000/api/"
echo "Admin panel at: http://localhost:8000/admin/"
echo ""

#!/usr/bin/env bash
# Render Build Script — installs deps + downloads spaCy model
set -e

pip install --upgrade pip
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python init_db.py

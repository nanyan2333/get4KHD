@echo off
rem pip install -r requirements.txt
if not exist url.txt (
    type nul > url.txt
)
@echo off
set READ=url.txt
setlocal EnableDelayedExpansion
for /f "tokens=*" %%i in (%READ%) do (
    python getAllPageIMG.py "%%i"
)
echo. > url.txt

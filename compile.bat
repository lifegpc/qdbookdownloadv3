@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION
set py=python
set pyt=%py% compile.py -W *
set DEBUG=0
set SOURCE_MAP_INCLUDE_CONTENT=0
set ADD_SOURCE_MAP_URL=0
for %%i IN (%*) DO (
    IF %%~i == -d (
        IF !DEBUG! == 0 ( SET DEBUG=1 ) ELSE ( SET DEBUG=2 )
    )
    IF %%~i == -dd SET DEBUG=2
    IF %%~i == -s SET SOURCE_MAP_INCLUDE_CONTENT=1
    IF %%~i == -a SET ADD_SOURCE_MAP_URL=1
)
IF %DEBUG% == 1 SET "pyt=%pyt% -d"
IF %DEBUG% == 2 SET "pyt=%pyt% -dd"
IF %SOURCE_MAP_INCLUDE_CONTENT% == 1 SET "pyt=%pyt% -s"
IF %ADD_SOURCE_MAP_URL% == 1 SET "pyt=%pyt% -a"
%pyt% -t qdchapter.js
%pyt% -t popup.js
%pyt% -t sandbox.js
%pyt% -t options.js
ENDLOCAL

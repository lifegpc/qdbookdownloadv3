@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION
set py=python
set pyt=%py% compile.py -W *
set RUN_AS_MODULE=0
set DEBUG=0
set SOURCE_MAP_INCLUDE_CONTENT=0
set ADD_SOURCE_MAP_URL=0
set FORCE_BUILD=0
for %%i IN (%*) DO (
    IF %%~i == -d (
        IF !DEBUG! == 0 ( SET DEBUG=1 ) ELSE ( SET DEBUG=2 )
    )
    IF %%~i == -dd SET DEBUG=2
    IF %%~i == -s SET SOURCE_MAP_INCLUDE_CONTENT=1
    IF %%~i == -a SET ADD_SOURCE_MAP_URL=1
    IF %%~i == -f SET FORCE_BUILD=1
    IF %%~i == -m SET RUN_AS_MODULE=1
)
IF %RUN_AS_MODULE% == 1 SET pyt=%py% -m compile -W *
IF %DEBUG% == 1 SET "pyt=%pyt% -d"
IF %DEBUG% == 2 SET "pyt=%pyt% -dd"
IF %SOURCE_MAP_INCLUDE_CONTENT% == 1 SET "pyt=%pyt% -s"
IF %ADD_SOURCE_MAP_URL% == 1 SET "pyt=%pyt% -a"
IF %FORCE_BUILD% == 1 SET "pyt=%pyt% -f"
%pyt% -t qdchapter.js
%pyt% -t popup.js
%pyt% -t sandbox.js
%pyt% -t options.js
ENDLOCAL

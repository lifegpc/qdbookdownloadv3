@ECHO OFF
SETLOCAL
set py=python
set pyt=%py% compile.py -W *
%pyt% -t qdchapter.js
%pyt% -t popup.js
%pyt% -t sandbox.js
ENDLOCAL

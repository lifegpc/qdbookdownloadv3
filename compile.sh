print_help() {
    echo "$0 - Compile javascript files."
    echo "Usage: $0 [-d] [-s] [-a] [-f] [-m] [-h]"
}
if [ -z "$PYTHON" ]; then
    PYTHON=python3
    if ! [ -x "$(command -v $PYTHON)" ]; then
        PYTHON=python
    fi
fi
if ! [ -x "$(command -v $PYTHON)" ]; then
    echo "Python3 is not installed." >&2
    exit 1
fi
RUN_AS_MODULE=0
DEBUG=0
SOURCE_MAP_INCLUDE_CONTENT=0
ADD_SOURCE_MAP_URL=0
FORCE_BUILD=0
while getopts "dsafmh" opt; do
    case $opt in
    h)  print_help
        exit 0;;
    d)  DEBUG=$((DEBUG+1))
        if [ $DEBUG -gt 2 ]; then
            echo "Too much -d specified."
            exit 1
        fi
        ;;
    s)  SOURCE_MAP_INCLUDE_CONTENT=1;;
    a)  ADD_SOURCE_MAP_URL=1;;
    f)  FORCE_BUILD=1;;
    m)  RUN_AS_MODULE=1;;
    ?)  exit 1;;
    esac
done
PYT="$PYTHON compile.py -W '*'"
if [ $RUN_AS_MODULE -eq 1 ]; then
    PYT="$PYTHON -m compile -W '*'"
fi
if [ $DEBUG -gt 0 ]; then
    for i in $(seq 1 $DEBUG); do
        PYT="$PYT -d"
    done
fi
if [ $SOURCE_MAP_INCLUDE_CONTENT -eq 1 ]; then
    PYT="$PYT -s"
fi
if [ $ADD_SOURCE_MAP_URL -eq 1 ]; then
    PYT="$PYT -a"
fi
if [ $FORCE_BUILD -eq 1 ]; then
    PYT="$PYT -f"
fi
$PYT -t qdchapter.js
$PYT -t popup.js
$PYT -t sandbox.js
$PYT -t options.js
$PYT -t manage.js

from getopt import getopt
import sys
from typing import List
from os.path import exists, relpath, abspath
from os import listdir, system
from platform import system as systemname
from subprocess import Popen, PIPE
from json import loads


def ph():
    print("compile.py [-u] [-c] [-j <java location>] [-d] [-t file] [-W Error] [-o Output] [file list]")  # noqa: E501


def gopt(args: List[str]):
    re = getopt(args, 'h?ucj:dt:W:o:', ['help', 'chrome', 'firefox'])
    rr = re[0]
    r = {}
    h = False
    for i in rr:
        if i[0] == '-h' or i[0] == '-?' or i[0] == '--help':
            h = True
        if i[0] == '-u':
            r['u'] = True
        if i[0] == '-c':
            r['c'] = True
        if i[0] == '-j' and 'j' not in r:
            r['j'] = i[1]
        if i[0] == '-d' and 'd' not in r:
            r['d'] = True
        if i[0] == '-t' and exists(f"js(origin)/{i[1]}"):
            if 't' not in r:
                r['t'] = []
            r['t'].append(i[1])
        if i[0] == '-W':
            if 'W' not in r:
                r['W'] = []
            r['W'].append(i[1])
        if i[0] == '-o':
            r['o'] = i[1]
    if h:
        ph()
        exit()
    return r, re[1]


class main:
    _upa: bool = False
    _onlyc: bool = False
    _java: str = "java"
    _debug: bool = False
    _t: List[str] = None
    _W: List[str] = None

    def __init__(self, ip: dict, fl: List[str]):
        if 'u' in ip:
            self._upa = True
        if 'c' in ip:
            self._onlyc = True
        if 'j' in ip:
            self._java = ip['j']
        if 'ch' in ip:
            self._chrome = ip['ch']
        if 'd' in ip:
            self._debug = ip['d']
        if 't' in ip:
            self._t = ip['t']
        if 'W' in ip:
            self._W = ip['W']
        self._o = None
        if 'o' in ip:
            self._o = ip['o']
        if not exists('js(origin)/'):
            raise FileNotFoundError('js(origin)/')
        if len(fl) == 0 and self._t is None:
            fl = listdir('js(origin)/')
        if not self._check_java():
            raise FileNotFoundError('Can not find java.')
        if not exists('compiler.jar'):
            raise FileNotFoundError('compiler.jar')
        for fn in fl:
            fn2 = f'js(origin)/{fn}'
            if not exists(fn2):
                raise FileNotFoundError(fn2)
        self._com_javascript(fl)

    def _check_java(self) -> bool:
        sn = systemname()
        s = " 2>&0 1>&0"
        if sn == "Linux":
            s = " > /dev/null 2>&1"
        if system(f"{self._java} -h{s}") == 0:
            return True
        return False

    def _com_javascript(self, fl: List[str]):
        print('INFO: compiler')
        jsf = ''
        for fn in fl:
            jsf += f' --js "js(origin)/{fn}"'
        if self._t is not None:
            for fn in self._t:
                data = self.getPackageInfo(fn)
                if len(data) > 0:
                    obj = loads(data)
                    if 'sources' in obj:
                        t: list = obj["sources"]
                    elif 'js' in obj:
                        t: list = obj['js']
                    n = abspath(".")
                    for f in t:
                        jsf += f' --js "{relpath(f, n)}"'
        if self._W is not None:
            for w in self._W:
                jsf += f' "--jscomp_off={w}"'
        nod = ' --module_resolution NODE --process_common_js_modules' if self._t else ''  # noqa: E501
        if self._o is not None and self._o != '':
            fn = self._o
        dcm = f' --create_source_map "js/{fn}.map"' if self._debug else ""
        cml = f'{self._java} -jar compiler.jar{jsf} --compilation_level ADVANCED_OPTIMIZATIONS{nod} --js_output_file "js/{fn}"{dcm}'  # noqa E501
        print(cml)
        if system(cml) != 0:
            raise Exception('Error in compiler.')

    def getPackageInfo(self, fn: str):
        p = Popen(['node', '--preserve-symlinks',
                   'node_modules/closure-calculate-chunks/cli.js',
                   '--entrypoint', f'./js(origin)/{fn}'], stdout=PIPE)
        p.wait()
        return p.stdout.read() if p.stdout is not None else ''


if __name__ == "__main__":
    try:
        if len(sys.argv) == 1:
            main({}, [])
        else:
            ip, fl = gopt(sys.argv[1:])
            main(ip, fl)
    except:
        from traceback import print_exc
        print_exc()
        sys.exit(1)

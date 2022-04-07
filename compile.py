from getopt import getopt
import sys
from typing import List
from os.path import exists, relpath, abspath, getmtime, dirname
from os import listdir, system, makedirs
from platform import system as systemname
from subprocess import Popen, PIPE
from json import loads, dump, load


class FileCache:
    def __init__(self, f: str):
        self._obj = {}
        self._f = f
        self.have_err = False
        if exists(f'.compile-cache/{f}.json'):
            with open(f'.compile-cache/{f}.json', 'r', encoding='UTF-8') as f:
                self._obj = load(f)

    def add_file(self, f: str):
        obj = {'mtime': getmtime(f)}
        self._obj[f] = obj

    def is_newer(self, f: str):
        if f not in self._obj:
            self.add_file(f)
            return True
        obj = self._obj[f]
        nobj = {'mtime': getmtime(f)}
        if obj['mtime'] == nobj['mtime']:
            return False
        else:
            self.add_file(f)
            return True

    def __del__(self):
        if not self.have_err:
            fn = f'.compile-cache/{self._f}.json'
            makedirs(dirname(fn), exist_ok=True)
            with open(fn, 'w', encoding='UTF-8') as f:
                dump(self._obj, f, ensure_ascii=False, separators=(',', ':'))


def ph():
    print("compile.py [-u] [-c] [-j <java location>] [-d] [-t file] [-W Error] [-o Output] [file list]")  # noqa: E501


def gopt(args: List[str]):
    re = getopt(args, 'h?ucj:dt:W:o:saf', ['help', 'chrome', 'firefox', 'include', 'source_map_include_content', 'add_source_map_url', 'force_build'])  # noqa: E501
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
        if i[0] == '-d':
            if 'd' in r:
                r['dd'] = True
            else:
                r['d'] = True
        if i[0] == '-t' and exists(f"js_origin/{i[1]}"):
            if 't' not in r:
                r['t'] = []
            r['t'].append(i[1])
        if i[0] == '-W':
            if 'W' not in r:
                r['W'] = []
            r['W'].append(i[1])
        if i[0] == '-o':
            r['o'] = i[1]
        if i[0] == '-s' or i[0] == '--source_map_include_content':
            r['s'] = True
        if i[0] == '-a' or i[0] == '--add_source_map_url':
            r['a'] = True
        if i[0] == '-f' or i[0] == '--force_build':
            r['f'] = True
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
    _source_map_include_content: bool = False
    _ddebug: bool = False
    _add_source_map_url: bool = False
    _force_build: bool = False

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
        if 'dd' in ip:
            self._ddebug = True
        if 't' in ip:
            self._t = ip['t']
        if 'W' in ip:
            self._W = ip['W']
        if 's' in ip:
            self._source_map_include_content = True
        if 'f' in ip:
            self._force_build = True
        self._o = None
        if 'o' in ip:
            self._o = ip['o']
        if 'a' in ip:
            self._add_source_map_url = True
        if not exists('js_origin/'):
            raise FileNotFoundError('js_origin/')
        if len(fl) == 0 and self._t is None:
            fl = listdir('js_origin/')
        if not self._check_java():
            raise FileNotFoundError('Can not find java.')
        if not exists('compiler.jar'):
            raise FileNotFoundError('compiler.jar')
        self._cache = FileCache(self.get_fn(fl))
        for fn in fl:
            fn2 = f'js_origin/{fn}'
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
        jsf = ''
        need_build = self._force_build
        for fn in fl:
            jsf += f' --js "js_origin/{fn}"'
            if self._cache.is_newer(f"js_origin/{fn}"):
                need_build = True
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
                        f = relpath(f, n)
                        jsf += f' --js "{f}"'
                        if self._cache.is_newer(f):
                            need_build = True
        if self._o is not None and self._o != '':
            fn = self._o
        if not need_build and exists(f"js/{fn}"):
            if not self._debug or (self._debug and exists(f"js/{fn}.map")):
                print(f'INFO: skip compile {fn}')
                return
        if self._W is not None:
            for w in self._W:
                jsf += f' "--jscomp_off={w}"'
        nod = ' --module_resolution NODE --process_common_js_modules' if self._t else ''  # noqa: E501
        dcm = f' --create_source_map "js/{fn}.map"' if self._debug else ""
        if self._debug and self._source_map_include_content:
            dcm += " --source_map_include_content"
        elif self._debug:
            dcm += " \"--source_map_location_mapping=js_origin|../js_origin\""
        if self._debug and self._add_source_map_url:
            dcm += f" \"--output_wrapper=%output%//# sourceMappingURL={fn}.map\""
        if self._ddebug:
            dcm += " --debug"
        cml = f'{self._java} -jar compiler.jar{jsf} --compilation_level ADVANCED_OPTIMIZATIONS{nod} --js_output_file "js/{fn}"{dcm}'  # noqa E501
        print(f'INFO: compile {fn}')
        print(cml)
        if system(cml) != 0:
            self._cache.have_err = True
            raise Exception('Error in compiler.')

    def get_fn(self, fl: List[str]):
        if self._o is not None and self._o != '':
            return self._o
        if self._t is not None and len(self._t) > 0:
            return self._t[-1]
        return fl[-1]

    def getPackageInfo(self, fn: str):
        p = Popen(['node', '--preserve-symlinks',
                   'node_modules/closure-calculate-chunks/cli.js',
                   '--entrypoint', f'./js_origin/{fn}'], stdout=PIPE)
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

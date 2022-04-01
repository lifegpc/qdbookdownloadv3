Module.version = Module['cwrap']('version', 'string', []);
Module.get_errmsg = Module['cwrap']('get_errmsg', 'string', ['number']);

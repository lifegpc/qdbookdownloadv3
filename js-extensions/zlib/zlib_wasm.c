#include "emscripten.h"
#include <malloc.h>
#include "zlib.h"

#define ERROR_NULLPTR 100

EMSCRIPTEN_KEEPALIVE
const char* version() {
    return zlibVersion();
}

EMSCRIPTEN_KEEPALIVE
int comp(unsigned char** dest, unsigned long* destLen, const unsigned char* source, unsigned long sourceLen) {
    if (!dest || !destLen || !source) return ERROR_NULLPTR;
    *destLen = compressBound(sourceLen);
    *dest = malloc(*destLen);
    if (!(*dest)) return Z_MEM_ERROR;
    return compress(*dest, destLen, source, sourceLen);
}

EMSCRIPTEN_KEEPALIVE
int comp2(unsigned char** dest, unsigned long* destLen, const unsigned char* source, unsigned long sourceLen, int level) {
    if (!dest || !destLen || !source) return ERROR_NULLPTR;
    *destLen = compressBound(sourceLen);
    *dest = malloc(*destLen);
    if (!(*dest)) return Z_MEM_ERROR;
    return compress2(*dest, destLen, source, sourceLen, level);
}

EMSCRIPTEN_KEEPALIVE
const char* get_errmsg(int err_code) {
    switch (err_code) {
        case Z_OK:
            return "OK";
        case ERROR_NULLPTR:
            return "Arguments contains NULL.";
        case Z_MEM_ERROR:
            return "No enough memory.";
        case Z_BUF_ERROR:
            return "There was not enough room in the output buffer.";
        default:
            return "Unknown error.";
    }
}

#include "emscripten.h"
#include <malloc.h>
#include <string.h>
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
int deflate_init(int level, z_stream** stream_out) {
    if (!stream_out) return ERROR_NULLPTR;
    z_stream* stream = malloc(sizeof(z_stream));
    if (!stream) return Z_MEM_ERROR;
    memset(stream, 0, sizeof(z_stream));
    int ret = deflateInit2(stream, level, Z_DEFLATED, -MAX_WBITS, MAX_MEM_LEVEL, Z_DEFAULT_STRATEGY);
    if (ret != Z_OK) {
        free(stream);
        return ret;
    }
    *stream_out = stream;
    return Z_OK;
}

EMSCRIPTEN_KEEPALIVE
int deflate2(z_streamp stream, const unsigned char* source, unsigned int* sourceLen, const unsigned char** dest, unsigned int* destLen, int flush) {
    stream->avail_in = *sourceLen;
    stream->next_in = (Bytef*)source;
    stream->avail_out = *destLen;
    stream->next_out = (Bytef*)malloc(*destLen);
    Bytef* old = stream->next_out;
    if (!stream->next_out) return Z_MEM_ERROR;
    int ret = deflate(stream, flush);
    if (ret == Z_OK || ret == Z_STREAM_END) {
        *sourceLen = stream->avail_in;
        *destLen = *destLen - stream->avail_out;
        *dest = old;
        return ret;
    } else {
        free(stream->next_out);
        return ret;
    }
}

EMSCRIPTEN_KEEPALIVE
int z_stream_data_type(z_streamp stream) {
    return stream->data_type;
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
        case Z_STREAM_ERROR:
            return "Zlib any parameter is invalid";
        case Z_VERSION_ERROR:
            return "The version of zlib.h and the version of the library linked do not match.";
        default:
            return "Unknown error.";
    }
}

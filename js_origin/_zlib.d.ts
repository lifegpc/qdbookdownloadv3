export declare function version(): string;
export declare function get_errmsg(err_code: number): string;
export declare function onRuntimeInitialized(): void;
export declare function _malloc(size: number): number;
export declare function _free(ptr: number): void;
export declare function _deflate_init(level: number, stream_out: number): number;
export declare function _deflate2(stream: number, source: number, sourceLen: number, dest: number, destLen: number, flush: number): number;
export declare function _deflateEnd(stream: number): number;
export declare function _z_stream_data_type(stream: number): number;
export const HEAPU8: Uint8Array;
export const HEAPU32: Uint32Array;

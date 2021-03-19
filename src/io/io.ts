// Copyright (c) 2020-2021 Christopher Szatmary <cs@christopherszatmary.com>
// All rights reserved. MIT License.

// These interfaces were adapted from Go's io package.
// Copyright (c) 2009 The Go Authors. All rights reserved.
// https://github.com/golang/go/blob/master/LICENSE

import { Result } from "../global";
import * as errors from "../errors/mod";

/**
 * errShortWrite means that a write accepted fewer bytes than
 * requested but failed to return an explicit error.
 */
export const errShortWrite = errors.errorString("short write");

/**
 * eof is the error returned by `read` when no more input is available.
 * Functions should return `eof` only to signal a graceful end of input.
 * If the EOF occurs unexpectedly in a structured data stream,
 * the appropriate error is either `errUnexpectedEOF` or some other error
 * giving more detail.
 */
export const eof = errors.errorString("EOF");

/**
 * errUnexpectedEOF means that EOF was encountered in the
 * middle of reading a fixed-size block or data structure.
 */
export const errUnexpectedEOF = errors.errorString("unexpected EOF");

/**
 * errClosed is the error used when the underlying resource being read from
 * or written to has been closed.
 */
export const errClosed = errors.errorString("io: read/write on closed resource");

/* Types */

/**
 * Reader is the interface that wraps the basic `read` method.
 * It represents any type that can be read from asynchronously.
 *
 * `read` reads up to `p.byteLength` bytes into `p`. It resolves to
 * a `Result` containing either the number of bytes read (`0 <= n <= p.byteLength`)
 * or an error encountered. Even if `read` resolves to `n < p.byteLength`,
 * it may use all of `p` as scratch space during the call. If some data is
 * available but not `p.byteLength bytes`, `read` conventionally resolves to what
 * is available instead of waiting for more.
 *
 * When `read` encounters end-of-file condition, it resolves to `eof`.
 *
 * Implementations of `read` are discouraged from returning a zero byte count,
 * except when `p.byteLength === 0`. Callers should treat a result of `0` as
 * indicating that nothing happened; in particular it does not indicate EOF.
 *
 * Implementations must not retain `p`.
 */
export interface Reader {
  read(p: Uint8Array): Promise<Result<number, error>>;
}

/**
 * ReaderSync is the interface that wraps the basic `readSync` method.
 * It represents any type that can be read from synchronously.
 *
 * `readSync` reads up to `p.byteLength` bytes into `p`. It returns
 * a `Result` containing either the number of bytes read (`0 <= n <= p.byteLength`)
 * or an error encountered. Even if `readSync` returns `n < p.byteLength`,
 * it may use all of `p` as scratch space during the call. If some data is
 * available but not `p.byteLength bytes`, `readSync` conventionally returns to what
 * is available instead of waiting for more.
 *
 * When `readSync` encounters end-of-file condition, it returns `eof`.
 *
 * Implementations of `readSync` are discouraged from returning a zero byte count,
 * except when `p.byteLength === 0`. Callers should treat a result of `0` as
 * indicating that nothing happened; in particular it does not indicate EOF.
 *
 * Implementations must not retain `p`.
 */
export interface ReaderSync {
  readSync(p: Uint8Array): Result<number, error>;
}

/**
 * Writer is the interface that wraps the basic `write` method.
 * It represents any type that can be written to asynchronously.
 *
 * `write` writes `p.byteLength` bytes from `p` to the underlying data stream.
 * It resolves to a `Result` containing either the number of bytes written
 * from `p` (`0 <= n <= p.byteLength`) or an error encountered that caused
 * the write to stop early.
 * `write` must return an error if it would resolve to n < p.byteLength.
 * `write` must not modify the byte data, even temporarily.
 * Implementations must not retain `p`.
 */
export interface Writer {
  write(p: Uint8Array): Promise<Result<number, error>>;
}

/**
 * WriterSync is the interface that wraps the basic `writeSync` method.
 * It represents any type that can be written to synchronously.
 *
 * `writeSync` writes `p.byteLength` bytes from `p` to the underlying data stream.
 * It returns a `Result` containing either the number of bytes written
 * from `p` (`0 <= n <= p.byteLength`) or an error encountered that caused
 * the write to stop early.
 * `writeSync` must return an error if it would return n < p.byteLength.
 * `writeSync` must not modify the byte data, even temporarily.
 * Implementations must not retain `p`.
 */
export interface WriterSync {
  writeSync(p: Uint8Array): Result<number, error>;
}

/**
 * StringWriter is the interface that wraps the basic `writeString` method.
 * It represents any type that can write strings asynchronously.
 */
export interface StringWriter {
  writeString(s: string): Promise<Result<number, error>>;
}

/**
 * StringWriterSync is the interface that wraps the basic `writeStringSync` method.
 * It represents any type that can write strings synchronously.
 */
export interface StringWriterSync {
  writeStringSync(s: string): Result<number, error>;
}

/* IO helpers */

/**
 * devNull is a `Writer` and `WriterSync` on which all write calls
 * succeed without doing anything. It functions like `/dev/null` on Unix.
 */
export const devNull: Writer & WriterSync = {
  write(p: Uint8Array): Promise<Result<number, error>> {
    return Promise.resolve(Result.success(p.byteLength));
  },
  writeSync(p: Uint8Array): Result<number, error> {
    return Result.success(p.byteLength);
  },
};

/**
 * writeString writes the string `s` to `w`. If `w` implements `StringWriter`, it's
 * `writeString` method is invoked directly.
 */
export function writeString(w: Writer, s: string): Promise<Result<number, error>> {
  const sw = (w as unknown) as StringWriter;
  if (typeof sw.writeString === "function") {
    return sw.writeString(s);
  }

  const p = new TextEncoder().encode(s);
  return w.write(p);
}

/**
 * writeStringSync writes the string `s` to `w`. If `w` implements `StringWriterSync`, it's
 * `writeStringSync` method is invoked directly.
 */
export function writeStringSync(w: WriterSync, s: string): Result<number, error> {
  const sw = (w as unknown) as StringWriterSync;
  if (typeof sw.writeStringSync === "function") {
    return sw.writeStringSync(s);
  }

  const p = new TextEncoder().encode(s);
  return w.writeSync(p);
}

/**
 * A LimitedReader reads from `r` but limits the amount of data
 * returned to just `max` bytes. Each call to `read` updates `max`
 * to reflect the new amount remaining. `read` returns EOF when
 * `max <= 0` or when the underlying `r` returns EOF.
 */
export class LimitedReader {
  /** r is the underlying `Reader`. */
  r: Reader;
  /** max is the max bytes remaining. */
  max: number;

  constructor(r: Reader, max: number) {
    this.r = r;
    this.max = max;
  }

  async read(p: Uint8Array): Promise<Result<number, error>> {
    if (this.max <= 0) {
      return Result.failure(eof);
    }

    if (p.byteLength > this.max) {
      // eslint-disable-next-line no-param-reassign
      p = p.subarray(0, this.max);
    }

    const result = await this.r.read(p);
    if (result.isFailure()) {
      return result;
    }

    this.max -= result.success();
    return result;
  }
}

/**
 * A LimitedReaderSync reads from `r` but limits the amount of data
 * returned to just `max` bytes. Each call to `readSync` updates `max`
 * to reflect the new amount remaining. `readSync` returns EOF when
 * `max <= 0` or when the underlying `r` returns EOF.
 */
export class LimitedReaderSync {
  /** r is the underlying `ReaderSync`. */
  r: ReaderSync;
  /** max is the max bytes remaining. */
  max: number;

  constructor(r: ReaderSync, max: number) {
    this.r = r;
    this.max = max;
  }

  readSync(p: Uint8Array): Result<number, error> {
    if (this.max <= 0) {
      return Result.failure(eof);
    }

    if (p.byteLength > this.max) {
      // eslint-disable-next-line no-param-reassign
      p = p.subarray(0, this.max);
    }

    const result = this.r.readSync(p);
    if (result.isFailure()) {
      return result;
    }

    this.max -= result.success();
    return result;
  }
}

/**
 * copy copies from `src` to `dst`. EOF is only considered an error
 * if `opts.size` is set.
 * @param opts.size The number of bytes to copy. If omitted, bytes
 * will be copied until EOF is reached.
 * @param opts.buf A buffer that copying will be staged through.
 * If omitted, one will be allocated. This can be used to set the chunk size.
 */
export async function copy(
  dst: Writer,
  src: Reader,
  opts?: { size?: number; buf?: Uint8Array },
): Promise<Result<number, error>> {
  if (opts?.size !== undefined) {
    // eslint-disable-next-line no-param-reassign
    src = new LimitedReader(src, opts.size);
  }

  let buf = opts?.buf;
  if (buf === undefined) {
    // 32 KiB
    let size = 32 * 1024;
    if (src instanceof LimitedReader && size > src.max) {
      if (src.max < 1) {
        size = 1;
      } else {
        size = src.max;
      }
    }

    buf = new Uint8Array(size);
  }

  let written = 0;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const readResult = await src.read(buf);
    if (readResult.isFailure()) {
      // we are finished reading
      if (readResult.failure() === eof) {
        break;
      }

      return readResult;
    }

    const nread = readResult.success();
    // eslint-disable-next-line no-await-in-loop
    const writeResult = await dst.write(buf.subarray(0, nread));
    if (writeResult.isFailure()) {
      return writeResult;
    }

    // Shouldn't happen, but just to be safe
    if (nread !== writeResult.success()) {
      return Result.failure(errShortWrite);
    }

    written += nread;
  }

  if (opts?.size !== undefined && written < opts.size) {
    // src stopped early; must have been EOF
    return Result.failure(eof);
  }

  return Result.success(written);
}

/**
 * copySync copies from `src` to `dst`. EOF is only considered an error
 * if `opts.size` is set.
 * @param opts.size The number of bytes to copy. If omitted, bytes
 * will be copied until EOF is reached.
 * @param opts.buf A buffer that copying will be staged through.
 * If omitted, one will be allocated. This can be used to set the chunk size.
 */
export function copySync(
  dst: WriterSync,
  src: ReaderSync,
  opts?: { size?: number; buf?: Uint8Array },
): Result<number, error> {
  if (opts?.size !== undefined) {
    // eslint-disable-next-line no-param-reassign
    src = new LimitedReaderSync(src, opts.size);
  }

  let buf = opts?.buf;
  if (buf === undefined) {
    // 32 KiB
    let size = 32 * 1024;
    if (src instanceof LimitedReader && size > src.max) {
      if (src.max < 1) {
        size = 1;
      } else {
        size = src.max;
      }
    }

    buf = new Uint8Array(size);
  }

  let written = 0;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const readResult = src.readSync(buf);
    if (readResult.isFailure()) {
      // we are finished reading
      if (readResult.failure() === eof) {
        break;
      }

      return readResult;
    }

    const nread = readResult.success();
    // eslint-disable-next-line no-await-in-loop
    const writeResult = dst.writeSync(buf.subarray(0, nread));
    if (writeResult.isFailure()) {
      return writeResult;
    }

    // Shouldn't happen, but just to be safe
    if (nread !== writeResult.success()) {
      return Result.failure(errShortWrite);
    }

    written += nread;
  }

  if (opts?.size !== undefined && written < opts.size) {
    // src stopped early; must have been EOF
    return Result.failure(eof);
  }

  return Result.success(written);
}

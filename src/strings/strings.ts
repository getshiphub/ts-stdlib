// Copyright (c) 2020 Christopher Szatmary <cs@christopherszatmary.com>
// All rights reserved. MIT License.

import { panic } from "../global";

/**
 * CodePoint is an alias for number that represents a Unicode code point.
 * It is recommended for use in function signatures that take or return code points
 * to indicate to the user that these are not arbitrary numbers.
 */
export type CodePoint = number;

/**
 * toCodePoint returns the CodePoint of the first unicode character in the string.
 * `s` is assumed to be a single unicode character. This is a convenience function
 * since JavaScript doesn't have a char type.
 * If `s` is an empty string, the function will panic.
 */
export function toCodePoint(s: string): CodePoint {
  if (s === "") {
    panic("strings.toCodePoint: empty string");
  }
  // Should never be undefined because we checked that the string isn't empty
  return s.codePointAt(0) as number;
}

/**
 * Returns the index of of the first instance of any char from `chars`
 * in `s`, or -1 if none are present.
 */
export function indexAny(s: string, chars: string): number {
  if (s === "" || chars === "") {
    return -1;
  }

  if (chars.length === 1) {
    return s.indexOf(chars);
  }

  const charSet = new Set<string>();
  for (const c of chars) {
    charSet.add(c);
  }

  let i = 0;
  for (const c of s) {
    if (charSet.has(c)) {
      return i;
    }
    i += c.length;
  }

  return -1;
}

/**
 * Returns the index of the last instance of any char from `chars`
 * in `s`, or -1 if none are present.
 */
export function lastIndexAny(s: string, chars: string): number {
  if (s === "" || chars === "") {
    return -1;
  }

  if (s.length === 1) {
    if (chars.indexOf(s) >= 0) {
      return 0;
    }

    return -1;
  }

  const charSet = new Set<string>();
  for (const c of chars) {
    charSet.add(c);
  }

  // TODO(@cszatmary): Figure out a way to make this fast
  // Currently this iterates over the whole string
  // Need a way to iterate over the string in reverse order
  // while taking account for unicode chars
  let i = 0;
  let foundIndex = -1;
  for (const c of s) {
    if (charSet.has(c)) {
      foundIndex = i;
    }
    i += c.length;
  }

  return foundIndex;
}

/**
 * Removes the leading `prefix` string from `s`.
 * If `s` doesn't start with `prefix`, `s` is returned unchanged.
 */
export function trimPrefix(s: string, prefix: string): string {
  if (s.startsWith(prefix)) {
    return s.slice(prefix.length);
  }

  return s;
}

/**
 * Removes the trailing `suffix` string from `s`.
 * If `s` doesn't end with `suffix`, `s` is returned unchanged.
 */
export function trimSuffix(s: string, suffix: string): string {
  if (s.endsWith(suffix)) {
    return s.slice(0, s.length - suffix.length);
  }

  return s;
}

/**
 * indexFunc returns the index of first unicode code point in s
 * where f(c) returns true. If no index is found, -1 will be returned.
 */
export function indexFunc(s: string, f: (c: string) => boolean): number {
  let i = 0;
  for (const c of s) {
    if (f(c)) {
      return i;
    }
    i += c.length;
  }

  return -1;
}

/**
 * lastIndexFunc returns the index of last unicode code point in s
 * where f(c) returns true. If no index is found, -1 will be returned.
 */
export function lastIndexFunc(s: string, f: (c: string) => boolean): number {
  let i = 0;
  let foundIndex = -1;
  for (const c of s) {
    if (f(c)) {
      foundIndex = i;
    }
    i += c.length;
  }

  return foundIndex;
}

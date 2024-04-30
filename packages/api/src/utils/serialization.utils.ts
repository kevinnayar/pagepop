import { createHash } from 'crypto';

export function getHash(stringOrBuffer: string | Buffer) {
  const algo = 'sha1';
  const encoding = 'hex';
  const hash = createHash(algo).update(stringOrBuffer);
  const digest = hash.digest(encoding);
  return digest;
}

export function trimWhitespace(input: string, removeNewLines = false): string {
  if (removeNewLines) return input.replace(/\s+/g, ' ').trim();
  return input.trim();
}

function extractJSONString(text: string): string {
  for (let startIndex = 0; startIndex < text.length; startIndex += 1) {
    if (text[startIndex] === '{') {
      const head = text.slice(startIndex, text.length);

      for (let endIndex = head.length - 1; endIndex > 0; endIndex -= 1) {
        if (head[endIndex] === '}') {
          const tail = head.slice(0, endIndex + 1);
          return tail.replace(/\n/g, '');
        }
      }
    }
  }

  throw new Error('Could not extract JSON');
}

export function safeParseJSON(text: string): object | undefined {
  try {
    const extracted = extractJSONString(text);
    return JSON.parse(extracted);
  } catch (_e) {
    return undefined;
  }
}

export function isArray(value: any): boolean {
  return Array.isArray(value);
}

export function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function replaceValueInObject<T extends object, A, B>(
  input: T,
  value: A,
  replacement: B,
): T {
  const output: any = { ...input };
  for (const key in output) {
    if (output[key] === value) {
      output[key] = replacement;
    }
    if (isObject(output[key])) {
      output[key] = replaceValueInObject(output[key], value, replacement);
    }
    if (isArray(output[key])) {
      output[key] = output[key].map((item) =>
        isObject(item) ? replaceValueInObject(item, value, replacement) : item,
      );
    }
  }
  return output as T;
}

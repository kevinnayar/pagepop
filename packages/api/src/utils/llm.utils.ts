import { ZodObject } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { compile } from 'json-schema-to-typescript';
import { trimWhitespace } from './serialization.utils';
import { LLM_ANSWER_KEY } from '../consts/llm.consts';

export async function getFormatFromZodObject(zodObject: ZodObject<any>): Promise<string> {
  const jsonSchema = zodToJsonSchema(zodObject);
  const typescriptString = await compile(jsonSchema as object, 'ResponseType', {
    bannerComment: '',
  });
  return typescriptString;
}

export function createTagContentString(content?: string, tag?: string) {
  const sanitized = trimWhitespace(content || '', true);
  if (tag && content) return `<${tag}>\n${sanitized}\n</${tag}>`;
  if (!tag && content) return sanitized;
  return null;
}

export function getContentFromAnswerTag(content: string) {
  const [tagStart, tagEnd] = [`<${LLM_ANSWER_KEY}>`, `</${LLM_ANSWER_KEY}>`];
  const [start, end] = [content.indexOf(tagStart), content.indexOf(tagEnd)];
  return content.slice(start + tagStart.length, end);
}

import { readFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

function fromTextToMarkdown(rawText: string) {
  const { content: markdown } = matter(rawText);
  return markdown;
}

async function fromMarkdownToHtml(markdown: string) {
  const result = await remark().use(html).process(markdown);
  return result.toString();
}

export async function getFileAsStructuredText(path: string) {
  const fullPath = join(process.cwd(), path);
  const rawText = readFileSync(fullPath, 'utf8');
  const markdown = fromTextToMarkdown(rawText);
  const html = await fromMarkdownToHtml(markdown);
  return {
    rawText,
    markdown,
    html,
  };
}

export async function getTextAsStructuredText(rawText: string) {
  const markdown = fromTextToMarkdown(rawText);
  const html = await fromMarkdownToHtml(markdown);
  return {
    rawText,
    markdown,
    html,
  };
}

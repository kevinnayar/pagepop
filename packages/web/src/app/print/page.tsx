import { getTextAsStructuredText } from '@pagepop/lib/markdown-utils';
import HtmlPrinter from '@pagepop/components/custom/html-printer';

async function getFileData() {
  const rawText =
    '# Hello World\nThis is a test.\n\n- item 1\n- item 2\n- item 3\n\n## Subtitle\nThis is a subtitle.';
  const data = await getTextAsStructuredText(rawText);
  return data;
}

export default async function Print() {
  const { rawText, markdown, html } = await getFileData();
  console.log({ rawText, markdown, html });
  return html ? <HtmlPrinter html={html} /> : <p>nothing yet</p>;
}

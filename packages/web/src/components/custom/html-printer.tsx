'use client';

import { useEffect } from 'react';
import { Button } from '../ui/button';

const printStyles = `
@media print {
  html,
  body,
  div,
  section,
  article {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    padding: 0;
    background: white;
    color: black;
    line-height: 1.3;
    font-family: 'Times New Roman', serif;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: bold;
  }

  h1 {
    font-size: 24pt;
    margin-top: 0.33in;
  }

  h2 {
    font-size: 18pt;
    margin-top: 0.25in;
  }

  h3 {
    font-size: 14pt;
    margin-top: 0.25in;
  }

  p {
    font-size: 11pt;
    margin: 0.125in 0;
  }

  img {
    max-width: 100%;
    page-break-inside: avoid;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    border: 1px solid black;
    padding: 8px;
    text-align: left;
    font-size: 10pt;
  }

  th {
    background-color: #f2f2f2;
  }

  footer {
    display: none;
  }

  h1,
  h2,
  h3 {
    page-break-after: avoid;
  }

  .important {
    color: #333;
    font-weight: bold;
    background-color: #ddd;
  }

  nav,
  .noprint {
    display: none;
  }
}
`;

function HtmlPrinter({ html }: { html: string }) {
  const printableDivId = 'printable';

  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const handlePrinting = () => {
    const div = document.getElementById(printableDivId);
    if (!div) {
      throw new Error(`Element with id ${printableDivId} not found`);
    }

    const tempContent = div.innerHTML;
    const origContent = document.body.innerHTML;

    document.body.innerHTML = tempContent;
    window.print();
    document.body.innerHTML = origContent;
  };

  return (
    <div>
      <div id={printableDivId} dangerouslySetInnerHTML={{ __html: html }} />
      <Button onClick={handlePrinting}>Print this page</Button>
    </div>
  );
}

export default HtmlPrinter;

import React from 'react';

/**
 * Parses basic Markdown formatting (**bold**, *italic*, ***bold italic***) and renders React nodes with preserved line breaks.
 */
export function parseFormattedText(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lIdx) => {
    if (!line) {
      return <br key={`br-${lIdx}`} />;
    }

    // Match ***bold italic***, **bold**, __bold__, *italic*, _italic_
    const regex = /(\*\*\*[\s\S]+?\*\*\*|___[\s\S]+?___|\*\*[\s\S]+?\*\*|__[\s\S]+?__|\*[\s\S]+?\*|_\b[\s\S]+?\b_)/g;

    const parts = line.split(regex);

    const renderedLine = parts.map((part, pIdx) => {
      if (!part) return null;

      if ((part.startsWith('***') && part.endsWith('***')) || (part.startsWith('___') && part.endsWith('___'))) {
        return (
          <strong key={pIdx} className="font-bold text-[#eeede9]">
            <em className="italic">{part.slice(3, -3)}</em>
          </strong>
        );
      }
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
        return (
          <strong key={pIdx} className="font-bold text-[#eeede9]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return (
          <em key={pIdx} className="italic text-[#eeede9]/95">
            {part.slice(1, -1)}
          </em>
        );
      }

      return part;
    });

    return (
      <React.Fragment key={lIdx}>
        {lIdx > 0 && <br />}
        {renderedLine}
      </React.Fragment>
    );
  });
}

import React, { useState, useEffect } from 'react';
import {
  Page,
  Navbar,
  NavLeft,
  NavTitle,
  NavRight,
  Link,
} from 'framework7-react';
import store from 'store-js';
import PreviewSection from '../components/PreviewSection';

const HomePage = () => {
  const detailedPlaceholders = [
        "**Welcome to your Markdown editor!** Here you can write and format your documents with ease. Use headers for titles, bullet points for lists, and links to reference other resources. For example:\n\n# My Document Title\n## Section 1\n- Item 1\n- Item 2\n[Learn more](https://example.com)",
        "**Get started with Markdown!** This is where your creativity takes shape. Type your text, and format it using Markdown syntax. Here’s a simple guide:\n\n# Main Heading\n## Subheading\nThis text is **bold**, this is *italic*, and here’s a [link](https://example.com).\n- Use dashes for bullet points\n1. Numbered lists can be created like this.",
        "**Hello! Ready to write?** In this editor, you can create and format your Markdown documents. To help you get started, here are some formatting options:\n\n- To create headings, use the `#` symbol (e.g., `# Heading 1`, `## Heading 2`).\n- For emphasis, use `**bold**` for bold text and `*italic*` for italic text.\n- Create links with `[link text](URL)` format.",
        "**Welcome to your writing space!** Feel free to start drafting your document. Remember, you can format your text easily with Markdown. Here are a few examples:\n\n### Example Markdown Formatting\n- Create lists with `-` or `*`\n- Make text **bold** or *italic*\n- Add images using `![alt text](image URL)`"
    ];

    // In your state initialization
    const [text, setText] = useState(store.get('text') || detailedPlaceholders[Math.floor(Math.random() * detailedPlaceholders.length)]);


  return (
    <Page name="home">
      <Navbar sliding={false}>
        <NavLeft>
          <Link iconIos="f7:chat_bubble" iconMd="material:chat_bubble" panelOpen="left" />
        </NavLeft>
        <NavTitle sliding>notie.qa</NavTitle>
        <NavRight>
          <Link iconIos="f7:menu" iconMd="material:menu" panelOpen="right" />
        </NavRight>
      </Navbar>

      <PreviewSection text={text} setText={setText} />
    </Page>
  );
};

export default HomePage;
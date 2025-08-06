/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { renderModalStates } from './tab.js';

import type { Tab, TabSnapshot } from './tab.js';
import type { ImageContent, TextContent } from '@modelcontextprotocol/sdk/types.js';
import type { Context } from './context.js';

export class Response {
  private _result: string[] = [];
  private _code: string[] = [];
  private _images: { contentType: string, data: Buffer }[] = [];
  private _context: Context;
  private _includeSnapshot = false;
  private _includeTabs = false;
  private _tabSnapshot: TabSnapshot | undefined;

  readonly toolName: string;
  readonly toolArgs: Record<string, any>;
  private _isError: boolean | undefined;

  constructor(context: Context, toolName: string, toolArgs: Record<string, any>) {
    this._context = context;
    this.toolName = toolName;
    this.toolArgs = toolArgs;
  }

  addResult(result: string) {
    this._result.push(result);
  }

  addError(error: string) {
    this._result.push(error);
    this._isError = true;
  }

  isError() {
    return this._isError;
  }

  result() {
    return this._result.join('\n');
  }

  addCode(code: string) {
    this._code.push(code);
  }

  code() {
    return this._code.join('\n');
  }

  addImage(image: { contentType: string, data: Buffer }) {
    this._images.push(image);
  }

  images() {
    return this._images;
  }

  setIncludeSnapshot() {
    this._includeSnapshot = true;
  }

  setIncludeTabs() {
    this._includeTabs = true;
  }

  async finish() {
    // All the async snapshotting post-action is happening here.
    // Everything below should race against modal states.
    if (this._includeSnapshot && this._context.currentTab())
      this._tabSnapshot = await this._context.currentTabOrDie().captureSnapshot();
    for (const tab of this._context.tabs())
      await tab.updateTitle();
  }

  tabSnapshot(): TabSnapshot | undefined {
    return this._tabSnapshot;
  }

  serialize(): { content: (TextContent | ImageContent)[], isError?: boolean } {
    const response: string[] = [];
    const MAX_TOKENS = 20000; // Conservative limit to ensure we stay under 25k
    let currentTokens = 0;

    // Start with command result.
    if (this._result.length) {
      response.push('### Result');
      response.push(this._result.join('\n'));
      response.push('');
    }

    // Add code if it exists.
    if (this._code.length) {
      response.push(`### Ran Playwright code
\`\`\`js
${this._code.join('\n')}
\`\`\``);
      response.push('');
    }

    // List browser tabs.
    if (this._includeSnapshot || this._includeTabs)
      response.push(...renderTabsMarkdown(this._context.tabs(), this._includeTabs));

    // Calculate tokens used so far before adding snapshot
    const preSnapshotText = response.join('\n');
    const preSnapshotTokens = estimateTokens(preSnapshotText);
    const availableTokensForSnapshot = Math.max(1000, MAX_TOKENS - preSnapshotTokens - 2000); // Reserve 2000 for safety

    // Add snapshot if provided.
    if (this._tabSnapshot?.modalStates.length) {
      response.push(...renderModalStates(this._context, this._tabSnapshot.modalStates));
      response.push('');
    } else if (this._tabSnapshot) {
      response.push(renderTabSnapshot(this._tabSnapshot, availableTokensForSnapshot));
      response.push('');
    }

    // Calculate current token usage and truncate if necessary
    const fullText = response.join('\n');
    currentTokens = estimateTokens(fullText);
    let finalText = fullText;

    if (currentTokens > MAX_TOKENS) {
      finalText = truncateToTokenLimit(fullText, MAX_TOKENS);
      currentTokens = estimateTokens(finalText);
    }

    // Main response part
    const content: (TextContent | ImageContent)[] = [
      { type: 'text', text: finalText },
    ];

    // Image attachments - limit to avoid exceeding token limit
    if (this._context.config.imageResponses !== 'omit') {
      const remainingTokens = MAX_TOKENS - currentTokens;
      const maxImageTokens = Math.max(0, remainingTokens - 1000); // Reserve 1000 tokens for safety
      let imageTokens = 0;

      for (const image of this._images) {
        const base64Data = image.data.toString('base64');
        const imageTokenEstimate = estimateTokens(base64Data);

        if (imageTokens + imageTokenEstimate <= maxImageTokens) {
          content.push({ type: 'image', data: base64Data, mimeType: image.contentType });
          imageTokens += imageTokenEstimate;
        } else {
          // Add a message about truncated images
          const truncatedMsg = '\n\n### Images Truncated\nSome images were omitted to stay within token limits.';
          content[0].text += truncatedMsg;
          break;
        }
      }
    }

    return { content, isError: this._isError };
  }
}

function renderTabSnapshot(tabSnapshot: TabSnapshot, maxTokens: number = 10000): string {
  const lines: string[] = [];

  if (tabSnapshot.consoleMessages.length) {
    lines.push(`### New console messages`);

    // Calculate available tokens for console messages
    const currentContent = lines.join('\n');
    const usedTokens = estimateTokens(currentContent);
    const availableTokens = Math.max(0, maxTokens - usedTokens - 1000); // Reserve 1000 for other content

    let consoleTokens = 0;
    let messagesShown = 0;

    for (const message of tabSnapshot.consoleMessages) {
      const messageText = `- ${trim(message.toString(), 500)}`; // Allow longer messages
      const messageTokens = estimateTokens(messageText);

      if (consoleTokens + messageTokens <= availableTokens) {
        lines.push(messageText);
        consoleTokens += messageTokens;
        messagesShown++;
      } else {
        break;
      }
    }

    if (messagesShown < tabSnapshot.consoleMessages.length)
      lines.push(`- ... and ${tabSnapshot.consoleMessages.length - messagesShown} more messages (truncated to fit token limit)`);


    lines.push('');
  }

  if (tabSnapshot.downloads.length) {
    lines.push(`### Downloads`);
    for (const entry of tabSnapshot.downloads) {
      if (entry.finished)
        lines.push(`- Downloaded file ${entry.download.suggestedFilename()} to ${entry.outputFile}`);
      else
        lines.push(`- Downloading file ${entry.download.suggestedFilename()} ...`);
    }
    lines.push('');
  }

  lines.push(`### Page state`);
  lines.push(`- Page URL: ${tabSnapshot.url}`);
  lines.push(`- Page Title: ${tabSnapshot.title}`);
  lines.push(`- Page Snapshot:`);
  lines.push('```yaml');

  // Truncate ARIA snapshot if it's too large
  const ariaSnapshot = tabSnapshot.ariaSnapshot;
  const ariaTokens = estimateTokens(ariaSnapshot);
  const reservedTokens = estimateTokens(lines.join('\n')) + 500; // Reserve for other content
  const availableTokens = maxTokens - reservedTokens;

  if (ariaTokens > availableTokens && availableTokens > 0) {
    const truncatedAria = truncateToTokenLimit(ariaSnapshot, availableTokens);
    lines.push(truncatedAria);
  } else {
    lines.push(ariaSnapshot);
  }

  lines.push('```');

  return lines.join('\n');
}

function renderTabsMarkdown(tabs: Tab[], force: boolean = false): string[] {
  if (tabs.length === 1 && !force)
    return [];

  if (!tabs.length) {
    return [
      '### Open tabs',
      'No open tabs. Use the "browser_navigate" tool to navigate to a page first.',
      '',
    ];
  }

  const lines: string[] = ['### Open tabs'];
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const current = tab.isCurrentTab() ? ' (current)' : '';
    lines.push(`- ${i}:${current} [${tab.lastTitle()}] (${tab.page.url()})`);
  }
  lines.push('');
  return lines;
}

function trim(text: string, maxLength: number) {
  if (text.length <= maxLength)
    return text;
  return text.slice(0, maxLength) + '...';
}

// Conservative token estimation (1 token ≈ 2.5 characters for safety)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2.5);
}

// Truncate text to stay under token limit
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 2.5; // Conservative estimate
  if (text.length <= maxChars)
    return text;

  const truncated = text.slice(0, maxChars - 200); // Leave more room for truncation message
  return truncated + '\n\n... [Response truncated to stay under 25,000 token limit] ...';
}

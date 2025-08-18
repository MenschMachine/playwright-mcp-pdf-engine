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
import { z } from 'zod';
import { defineTabTool } from '../tools/tool.js';
import { createSelectorTool } from '../plugin-system/index.js';
import type { Plugin } from '../plugin-system/types.js';

// High-level semantic tools
const enableDebugMode = defineTabTool({
  capability: 'core',
  schema: {
    name: 'enable_debug_mode',
    title: 'Enable debug mode',
    description: 'Enable debug mode by interacting with #debug-toggle-on-off',
    inputSchema: z.object({}),
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();

    const button = await tab.page.$('#debug-toggle-on-off');
    if (!button)
      throw new Error('Debug toggle button not found: #debug-toggle-on-off');

    // Check current state by reading button text
    const buttonText = await button.textContent();
    const isDebugEnabled = buttonText?.includes('Debug Mode ON');

    response.addCode(`// Enable debug mode`);

    if (!isDebugEnabled) {
      response.addCode(`await page.click('#debug-toggle-on-off');`);
      await tab.waitForCompletion(async () => {
        await button.click();
      });
    } else {
      response.addCode(`// Debug mode already enabled`);
    }
  },
});

const disableDebugMode = defineTabTool({
  capability: 'core',
  schema: {
    name: 'disable_debug_mode',
    title: 'Disable debug mode',
    description: 'Disable debug mode by interacting with #debug-toggle-on-off',
    inputSchema: z.object({}),
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();

    const button = await tab.page.$('#debug-toggle-on-off');
    if (!button)
      throw new Error('Debug toggle button not found: #debug-toggle-on-off');

    // Check current state by reading button text
    const buttonText = await button.textContent();
    const isDebugEnabled = buttonText?.includes('Debug Mode ON');

    response.addCode(`// Disable debug mode`);

    if (isDebugEnabled) {
      response.addCode(`await page.click('#debug-toggle-on-off');`);
      await tab.waitForCompletion(async () => {
        await button.click();
      });
    } else {
      response.addCode(`// Debug mode already disabled`);
    }
  },
});

const debugStepIntoFirstChild = createSelectorTool(
    'debug_step_into_first_child',
    'Debug step into first child',
    '#debug-step-into-first-child',
    'click'
);

const debugStepToNextSibling = createSelectorTool(
    'debug_step_to_next_sibling',
    'Step to next sibling element',
    '#debug-step-to-next-sibling',
    'click'
);

const debugReturnToParent = createSelectorTool(
    'debug_return_to_parent',
    'Return to parent element',
    '#debug-return-to-parent',
    'click'
);

const debugStepNext = createSelectorTool(
    'debug_step_next',
    'Step to next element in traversal order',
    '#debug-step-next',
    'click'
);

const debugReset = createSelectorTool(
    'debug_reset',
    'Reset traversal to the beginning',
    '#debug-reset',
    'click'
);

const savePdfCanvas = defineTabTool({
  capability: 'core',
  schema: {
    name: 'save_pdf_canvas',
    title: 'Save PDF canvas as image',
    description: 'Take a screenshot of the PDF canvas and save it to a temporary file',
    inputSchema: z.object({}),
    type: 'readOnly',
  },

  handle: async (tab, _params, response) => {
    response.addCode(`// Take screenshot of PDF canvas (#pdf-canvas)`);
    response.addCode(`await page.locator('#pdf-canvas').screenshot({ path: '/tmp/pdf-canvas-' + Date.now() + '.png' });`);

    const timestamp = Date.now();
    const filePath = `/tmp/pdf-canvas-${timestamp}.png`;

    await tab.page.locator('#pdf-canvas').screenshot({ path: filePath });

    response.addResult(`PDF canvas saved to: ${filePath}`);
  }
});


// File upload tool
const uploadXmlFile = defineTabTool({
  capability: 'core',
  schema: {
    name: 'upload_xml_file',
    title: 'Upload XML file',
    description: 'Upload a file to the xml-file-input element',
    inputSchema: z.object({
      filePath: z.string().describe('Absolute path to the XML file to upload'),
    }),
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();

    response.addCode(`// Upload file to xml-file-input`);
    response.addCode(`await page.setInputFiles('#xml-file-input', '${params.filePath}');`);

    await tab.waitForCompletion(async () => {
      const fileInput = await tab.page.$('#xml-file-input');
      if (!fileInput)
        throw new Error('Element with ID "xml-file-input" not found');
      await fileInput.setInputFiles(params.filePath);
    });
  },
});

// noinspection JSUnusedLocalSymbols
export const pdfEngineDebuggingActions: Plugin = {
  name: 'pdf-engine-debugging-actions-actions',
  version: '1.0.0',
  description: 'High-level pdf engine debugging actions',
  author: 'Playwright MCP',
  tools: [
    enableDebugMode,
    disableDebugMode,
    debugStepIntoFirstChild,
    debugStepToNextSibling,
    debugStepNext,
    debugReturnToParent,
    debugReset,
    savePdfCanvas,
    uploadXmlFile,
  ],

  initialize: async context => {
    // Pdf Engine actions plugin initialized
  },

  cleanup: async () => {
    // Pdf Engine actions plugin cleaned up
  },
};

// Export individual tools for backward compatibility
export default [
  enableDebugMode,
  disableDebugMode,
  savePdfCanvas,
  uploadXmlFile,
];

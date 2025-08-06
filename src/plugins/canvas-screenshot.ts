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

import * as os from 'os';
import * as path from 'path';
import { z } from 'zod';
import { defineTabTool } from '../tools/tool.js';
import type { Plugin } from '../plugin-system/types.js';

const canvasScreenshotSchema = z.object({
  canvasSelector: z.string().describe('CSS selector for the canvas element to capture'),
  filename: z.string().optional().describe('File name to save the canvas image to. Defaults to `canvas-{timestamp}.png` if not specified.'),
  format: z.enum(['png', 'jpeg', 'webp']).default('png').describe('Image format for the canvas export. Default is png.'),
  quality: z.number().min(0).max(1).optional().describe('Image quality for jpeg/webp formats (0-1). Ignored for png.'),
});

const canvasScreenshot = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_canvas_screenshot',
    title: 'Take canvas screenshot',
    description: 'Capture a canvas element and save it as an image to a temporary file path',
    inputSchema: canvasScreenshotSchema,
    type: 'readOnly',
  },

  handle: async (tab, params, response) => {
    const format = params.format || 'png';
    const tempDir = os.tmpdir();
    const filename = params.filename ?? `canvas-${new Date().toISOString()}.${format}`;
    const filePath = path.join(tempDir, filename);

    response.addCode(`// Capture canvas element and save as ${format.toUpperCase()}`);
    response.addCode(`const canvasData = await page.evaluate(({ canvasSelector, format, quality }) => {`);
    response.addCode(`  const canvas = document.querySelector(canvasSelector);`);
    response.addCode(`  if (!canvas) throw new Error('Canvas element not found');`);
    response.addCode(`  if (canvas.tagName.toLowerCase() !== 'canvas') throw new Error('Not a canvas element');`);
    response.addCode(`  const mimeType = \`image/\${format}\`;`);
    response.addCode(`  const dataUrl = format === 'png' ? canvas.toDataURL(mimeType) : canvas.toDataURL(mimeType, quality);`);
    response.addCode(`  return { dataUrl, width: canvas.width, height: canvas.height };`);
    response.addCode(`}, { canvasSelector: '${params.canvasSelector}', format: '${format}', quality: ${params.quality ?? 0.9} });`);

    try {
      const canvasData = await tab.page.evaluate(({ canvasSelector, format, quality }) => {
        const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement;
        if (!canvas)
          throw new Error(`Canvas element not found with selector: ${canvasSelector}`);

        if (canvas.tagName.toLowerCase() !== 'canvas')
          throw new Error('Selected element is not a canvas element');


        // Convert canvas to data URL
        const mimeType = `image/${format}`;

        let dataUrl: string;
        if (format === 'png')
          dataUrl = canvas.toDataURL(mimeType);
        else
          dataUrl = canvas.toDataURL(mimeType, quality);


        return {
          dataUrl: dataUrl,
          width: canvas.width,
          height: canvas.height
        };
      }, { canvasSelector: params.canvasSelector, format, quality: params.quality ?? 0.9 });

      // Extract base64 data from data URL
      const base64Data = canvasData.dataUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      // Save to temporary file
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, buffer);

      response.addCode(`// Canvas image saved to: ${filePath}`);
      response.addResult(
          `Canvas screenshot captured successfully!\n` +
                `- Dimensions: ${canvasData.width}x${canvasData.height}px\n` +
                `- Format: ${format.toUpperCase()}\n` +
                `- File path: ${filePath}\n` +
                `- File size: ${(buffer.length / 1024).toFixed(1)} KB`
      );

      // Also add the image to the response for immediate viewing
      response.addImage({
        contentType: `image/${format}`,
        data: buffer
      });

    } catch (error: any) {
      throw new Error(`Failed to capture canvas: ${error.message}`);
    }
  }
});


export const canvasScreenshotPlugin: Plugin = {
  name: 'canvas-screenshot',
  version: '1.0.0',
  description: 'Plugin for capturing canvas elements and saving them as image files',
  author: 'Playwright MCP',
  tools: [canvasScreenshot],

  initialize: async () => {
    // Canvas screenshot plugin initialized
  },

  cleanup: async () => {
    // Canvas screenshot plugin cleaned up
  },
};

export default [canvasScreenshot];

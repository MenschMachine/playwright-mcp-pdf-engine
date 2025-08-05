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
import { defineTool, defineTabTool } from '../../tools/tool.js';
import type { Plugin } from '../types.js';

const customPageInfo = defineTool({
  capability: 'core',
  schema: {
    name: 'custom_page_info',
    title: 'Custom Page Info',
    description: 'Get custom information about the current page',
    inputSchema: z.object({
      includeMetrics: z.boolean().optional().describe('Include performance metrics'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params, response) => {
    const tab = await context.ensureTab();
    
    const pageInfo = await tab.page.evaluate((includeMetrics) => {
      const info: any = {
        title: document.title,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        elementCount: document.querySelectorAll('*').length,
        hasJavaScript: !!window.navigator.userAgent,
      };
      
      if (includeMetrics && 'performance' in window) {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perf) {
          info.loadTime = perf.loadEventEnd - perf.fetchStart;
          info.domContentLoaded = perf.domContentLoadedEventEnd - perf.fetchStart;
        }
      }
      
      return info;
    }, params.includeMetrics);

    response.addResult(`Page Information:\n${JSON.stringify(pageInfo, null, 2)}`);
  },
});

const customHighlight = defineTabTool({
  capability: 'core',
  schema: {
    name: 'custom_highlight_element',
    title: 'Highlight Element',
    description: 'Highlight an element on the page with custom styling',
    inputSchema: z.object({
      element: z.string().describe('Human-readable element description'),
      ref: z.string().describe('Exact target element reference from the page snapshot'),
      color: z.string().optional().describe('Highlight color (default: yellow)'),
      duration: z.number().optional().describe('Duration in milliseconds (default: 3000)'),
    }),
    type: 'readOnly',
  },

  handle: async (tab, params, response) => {
    const locator = await tab.refLocator(params);
    const color = params.color || 'yellow';
    const duration = params.duration || 3000;

    await tab.page.evaluate(
      ({ selector, color, duration }) => {
        const element = document.querySelector(selector);
        if (element && element instanceof HTMLElement) {
          const originalStyle = element.style.cssText;
          element.style.backgroundColor = color;
          element.style.transition = 'background-color 0.2s';
          
          setTimeout(() => {
            element.style.cssText = originalStyle;
          }, duration);
        }
      },
      { 
        selector: await locator.evaluate(el => {
          // Generate a unique selector for the element
          let selector = el.tagName.toLowerCase();
          if (el.id) selector += `#${el.id}`;
          if (el.className) selector += `.${el.className.split(' ').join('.')}`;
          return selector;
        }),
        color,
        duration
      }
    );

    response.addResult(`Highlighted element for ${duration}ms with color: ${color}`);
    response.setIncludeSnapshot();
  },
});

export const customToolsPlugin: Plugin = {
  name: 'custom-tools',
  version: '1.0.0',
  description: 'Example custom tools demonstrating the plugin system',
  author: 'Playwright MCP Team',
  tools: [customPageInfo, customHighlight],
  
  initialize: async (context) => {
    console.log('Custom Tools plugin initialized with context');
    // You could perform setup here, like loading configuration,
    // setting up event listeners, or initializing resources
  },
  
  cleanup: async () => {
    console.log('Custom Tools plugin cleaned up');
    // Cleanup resources, remove event listeners, etc.
  },
};
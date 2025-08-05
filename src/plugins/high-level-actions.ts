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

import {z} from 'zod';
import {defineTabTool} from '../tools/tool.js';
import type {Plugin} from './types.js';

// Reusable helper function to create selector-based tools
const createSelectorTool = (
    name: string,
    description: string,
    selector: string,
    action: 'click' | 'check' | 'uncheck' = 'click'
) => {
    return defineTabTool({
        capability: 'core',
        schema: {
            name,
            title: description,
            description: `${description} by interacting with ${selector}`,
            inputSchema: z.object({}),
            type: 'destructive',
        },

        handle: async (tab, params, response) => {
            response.setIncludeSnapshot();

            const element = await tab.page.$(selector);
            if (!element)
                throw new Error(`Element not found: ${selector}`);


            response.addCode(`// ${description}`);

            if (action === 'click') {
                response.addCode(`await page.click('${selector}');`);
                await tab.waitForCompletion(async () => {
                    await element.click();
                });
            } else if (action === 'check') {
                response.addCode(`await page.check('${selector}');`);
                await tab.waitForCompletion(async () => {
                    await element.check();
                });
            } else if (action === 'uncheck') {
                response.addCode(`await page.uncheck('${selector}');`);
                await tab.waitForCompletion(async () => {
                    await element.uncheck();
                });
            }
        },
    });
};

// High-level semantic tools
const enableDebugMode = createSelectorTool(
    'enable_debug_mode',
    'Enable debug mode',
    '#debug-toggle-on-off',
    'check'
);

const disableDebugMode = createSelectorTool(
    'disable_debug_mode',
    'Disable debug mode',
    '#debug-toggle-on-off',
    'uncheck'
);

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
export const highLevelActionsPlugin: Plugin = {
    name: 'high-level-actions',
    version: '1.0.0',
    description: 'High-level semantic actions for common UI patterns',
    author: 'Playwright MCP',
    tools: [
        enableDebugMode,
        disableDebugMode,
        uploadXmlFile,
    ],

    initialize: async context => {
        console.log('High-level actions plugin initialized');
    },

    cleanup: async () => {
        console.log('High-level actions plugin cleaned up');
    },
};

// Export individual tools for backward compatibility
export default [
    enableDebugMode,
    disableDebugMode,
    uploadXmlFile,
];

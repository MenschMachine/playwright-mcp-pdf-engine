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

/**
 * Helper function to create selector-based tools
 * Reusable across all plugins for common UI interactions
 */
export const createSelectorTool = (
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
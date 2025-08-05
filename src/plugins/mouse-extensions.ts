import {z} from 'zod';
import {defineTabTool} from '../tools/tool.js';
import type {Plugin} from '../plugin-system/types.js';

const elementSchema = z.object({
    element: z.string().describe('Human-readable element description used to obtain permission to interact with the element'),
});

const mouseDown = defineTabTool({
    capability: 'vision',
    schema: {
        name: 'browser_mouse_down',
        title: 'Mouse down',
        description: 'Press mouse button down at coordinates',
        inputSchema: elementSchema.extend({
            x: z.number().describe('X coordinate'),
            y: z.number().describe('Y coordinate'),
            button: z.enum(['left', 'right', 'middle']).optional().describe('Button to press, defaults to left'),
        }),
        type: 'destructive',
    },

    handle: async (tab, params, response) => {
        response.setIncludeSnapshot();

        response.addCode(`// Press mouse button down at (${params.x}, ${params.y})`);
        response.addCode(`await page.mouse.move(${params.x}, ${params.y});`);
        response.addCode(`await page.mouse.down(${params.button ? `{ button: '${params.button}' }` : ''});`);

        await tab.waitForCompletion(async () => {
            await tab.page.mouse.move(params.x, params.y);
            await tab.page.mouse.down({button: params.button || 'left'});
        });
    },
});

const mouseUp = defineTabTool({
    capability: 'vision',
    schema: {
        name: 'browser_mouse_up',
        title: 'Mouse up',
        description: 'Release mouse button',
        inputSchema: elementSchema.extend({
            x: z.number().optional().describe('X coordinate (optional, uses current position if not provided)'),
            y: z.number().optional().describe('Y coordinate (optional, uses current position if not provided)'),
            button: z.enum(['left', 'right', 'middle']).optional().describe('Button to release, defaults to left'),
        }),
        type: 'destructive',
    },

    handle: async (tab, params, response) => {
        response.setIncludeSnapshot();

        if (params.x !== undefined && params.y !== undefined) {
            response.addCode(`// Move to (${params.x}, ${params.y}) and release mouse button`);
            response.addCode(`await page.mouse.move(${params.x}, ${params.y});`);
        } else {
            response.addCode(`// Release mouse button at current position`);
        }
        response.addCode(`await page.mouse.up(${params.button ? `{ button: '${params.button}' }` : ''});`);

        await tab.waitForCompletion(async () => {
            if (params.x !== undefined && params.y !== undefined)
                await tab.page.mouse.move(params.x, params.y);

            await tab.page.mouse.up({button: params.button || 'left'});
        });
    },
});

export const mouseExtensionsPlugin: Plugin = {
    name: 'mouse-extensions',
    version: '1.0.0',
    description: 'Extended mouse interaction tools for precise control',
    author: 'Playwright MCP',
    tools: [mouseDown, mouseUp],

    initialize: async context => {
        console.log('Mouse Extensions plugin initialized');
    },

    cleanup: async () => {
        console.log('Mouse Extensions plugin cleaned up');
    },
};

// Export individual tools for backward compatibility
export default [mouseDown, mouseUp];

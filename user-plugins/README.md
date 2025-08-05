# User Plugins Directory

This directory is for user-defined plugins that extend the Playwright MCP server functionality.

## Creating a Plugin

1. Create a TypeScript file in this directory (e.g., `my-plugin.ts`)
2. Export a plugin object with the following structure:

```typescript
import { z } from 'zod';
import { defineTabTool } from '../src/tools/tool.js';
import { createSelectorTool } from '../src/plugin-system/index.js';
import type { Plugin } from '../src/plugin-system/types.js';

// Example 1: Custom tool with full implementation
const myCustomTool = defineTabTool({
  capability: 'core',
  schema: {
    name: 'my_custom_action',
    title: 'My Custom Action',
    description: 'Does something custom',
    inputSchema: z.object({
      param: z.string().describe('A parameter'),
    }),
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    // Your tool implementation
    response.setIncludeSnapshot();
    response.addCode(`// Custom action: ${params.param}`);
    
    await tab.waitForCompletion(async () => {
      // Perform your custom action
    });
  },
});

// Example 2: Using the helper function for selector-based tools
const clickSubmitButton = createSelectorTool(
  'click_submit_button',
  'Click submit button',
  'button[type="submit"], .submit-btn, #submit'
);

export const myCustomPlugin: Plugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  author: 'Your Name',
  tools: [myCustomTool, clickSubmitButton],
};
```

## Plugin Loading

User plugins are loaded automatically when `enableUserPlugins` is set to `true` in the plugin loader options.

## Best Practices

- Use descriptive names for your plugins and tools
- Include proper error handling
- Follow the existing code style
- Test your plugins thoroughly
- Document your plugin's functionality
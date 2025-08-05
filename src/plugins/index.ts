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

// Core plugin system exports
export * from './types.js';
export * from './registry.js';

// Built-in plugins
export { mouseExtensionsPlugin } from './mouse-extensions.js';

// Example plugins (commented out by default)
// export { customToolsPlugin } from './examples/custom-tool.js';

/**
 * Plugin System Usage Guide:
 *
 * 1. Create a new plugin:
 *    - Create a new .ts file in src/plugins/
 *    - Define your tools using defineTabTool or defineTool
 *    - Export a Plugin object with metadata and tools
 *
 * 2. Register the plugin:
 *    - Import your plugin in src/tools.ts
 *    - Call pluginRegistry.register(yourPlugin)
 *
 * 3. Plugin lifecycle:
 *    - initialize() is called when the plugin is first loaded
 *    - cleanup() is called when the plugin is unloaded
 *
 * Example:
 *
 * ```typescript
 * import { Plugin } from './types.js';
 * import { defineTool } from '../tools/tool.js';
 *
 * const myTool = defineTool({
 *   capability: 'core',
 *   schema: { name: 'my_tool', ... },
 *   handle: async (context, params, response) => { ... }
 * });
 *
 * export const myPlugin: Plugin = {
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   tools: [myTool],
 * };
 * ```
 */

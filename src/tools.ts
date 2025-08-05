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

import common from './tools/common.js';
import console from './tools/console.js';
import dialogs from './tools/dialogs.js';
import evaluate from './tools/evaluate.js';
import files from './tools/files.js';
import install from './tools/install.js';
import keyboard from './tools/keyboard.js';
import navigate from './tools/navigate.js';
import network from './tools/network.js';
import pdf from './tools/pdf.js';
import snapshot from './tools/snapshot.js';
import tabs from './tools/tabs.js';
import screenshot from './tools/screenshot.js';
import wait from './tools/wait.js';
import mouse from './tools/mouse.js';

// Plugins
import { pluginRegistry } from './plugins/registry.js';
import { mouseExtensionsPlugin } from './plugins/mouse-extensions.js';
import { highLevelActionsPlugin } from './plugins/high-level-actions.js';

import type { Tool } from './tools/tool.js';
import type { FullConfig } from './config.js';

// Register built-in plugins
pluginRegistry.register(mouseExtensionsPlugin);
pluginRegistry.register(highLevelActionsPlugin);

export const allTools: Tool<any>[] = [
  ...common,
  ...console,
  ...dialogs,
  ...evaluate,
  ...files,
  ...install,
  ...keyboard,
  ...navigate,
  ...network,
  ...mouse,
  ...pdf,
  ...screenshot,
  ...snapshot,
  ...tabs,
  ...wait,
  ...pluginRegistry.getAllTools(),
];

export { pluginRegistry };

export function filteredTools(config: FullConfig) {
  let tools = allTools.filter(tool => tool.capability.startsWith('core') || config.capabilities?.includes(tool.capability));
  
  // Apply include filter first (if specified, only these tools are included)
  if (config.includeTools && config.includeTools.length > 0) {
    tools = tools.filter(tool => config.includeTools!.includes(tool.schema.name));
  }
  
  // Apply exclude filter
  if (config.excludeTools && config.excludeTools.length > 0) {
    tools = tools.filter(tool => !config.excludeTools!.includes(tool.schema.name));
  }
  
  return tools;
}

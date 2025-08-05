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

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { Plugin } from './types.js';
import { pluginRegistry } from './registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface PluginLoaderOptions {
  builtinPluginsPath?: string;
  userPluginsPath?: string;
  externalPlugins?: string[]; // npm package names or paths
  enableUserPlugins?: boolean;
}

export class PluginLoader {
  private options: Required<PluginLoaderOptions>;

  constructor(options: PluginLoaderOptions = {}) {
    this.options = {
      builtinPluginsPath: options.builtinPluginsPath || path.join(__dirname, '../plugins'),
      userPluginsPath: options.userPluginsPath || path.join(process.cwd(), 'user-plugins'),
      externalPlugins: options.externalPlugins || [],
      enableUserPlugins: options.enableUserPlugins ?? false,
    };
  }

  /**
   * Load all plugins from configured paths
   */
  async loadAll(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    // Load built-in plugins
    loadPromises.push(this.loadBuiltinPlugins());

    // Load user plugins if enabled
    if (this.options.enableUserPlugins) {
      loadPromises.push(this.loadUserPlugins());
    }

    // Load external plugins
    if (this.options.externalPlugins.length > 0) {
      loadPromises.push(this.loadExternalPlugins());
    }

    await Promise.all(loadPromises);
  }

  /**
   * Load built-in plugins
   */
  private async loadBuiltinPlugins(): Promise<void> {
    try {
      const files = await this.getPluginFiles(this.options.builtinPluginsPath);
      await this.loadPluginsFromFiles(files, 'builtin');
    } catch (error) {
      console.error('Failed to load builtin plugins:', error);
    }
  }

  /**
   * Load user-defined plugins
   */
  private async loadUserPlugins(): Promise<void> {
    try {
      // Check if user plugins directory exists
      await fs.access(this.options.userPluginsPath);
      const files = await this.getPluginFiles(this.options.userPluginsPath);
      await this.loadPluginsFromFiles(files, 'user');
    } catch (error) {
      // User plugins directory might not exist, which is fine
      if ((error as any).code !== 'ENOENT') {
        console.error('Failed to load user plugins:', error);
      }
    }
  }

  /**
   * Load external plugins (npm packages or absolute paths)
   */
  private async loadExternalPlugins(): Promise<void> {
    for (const pluginPath of this.options.externalPlugins) {
      try {
        await this.loadPlugin(pluginPath, 'external');
      } catch (error) {
        console.error(`Failed to load external plugin '${pluginPath}':`, error);
      }
    }
  }

  /**
   * Get plugin files from a directory
   */
  private async getPluginFiles(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const pluginFiles: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        // Skip example files and type definitions
        if (!entry.name.includes('.spec.') && 
            !entry.name.includes('.test.') && 
            !entry.name.includes('.d.ts') &&
            !fullPath.includes('/examples/')) {
          pluginFiles.push(fullPath);
        }
      }
    }

    return pluginFiles;
  }

  /**
   * Load plugins from file paths
   */
  private async loadPluginsFromFiles(files: string[], type: 'builtin' | 'user'): Promise<void> {
    const loadPromises = files.map(file => this.loadPlugin(file, type));
    await Promise.all(loadPromises);
  }

  /**
   * Load a single plugin
   */
  private async loadPlugin(pluginPath: string, type: 'builtin' | 'user' | 'external'): Promise<void> {
    try {
      // Convert to file URL for dynamic import
      const moduleUrl = pluginPath.startsWith('/')
        ? pathToFileURL(pluginPath).href
        : pluginPath; // npm package name or already a URL

      const module = await import(moduleUrl);
      
      // Look for exported plugins
      const plugins: Plugin[] = [];
      
      // Check for default export
      if (module.default && this.isPlugin(module.default)) {
        plugins.push(module.default);
      }
      
      // Check for named exports ending with 'Plugin'
      for (const [exportName, exportValue] of Object.entries(module)) {
        if (exportName.endsWith('Plugin') && this.isPlugin(exportValue)) {
          plugins.push(exportValue as Plugin);
        }
      }

      // Register all found plugins
      for (const plugin of plugins) {
        console.log(`Loading ${type} plugin: ${plugin.name} v${plugin.version}`);
        pluginRegistry.register(plugin);
      }
    } catch (error) {
      console.error(`Failed to load plugin from '${pluginPath}':`, error);
    }
  }

  /**
   * Check if an object is a valid plugin
   */
  private isPlugin(obj: any): obj is Plugin {
    return obj &&
      typeof obj === 'object' &&
      typeof obj.name === 'string' &&
      typeof obj.version === 'string' &&
      Array.isArray(obj.tools);
  }
}

// Default loader instance
export const defaultLoader = new PluginLoader();
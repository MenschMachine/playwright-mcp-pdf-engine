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

import type { Plugin } from './types.js';
import type { Tool } from '../tools/tool.js';
import type { Context } from '../context.js';

export class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private initialized = new Set<string>();

  /**
   * Register a plugin with the registry
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name))
      throw new Error(`Plugin '${plugin.name}' is already registered`);


    // Validate plugin
    this.validatePlugin(plugin);

    this.plugins.set(plugin.name, plugin);
  }

  /**
   * Unregister a plugin from the registry
   */
  unregister(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (plugin && this.initialized.has(pluginName)) {
      // Call cleanup if available
      plugin.cleanup?.();
      this.initialized.delete(pluginName);
    }
    this.plugins.delete(pluginName);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all tools from all registered plugins
   */
  getAllTools(): Tool<any>[] {
    return Array.from(this.plugins.values())
        .flatMap(plugin => plugin.tools);
  }

  /**
   * Get tools from a specific plugin
   */
  getPluginTools(pluginName: string): Tool<any>[] {
    const plugin = this.plugins.get(pluginName);
    return plugin ? plugin.tools : [];
  }

  /**
   * Initialize all plugins
   */
  async initializeAll(context: Context): Promise<void> {
    const initPromises = Array.from(this.plugins.entries())
        .filter(([name]) => !this.initialized.has(name))
        .map(async ([name, plugin]) => {
          try {
            if (plugin.initialize)
              await plugin.initialize(context);

            this.initialized.add(name);
          } catch (error) {
            console.error(`Failed to initialize plugin '${name}':`, error);
            throw error;
          }
        });

    await Promise.all(initPromises);
  }

  /**
   * Initialize a specific plugin
   */
  async initializePlugin(pluginName: string, context: Context): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin)
      throw new Error(`Plugin '${pluginName}' not found`);


    if (this.initialized.has(pluginName))
      return; // Already initialized


    if (plugin.initialize)
      await plugin.initialize(context);

    this.initialized.add(pluginName);
  }

  /**
   * Cleanup all plugins
   */
  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.plugins.entries())
        .filter(([name]) => this.initialized.has(name))
        .map(async ([name, plugin]) => {
          try {
            if (plugin.cleanup)
              await plugin.cleanup();

            this.initialized.delete(name);
          } catch (error) {
            console.error(`Failed to cleanup plugin '${name}':`, error);
          }
        });

    await Promise.all(cleanupPromises);
  }

  /**
   * Check if a plugin is initialized
   */
  isInitialized(pluginName: string): boolean {
    return this.initialized.has(pluginName);
  }

  /**
   * Get plugin statistics
   */
  getStats(): { totalPlugins: number; initializedPlugins: number; totalTools: number } {
    return {
      totalPlugins: this.plugins.size,
      initializedPlugins: this.initialized.size,
      totalTools: this.getAllTools().length,
    };
  }

  private validatePlugin(plugin: Plugin): void {
    if (!plugin.name || typeof plugin.name !== 'string')
      throw new Error('Plugin must have a valid name');


    if (!plugin.version || typeof plugin.version !== 'string')
      throw new Error('Plugin must have a valid version');


    if (!Array.isArray(plugin.tools))
      throw new Error('Plugin must have a tools array');


    // Validate tool names are unique within the plugin
    const toolNames = new Set<string>();
    for (const tool of plugin.tools) {
      if (toolNames.has(tool.schema.name))
        throw new Error(`Plugin '${plugin.name}' has duplicate tool name: ${tool.schema.name}`);

      toolNames.add(tool.schema.name);
    }
  }
}

// Global plugin registry instance
export const pluginRegistry = new PluginRegistry();

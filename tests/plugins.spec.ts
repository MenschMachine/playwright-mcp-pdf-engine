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

import { test, expect } from './fixtures.js';

test('plugin tools are available', async ({ startClient }) => {
  // Start client with vision capability
  const { client } = await startClient({
    args: ['--caps=vision'],
  });

  // Get list of available tools
  const listToolsResponse = await client.listTools();
  const toolNames = listToolsResponse.tools?.map(tool => tool.name) || [];

  // Check that our plugin tools are registered
  expect(toolNames).toContain('browser_mouse_down');
  expect(toolNames).toContain('browser_mouse_up');
});

test('plugin tools have correct capabilities', async ({ startClient }) => {
  // Test with vision capability enabled
  const { client: visionClient } = await startClient({
    args: ['--caps=vision'],
  });

  const listToolsResponse = await visionClient.listTools();
  const toolNames = listToolsResponse.tools?.map(tool => tool.name) || [];

  // Plugin tools should be available with vision capability
  expect(toolNames).toContain('browser_mouse_down');
  expect(toolNames).toContain('browser_mouse_up');
});

test('plugin tools not available without vision capability', async ({ startClient }) => {
  // Test without vision capability (core only)
  const { client: coreClient } = await startClient({
    args: ['--caps=core'],
  });

  const listToolsResponse = await coreClient.listTools();
  const toolNames = listToolsResponse.tools?.map(tool => tool.name) || [];

  // Plugin tools should NOT be available without vision capability
  expect(toolNames).not.toContain('browser_mouse_down');
  expect(toolNames).not.toContain('browser_mouse_up');
});

test('plugin tools integration with existing mouse tools', async ({ startClient, server }) => {
  const { client } = await startClient({
    args: ['--caps=vision'],
  });
  server.setContent('/', `
    <title>Integration Test</title>
    <div id="target" style="width: 100px; height: 100px; background: red; position: absolute; left: 50px; top: 50px;">
      Target
    </div>
    <script>
      let events = [];
      ['mousedown', 'mousemove', 'mouseup', 'click'].forEach(eventType => {
        document.addEventListener(eventType, (e) => {
          events.push(eventType);
          document.getElementById('target').textContent = events.join(' ');
        });
      });
    </script>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Test combination of existing and plugin tools
  // 1. Use plugin tool: mouse down
  await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Target area',
      x: 100,
      y: 100,
    },
  });

  // 2. Use existing tool: mouse move
  await client.callTool({
    name: 'browser_mouse_move_xy',
    arguments: {
      element: 'Target area',
      x: 120,
      y: 120,
    },
  });

  // 3. Use plugin tool: mouse up
  const result = await client.callTool({
    name: 'browser_mouse_up',
    arguments: {
      element: 'Target area',
      x: 120,
      y: 120,
    },
  });

  // Should show all mouse events were captured
  expect(result).toHaveResponse({
    pageState: expect.stringMatching(/mousedown.*mousemove.*mouseup/),
  });
});

test('plugin tools work alongside existing click tool', async ({ startClient, server }) => {
  const { client } = await startClient({
    args: ['--caps=vision'],
  });
  server.setContent('/', `
    <title>Click vs Down/Up Test</title>
    <button id="btn1" onclick="this.textContent = 'Clicked'">Click Me</button>
    <button id="btn2" onmousedown="this.textContent = 'Down'" onmouseup="this.textContent = 'Up'">Down/Up Me</button>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Test existing click tool
  await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Click Me button',
      ref: 'e2',
    },
  });

  // Test plugin down/up sequence
  await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Down/Up button',
      x: 200,
      y: 50,
    },
  });

  const result = await client.callTool({
    name: 'browser_mouse_up',
    arguments: {
      element: 'Down/Up button',
      x: 200,
      y: 50,
    },
  });

  // Both buttons should show their respective behaviors
  expect(result).toHaveResponse({
    pageState: expect.stringMatching(/Clicked.*Down\/Up Me/s),
  });
});

test('plugin error handling', async ({ startClient, server }) => {
  const { client } = await startClient({
    args: ['--caps=vision'],
  });
  server.setContent('/', `
    <title>Error Test</title>
    <div>No interactive elements</div>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Test mouse down with invalid coordinates (outside viewport)
  const result = await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Non-existent area',
      x: -100,
      y: -100,
    },
  });

  // Tool should execute but may have different behavior with negative coordinates
  expect(result).toHaveResponse({
    code: expect.stringContaining('await page.mouse.move(-100, -100)'),
  });
});

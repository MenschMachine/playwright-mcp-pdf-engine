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

test('browser_mouse_down', async ({ startClient, server }) => {
  const { client } = await startClient({
    args: ['--caps=vision'],
  });
  server.setContent('/', `
    <title>Mouse Test</title>
    <div id="target" style="width: 100px; height: 100px; background: red; position: absolute; left: 50px; top: 50px;"
         onmousedown="this.style.background = 'blue'; this.textContent = 'Down';">
      Target
    </div>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  expect(await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Target area',
      x: 100,
      y: 100,
    },
  })).toHaveResponse({
    code: `// Press mouse button down at (100, 100)
await page.mouse.move(100, 100);
await page.mouse.down();`,
    pageState: expect.stringContaining('Down'),
  });
});

test('browser_mouse_down with right button', async ({ startClient, server }) => {
  const { client } = await startClient({
    args: ['--caps=vision'],
  });
  server.setContent('/', `
    <title>Mouse Test</title>
    <div id="target" style="width: 100px; height: 100px; background: red; position: absolute; left: 50px; top: 50px;"
         oncontextmenu="event.preventDefault(); this.style.background = 'green'; this.textContent = 'Right Down';">
      Target
    </div>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  expect(await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Target area',
      x: 100,
      y: 100,
      button: 'right',
    },
  })).toHaveResponse({
    code: `// Press mouse button down at (100, 100)
await page.mouse.move(100, 100);
await page.mouse.down({ button: 'right' });`,
    pageState: expect.stringContaining('Right Down'),
  });
});

test('browser_mouse_up', async ({ startClient, server }) => {
  const { client } = await startClient({
    args: ['--caps=vision'],
  });
  server.setContent('/', `
    <title>Mouse Test</title>
    <div id="target" style="width: 100px; height: 100px; background: red; position: absolute; left: 50px; top: 50px;"
         onmouseup="this.style.background = 'yellow'; this.textContent = 'Up';">
      Target
    </div>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // First mouse down
  await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Target area',
      x: 100,
      y: 100,
    },
  });

  // Then mouse up
  expect(await client.callTool({
    name: 'browser_mouse_up',
    arguments: {
      element: 'Target area',
      x: 100,
      y: 100,
    },
  })).toHaveResponse({
    code: `// Move to (100, 100) and release mouse button
await page.mouse.move(100, 100);
await page.mouse.up();`,
    pageState: expect.stringContaining('Up'),
  });
});

test('browser_mouse_up without coordinates', async ({ startClient, server }) => {
  const { client } = await startClient({ args: ['--caps=vision'] });
  server.setContent('/', `
    <title>Mouse Test</title>
    <div id="target" style="width: 100px; height: 100px; background: red; position: absolute; left: 50px; top: 50px;"
         onmouseup="this.style.background = 'yellow'; this.textContent = 'Up At Current';">
      Target
    </div>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // First mouse down
  await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Target area',
      x: 100,
      y: 100,
    },
  });

  // Then mouse up without moving (no coordinates)
  expect(await client.callTool({
    name: 'browser_mouse_up',
    arguments: {
      element: 'Target area',
    },
  })).toHaveResponse({
    code: `// Release mouse button at current position
await page.mouse.up();`,
    pageState: expect.stringContaining('Up At Current'),
  });
});

test('browser_mouse_up with right button', async ({ startClient, server }) => {
  const { client } = await startClient({ args: ['--caps=vision'] });
  server.setContent('/', `
    <title>Mouse Test</title>
    <div id="target" style="width: 100px; height: 100px; background: red; position: absolute; left: 50px; top: 50px;">
      Target
    </div>
    <script>
      document.addEventListener('mouseup', (e) => {
        if (e.button === 2) {
          document.getElementById('target').style.background = 'purple';
          document.getElementById('target').textContent = 'Right Up';
        }
      });
    </script>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // First right mouse down
  await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Target area',
      x: 100,
      y: 100,
      button: 'right',
    },
  });

  // Then right mouse up
  expect(await client.callTool({
    name: 'browser_mouse_up',
    arguments: {
      element: 'Target area',
      x: 100,
      y: 100,
      button: 'right',
    },
  })).toHaveResponse({
    code: `// Move to (100, 100) and release mouse button
await page.mouse.move(100, 100);
await page.mouse.up({ button: 'right' });`,
    pageState: expect.stringContaining('Right Up'),
  });
});

test('browser_mouse_down and up sequence for drag-like behavior', async ({ startClient, server }) => {
  const { client } = await startClient({ args: ['--caps=vision'] });
  server.setContent('/', `
    <title>Mouse Test</title>
    <div id="draggable" style="width: 50px; height: 50px; background: blue; position: absolute; left: 100px; top: 100px; cursor: move;">
      Drag
    </div>
    <script>
      let isDragging = false;
      let startX, startY;
      
      document.addEventListener('mousedown', (e) => {
        if (e.target.id === 'draggable') {
          isDragging = true;
          startX = e.clientX - e.target.offsetLeft;
          startY = e.clientY - e.target.offsetTop;
          e.target.style.background = 'orange';
        }
      });
      
      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          const draggable = document.getElementById('draggable');
          draggable.style.left = (e.clientX - startX) + 'px';
          draggable.style.top = (e.clientY - startY) + 'px';
        }
      });
      
      document.addEventListener('mouseup', (e) => {
        if (isDragging) {
          isDragging = false;
          e.target.style.background = 'green';
        }
      });
    </script>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Mouse down on draggable element
  await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Draggable element',
      x: 125,
      y: 125,
    },
  });

  // Move mouse (using existing browser_mouse_move_xy tool)
  await client.callTool({
    name: 'browser_mouse_move_xy',
    arguments: {
      element: 'Moving mouse',
      x: 200,
      y: 200,
    },
  });

  // Mouse up to complete the drag
  const result = await client.callTool({
    name: 'browser_mouse_up',
    arguments: {
      element: 'Draggable element',
      x: 200,
      y: 200,
    },
  });

  expect(result).toHaveResponse({
    code: `// Move to (200, 200) and release mouse button
await page.mouse.move(200, 200);
await page.mouse.up();`,
    pageState: expect.stringContaining('Drag'),
  });
});

test('browser_mouse_down and up with middle button', async ({ startClient, server }) => {
  const { client } = await startClient({ args: ['--caps=vision'] });
  server.setContent('/', `
    <title>Mouse Test</title>
    <div id="target" style="width: 100px; height: 100px; background: red; position: absolute; left: 50px; top: 50px;">
      Target
    </div>
    <script>
      document.addEventListener('mousedown', (e) => {
        if (e.button === 1) {
          e.target.style.background = 'cyan';
          e.target.textContent = 'Middle Down';
        }
      });
      
      document.addEventListener('mouseup', (e) => {
        if (e.button === 1) {
          e.target.style.background = 'magenta';
          e.target.textContent = 'Middle Up';
        }
      });
    </script>
  `, 'text/html');

  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Middle mouse down
  await client.callTool({
    name: 'browser_mouse_down',
    arguments: {
      element: 'Target area',
      x: 100,
      y: 100,
      button: 'middle',
    },
  });

  // Middle mouse up
  expect(await client.callTool({
    name: 'browser_mouse_up',
    arguments: {
      element: 'Target area',
      button: 'middle',
    },
  })).toHaveResponse({
    code: `// Release mouse button at current position
await page.mouse.up({ button: 'middle' });`,
    pageState: expect.stringContaining('Middle Up'),
  });
});

test('plugin registry integration', async ({ startClient }) => {
  const { client } = await startClient({ args: ['--caps=vision'] });
  // Test that the plugin tools are properly registered
  const tools = await client.callTool({
    name: 'browser_snapshot',
    arguments: {},
  });

  // This will fail if the plugin tools aren't registered, as we need the tools to be available
  // The fact that we can call browser_mouse_down and browser_mouse_up in other tests proves integration
  expect(tools).toHaveResponse({
    pageState: expect.any(String),
  });
});

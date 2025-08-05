# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Test Commands

### Main Project
- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `lib/` directory
- **Watch mode**: `npm run watch` - Runs TypeScript compiler in watch mode
- **Lint**: `npm run lint` - Runs ESLint and TypeScript type checking (also updates README)
- **Lint fix**: `npm run lint-fix` - Auto-fixes ESLint issues
- **Clean**: `npm run clean` - Removes compiled output (`lib/` directory)

### Testing
- **Run all tests**: `npm test` - Runs all Playwright tests across all browsers
- **Run Chrome tests**: `npm run ctest` - Tests against Chrome only
- **Run Firefox tests**: `npm run ftest` - Tests against Firefox only
- **Run WebKit tests**: `npm run wtest` - Tests against WebKit only
- **Run specific test**: `npx playwright test <test-file>` - Run a single test file
- **Run tests with UI**: `npx playwright test --ui` - Opens Playwright test UI

### Extension (Browser Extension)
- **Build extension**: `cd extension && npm run build` - Builds the browser extension
- **Watch extension**: `cd extension && npm run watch` - Builds extension in watch mode
- **Clean extension**: `cd extension && npm run clean` - Removes extension build artifacts

### Development Server
- **Run MCP server**: `npm run run-server` - Starts the browser automation server
- **Run with CLI**: `npx @playwright/mcp` - Run as MCP server via CLI

## High-Level Architecture

### Core Components

**MCP Server Implementation**
- `src/mcp/server.ts` - Main MCP server implementation using Model Context Protocol SDK
- `src/mcp/transport.ts` - Transport layer for MCP communication (SSE, stdio)
- `src/mcp/inProcessTransport.ts` - In-process transport for testing and embedded usage

**Browser Automation**
- `src/context.ts` - Browser context management, handles Playwright browser instances
- `src/browserContextFactory.ts` - Factory for creating browser contexts with different configurations
- `src/tab.ts` - Tab management within browser contexts
- `src/tools.ts` - Registry and management of all MCP tools

**Tool Categories** (in `src/tools/`)
- `navigate.ts` - URL navigation tools
- `snapshot.ts` - Accessibility tree snapshot capture
- `mouse.ts` - Mouse interaction tools (click, drag, hover)
- `keyboard.ts` - Keyboard input tools
- `screenshot.ts` - Screenshot capture functionality
- `evaluate.ts` - JavaScript evaluation in page context
- `files.ts` - File upload handling
- `dialogs.ts` - Dialog handling (alerts, confirms, prompts)
- `tabs.ts` - Tab management tools
- `pdf.ts` - PDF generation (optional capability)

**Extension Support**
- `src/extension/` - Chrome extension for CDP relay
- `extension/src/` - Extension source code for browser integration
- Enables connection to existing browser instances via CDP

**Session Management**
- `src/sessionLog.ts` - Session logging and persistence
- `src/fileUtils.ts` - File system utilities for output management
- Supports both isolated and persistent browser profiles

### Design Patterns

**Tool Registration**: Each tool extends the base `Tool` class and is registered in the tool registry. Tools define their schema, permissions, and implementation.

**Transport Abstraction**: Multiple transport mechanisms (stdio, SSE, in-process) share a common interface, allowing flexible deployment options.

**Browser Context Factory**: Supports multiple browser backends (local Playwright, CDP endpoint, remote) with consistent API.

**Capability System**: Optional features (tabs, install, pdf, vision) are enabled via command-line flags, keeping the core lightweight.

### Configuration

**Config Schema** (`src/config.ts`):
- Browser configuration (browser type, launch options, context options)
- Server configuration (port, host for HTTP transport)
- Network configuration (allowed/blocked origins)
- Output directory for screenshots and session logs

**TypeScript Configuration**:
- Target: ESNext with NodeNext module resolution
- Strict mode enabled
- Separate configs for main project and extension

### Key Implementation Details

**Accessibility-First Approach**: Uses Playwright's accessibility tree instead of visual parsing, making it LLM-friendly without requiring vision models.

**Session Persistence**: Supports both isolated sessions (for testing) and persistent profiles (for stateful automation).

**Error Handling**: Comprehensive error handling with meaningful messages for MCP clients.

**File-Based Screenshots**: Screenshots are saved to disk and file paths are returned to avoid response size limitations.

## Testing Strategy

Tests use Playwright Test framework with custom fixtures defined in `tests/fixtures.ts`. The test suite covers:
- Core browser automation functionality
- MCP protocol compliance
- Different browser engines (Chrome, Firefox, WebKit, Edge)
- Docker support for headless testing
- CDP connection modes
- Session persistence and isolation

Run tests in headed mode for debugging: `PWDEBUG=1 npm test`
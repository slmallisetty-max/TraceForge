# TraceForge Demo App

Simple Node.js application that demonstrates TraceForge proxy usage.

## Setup

1. Install dependencies:
   ```bash
   cd examples/demo-app
   npm install
   ```

2. Create `.env` file:
   ```
   OPENAI_API_KEY=your-api-key-here
   OPENAI_BASE_URL=http://localhost:8787/v1
   ```

3. Make sure the TraceForge proxy is running:
   ```bash
   cd packages/proxy
   npm start
   ```

4. Run the demo:
   ```bash
   node index.js
   ```

5. Check the traces:
   ```bash
   cd ../..
   npx @traceforge/cli trace list
   ```

## What It Does

The demo app:
- Connects to OpenAI via the TraceForge proxy
- Sends a simple chat completion request
- The proxy captures and saves the trace
- You can view the trace using the CLI

# TraceForge Python Demo

Simple Python application that demonstrates TraceForge proxy usage with the OpenAI Python client.

## Prerequisites

- Python 3.8 or higher
- TraceForge proxy running on port 8787
- OpenAI API key

## Setup

### 1. Install Python Dependencies

```bash
cd examples/python-demo
pip install -r requirements.txt
```

Alternatively, you can use a virtual environment (recommended):

```bash
cd examples/python-demo

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Create `.env` File

Copy the example environment file and add your OpenAI API key:

```bash
cp .env.example .env
```

Then edit `.env` and replace `your-api-key-here` with your actual OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_BASE_URL=http://localhost:8787/v1
```

**⚠️ Important:** Never commit your `.env` file to version control! It contains your secret API key.

### 3. Start the TraceForge Proxy

Make sure the TraceForge proxy is running before running the demo:

```bash
# From the repository root
cd /home/runner/work/TraceForge.baseline/TraceForge.baseline
npx pnpm dev
```

Or start just the proxy:

```bash
cd packages/proxy
npm start
```

The proxy should be running at `http://localhost:8787`.

### 4. Run the Demo

```bash
python demo.py
```

Or make it executable and run directly:

```bash
chmod +x demo.py
./demo.py
```

## What It Does

The demo app demonstrates two types of OpenAI API interactions:

1. **Regular Chat Completion** - A standard synchronous request that waits for the complete response
2. **Streaming Chat Completion** - A streaming request that processes the response in real-time as it arrives

Both requests are automatically intercepted and traced by the TraceForge proxy.

## Viewing Traces

After running the demo, you can view the captured traces in several ways:

### Web UI (Recommended)

Open the TraceForge web interface in your browser:

```
http://localhost:5173
```

You'll see:
- Timeline of all captured traces
- Detailed request/response data
- Token usage and timing information
- Ability to compare traces side-by-side

### CLI

Use the TraceForge CLI to list and inspect traces:

```bash
# From the repository root
cd /home/runner/work/TraceForge.baseline/TraceForge.baseline

# List all traces
npx @traceforge/cli trace list

# View a specific trace
npx @traceforge/cli trace view <trace-id>
```

### File System

Traces are stored as JSON files in the `.ai-tests/traces/` directory:

```bash
# List trace files
ls -la .ai-tests/traces/

# View a trace file
cat .ai-tests/traces/<trace-id>.json
```

## Troubleshooting

### "Module not found" error

Make sure you've installed the dependencies:

```bash
pip install -r requirements.txt
```

### "Connection refused" error

Make sure the TraceForge proxy is running on port 8787:

```bash
cd packages/proxy
npm start
```

### "Invalid API key" error

Check that your `.env` file contains a valid OpenAI API key:

```bash
cat .env
```

The API key should start with `sk-` for OpenAI.

### Virtual environment issues

If you're having trouble with dependencies, try creating a fresh virtual environment:

```bash
# Remove old venv if it exists
rm -rf venv

# Create new virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

## Multi-Provider Support

TraceForge supports multiple AI providers! Just change the model name:

```python
# Use Claude (requires ANTHROPIC_API_KEY in root .env)
completion = client.chat.completions.create(
    model='claude-3-opus-20240229',
    messages=[{'role': 'user', 'content': 'Hello!'}]
)

# Use Gemini (requires GEMINI_API_KEY in root .env)
completion = client.chat.completions.create(
    model='gemini-pro',
    messages=[{'role': 'user', 'content': 'Hello!'}]
)

# Use local Ollama (no API key needed)
completion = client.chat.completions.create(
    model='llama2',
    messages=[{'role': 'user', 'content': 'Hello!'}]
)
```

## Next Steps

- Explore the [main documentation](../../README.md) to learn more about TraceForge
- Try [creating tests from traces](../../docs/getting-started.md#creating-tests)
- Check out the [web dashboard](http://localhost:5173/dashboard) for analytics
- Compare traces side-by-side using the web UI

## Learn More

- [TraceForge Main README](../../README.md)
- [Getting Started Guide](../../docs/getting-started.md)
- [Trace Format Documentation](../../docs/trace-format.md)
- [Node.js Example](../demo-app/README.md)

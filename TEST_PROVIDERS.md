# Provider Test Script

This script tests each LLM provider to verify that the API calls are working correctly.

## Usage

```bash
npm run test:providers
```

## What It Does

The test script:
1. Creates a minimal sample image (1x1 pixel PNG)
2. Tests each provider sequentially in priority order:
   - Groq
   - Cloudflare
   - NVIDIA
   - HuggingFace
   - SambaNova
3. Sends a vision request to each configured provider
4. Reports success/failure with response time
5. Skips providers that don't have API keys configured

## Requirements

Before running the test, ensure you have set up your environment variables:

```bash
# At least one of these API keys must be set
GROQ_API_KEY=your_key_here
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
NVIDIA_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_key_here
SAMBANOVA_API_KEY=your_key_here
```

You can copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
# Edit .env with your API keys
```

## Output Example

```
🧪 Provider Test Suite
Testing each provider with a sample image...

[==================================================]
[1/5] Testing Groq...
[==================================================]
📤 Sending request to Groq...
✅ Groq responded in 1234ms
📝 Response: This is a minimal test image showing a single pixel...

[==================================================]
[2/5] Testing Cloudflare...
[==================================================]
⚠️  Cloudflare not configured (API key not set)

...

==================================================
✨ Test suite completed!
==================================================
```

## Interpreting Results

- **✅ Success**: Provider responded successfully with the expected output
- **⚠️ Not Configured**: API key is not set in environment variables
- **❌ Failed**: Provider returned an error (check API key, quota, or network)

## Troubleshooting

### "API key not set" errors
Ensure your `.env` file has the correct API keys set.

### "Rate limit" errors
Wait a few minutes and try again. Some free-tier APIs have rate limits.

### "Model not found" errors
Check that the model names in `freetier-orchestrator/src/providers/config.ts` are correct for your provider.

### Network errors
Check your internet connection and firewall settings.

import "dotenv/config";

async function diagnoseHuggingFace(): Promise<void> {
  console.log("\n🔍 HuggingFace Diagnostic Check\n");

  const apiKey = process.env.HUGGINGFACE_API_KEY;

  // Check 1: API Key presence
  console.log("1️⃣  API Key Check");
  if (!apiKey) {
    console.log("   ❌ HUGGINGFACE_API_KEY is not set");
    return;
  }
  console.log("   ✅ HUGGINGFACE_API_KEY is set");
  console.log(`   📝 Key length: ${apiKey.length} characters`);
  console.log(`   📝 Key prefix: ${apiKey.substring(0, 10)}...`);

  // Check 2: Network connectivity
  console.log("\n2️⃣  Network Connectivity Check");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("https://api-inference.huggingface.co/", {
      method: "HEAD",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log(`   ✅ HuggingFace API is reachable (status: ${response.status})`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Cannot reach HuggingFace API: ${errorMsg}`);
  }

  // Check 3: API Key validation
  console.log("\n3️⃣  API Key Validation Check");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("https://api-inference.huggingface.co/api/model_info/gpt2", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.status === 200) {
      console.log("   ✅ API key is valid");
      const data = await response.json();
      console.log(`   📝 Model info retrieved successfully`);
    } else if (response.status === 401) {
      console.log("   ❌ API key is invalid or expired (401 Unauthorized)");
    } else if (response.status === 403) {
      console.log("   ❌ API key is forbidden (403 Forbidden)");
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
      const text = await response.text();
      console.log(`   📝 Response: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ API validation failed: ${errorMsg}`);
  }

  // Check 4: Vision model availability
  console.log("\n4️⃣  Vision Model Availability Check");
  const visionModel = process.env.HUGGINGFACE_VISION_MODEL || "meta-llama/Llama-4-Scout-17B-16E-Instruct";
  console.log(`   📝 Testing model: ${visionModel}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("https://api-inference.huggingface.co/api/model_info/" + encodeURIComponent(visionModel), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.status === 200) {
      console.log(`   ✅ Vision model is accessible`);
    } else if (response.status === 404) {
      console.log(`   ❌ Vision model not found (404)`);
      console.log(`   💡 Try a different model or check the model name`);
    } else {
      console.log(`   ⚠️  Status: ${response.status}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Model check failed: ${errorMsg}`);
  }

  // Check 5: Direct inference call
  console.log("\n5️⃣  Direct Inference Call Test");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch("https://api-inference.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: "user",
            content: "Hello"
          }
        ],
        max_tokens: 10
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.status === 200) {
      console.log("   ✅ Inference endpoint is working");
      const data = await response.json();
      console.log(`   📝 Response received`);
    } else if (response.status === 401) {
      console.log("   ❌ Unauthorized (401) - API key issue");
    } else if (response.status === 429) {
      console.log("   ⚠️  Rate limited (429) - Try again later");
    } else if (response.status === 503) {
      console.log("   ⚠️  Service unavailable (503) - HuggingFace API is down");
    } else {
      const text = await response.text();
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   📝 Response: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Inference call failed: ${errorMsg}`);
  }

  console.log("\n" + "=".repeat(52));
  console.log("✨ Diagnostic check completed!");
  console.log("=".repeat(52) + "\n");
}

diagnoseHuggingFace().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

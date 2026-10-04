
const prompt = `You are an expert in data extraction from images. You are given a screenshot of the HDFC Securities "Top Gainer NSE" page.Analyse the page carefully.
The page contains a list of stock cards. Each card follows this exact pattern:

<Company Name>
LTP      GAIN      GAIN(%)
<price>  <change>  <changePercent>

Example card:
Network 18 Media & Investments Ltd
LTP      GAIN      GAIN(%)
33.58    3.59      11.97

From this card extract:
- "name"          → "Network 18 Media & Investments Ltd"
- "price"         → "33.58"
- "change"        → "3.59"
- "changePercent" → "11.97"

Rules for extraction:
- Ignore all other fields on the card: Day's Low, Day's High, Day's Volume, BUY, SELL buttons.
- LTP value is the price 
- GAIN value is the change
- GAIN(%) is the changePercent
- Strip commas from numbers (5,14,97,471 → 51497471).
- You MUST extract all the values from the page as they will always be there.
- Do not skip any card.
- Sort the final extracted values descending by 'change' (highest first).

Return ONLY a single, valid, minified JSON object with a 'topGainers' key. No text, no explanations, no markdown.
STRICT RULES:
1. Every object must contain ALL four keys: 'name', 'price', 'change', 'changePercent'.
2. Never emit a bare key. Always include a colon and a value. INVALID: "price" VALID: "price": "".
3. If a value cannot be extracted, use an empty string "". Example: "price": "".
4. Follow this exact shape: {"name":"...","price":"...","change":"...","changePercent":"..."}`;

async function testAgent() {
  console.log("Sending extraction request to local agent...");
  try {
    const response = await fetch("http://localhost:3000/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: "https://www.hdfcsec.com/market/equity/top-gainer-nse?indicesCode=76394",
        prompt: prompt
      })
    });

    const data = await response.text();
    console.log("Response status:", response.status);
    console.log("Response body:");
    console.log(data);
  } catch (error) {
    console.error("Error connecting to the agent:", error);
  }
}

testAgent();

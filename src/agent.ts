import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { createProviders, FreeTierOrchestrator, type LlmInput } from "@freetier/orchestrator";
import { capturePageScreenshot } from "./browser.js";

const SYSTEM_PROMPT = [
  "You are an expert visual data extraction engine.",
  "Extract only the data requested by the user from the provided webpage screenshot.",
  "Follow the user's requested output format exactly.",
  "Return only the final answer, without markdown, code fences, explanations, or extra text.",
  "If the requested data is not visible in the screenshot, return the user's requested empty or null structure."
].join(" ");

const orchestrator = new FreeTierOrchestrator<LlmInput, string>(createProviders());

const AgentState = Annotation.Root({
  url: Annotation<string>(),
  prompt: Annotation<string>(),
  fullPage: Annotation<boolean>(),
  screenshotBase64: Annotation<string | undefined>(),
  result: Annotation<string | undefined>()
});

async function captureNode(state: typeof AgentState.State) {
  return {
    screenshotBase64: await capturePageScreenshot(state.url, state.fullPage)
  };
}

async function extractNode(state: typeof AgentState.State) {
  if (!state.screenshotBase64) {
    throw new Error("Screenshot capture failed.");
  }

  const result = await orchestrator.invoke({
    system: SYSTEM_PROMPT,
    prompt: state.prompt,
    imageBase64: state.screenshotBase64
  });

  return {
    result,
    screenshotBase64: undefined
  };
}

const graph = new StateGraph(AgentState)
  .addNode("capture", captureNode)
  .addNode("extract", extractNode)
  .addEdge(START, "capture")
  .addEdge("capture", "extract")
  .addEdge("extract", END)
  .compile();

export async function runExtractionAgent(input: { url: string; prompt: string; fullPage: boolean }): Promise<string> {
  const finalState = await graph.invoke({
    url: input.url,
    prompt: input.prompt,
    fullPage: input.fullPage,
    screenshotBase64: undefined,
    result: undefined
  });

  return finalState.result ?? "";
}

export function getOrchestratorStatus() {
  return {
    currentProvider: orchestrator.getCurrentProvider(),
    providers: orchestrator.getStatus()
  };
}

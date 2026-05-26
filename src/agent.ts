import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { capturePageScreenshot } from "./browser.js";
import { ProviderOrchestrator } from "./providers/orchestrator.js";
import { createProviders } from "./providers/factory.js";

const orchestrator = new ProviderOrchestrator(createProviders());

const AgentState = Annotation.Root({
  url: Annotation<string>(),
  prompt: Annotation<string>(),
  screenshotBase64: Annotation<string | undefined>(),
  result: Annotation<string | undefined>()
});

async function captureNode(state: typeof AgentState.State) {
  return {
    screenshotBase64: await capturePageScreenshot(state.url)
  };
}

async function extractNode(state: typeof AgentState.State) {
  if (!state.screenshotBase64) {
    throw new Error("Screenshot capture failed.");
  }

  return {
    result: await orchestrator.extract(state.prompt, state.screenshotBase64),
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

export async function runExtractionAgent(input: { url: string; prompt: string }): Promise<string> {
  const finalState = await graph.invoke({
    url: input.url,
    prompt: input.prompt,
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

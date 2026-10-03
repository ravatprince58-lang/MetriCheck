import { analyzeWithOpenRouter } from "./openRouterService";

async function testOpenRouter() {
  try {
    const result = await analyzeWithOpenRouter(`
      AMUL BUTTER
      NET WEIGHT 100 g
      MRP ₹58.00
      FSSAI LIC NO 10012011000000
      MANUFACTURED BY GCMMF
    `);

    console.log("OpenRouter response:");
    console.log(result);
  } catch (error) {
    console.error("OpenRouter error:", error);
  }
}

testOpenRouter();
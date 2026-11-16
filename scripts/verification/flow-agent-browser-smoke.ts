import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { prepareFlowAgent } from "../../server/src/services/flow-agent-browser.js";
import { writeFile } from "node:fs/promises";
const require = createRequire(
  new URL("../../server/package.json", import.meta.url)
);
const { chromium } =
  require("playwright-core") as typeof import("../../server/node_modules/playwright-core/index.js");
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.route("**/*", (route) => route.abort());
  async function fixture(amount: number, videos = 1, always = true) {
    await page.setContent(
      `<button>Nouveau projet</button><div role="textbox" contenteditable="true"></div><button class="agent-action-button" aria-label="Paramètres"></button><input type="radio" aria-label="Toujours L'agent demandera une confirmation avant de générer" ${
        always ? "checked" : ""
      }><button aria-label="Modèle par défaut de génération de vidéo">Veo 3.1 - Lite</button><button>Retour</button><button aria-label="Lancer la génération" onclick="const card=document.createElement('flow-permission-message');card.innerHTML='Voulez-vous que je lance la génération de ${videos} vidéo, qui coûtera ${amount} crédits ?<div role=radio aria-label=Approuver onclick=window.approvals++>Approuver</div>';document.body.append(card)"></button><script>window.approvals=0</script>`
    );
  }
  await fixture(10);
  const valid = await prepareFlowAgent(
    page,
    "Test fixture, no Google call",
    10,
    "Veo 3.1 - Lite"
  );
  assert.equal(valid.credits, 10);
  assert.equal(await page.evaluate("window.approvals"), 0);
  await valid.approve.click();
  assert.equal(await page.evaluate("window.approvals"), 1);
  for (const [amount, videos] of [
    [11, 1],
    [10, 2],
  ]) {
    await fixture(amount, videos);
    await assert.rejects(() =>
      prepareFlowAgent(page, "Rejected fixture", 10, "Veo 3.1 - Lite")
    );
    assert.equal(await page.evaluate("window.approvals"), 0);
  }
  await fixture(10, 1, false);
  await assert.rejects(
    () =>
      prepareFlowAgent(page, "Rejected automatic mode", 10, "Veo 3.1 - Lite"),
    /HUMAN_CONFIRMATION/
  );
  const proof = {
    passed: true,
    mode: "real local Chromium with synthetic offline HTML fixtures, not Google",
    checks: [
      "single-video 10-credit approval parsed",
      "preparation never clicks approval",
      "explicit click occurs once",
      "over-budget approval rejected",
      "multiple-video approval rejected",
      "automatic-spending mode rejected",
    ],
    realGoogleGeneration: false,
  };
  await writeFile(
    "doc/verification/flow-agent-browser-fixture.json",
    JSON.stringify(proof, null, 2) + "\n"
  );
  console.log(JSON.stringify(proof, null, 2));
} finally {
  await browser.close();
}

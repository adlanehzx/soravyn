import type { Page } from "playwright-core";
import { approvalCredits } from "./flow-contract.js";
// These controls were inspected in the authenticated French Flow Agent interface.
// This deliberately rejects changed UI, multiple media and unknown prices.
export async function prepareFlowAgent(
  page: Page,
  prompt: string,
  maxCredits: number,
  model: string
) {
  await page
    .getByRole("button", { name: "Nouveau projet", exact: true })
    .click();
  await page
    .locator("[role=textbox][contenteditable=true]")
    .waitFor({ state: "visible" });
  await page
    .locator('button.agent-action-button[aria-label="Paramètres"]')
    .click();
  const always = page.getByRole("radio", {
    name: /^Toujours L.agent demandera une confirmation/,
  });
  if (!(await always.isChecked()))
    throw new Error("HUMAN_CONFIRMATION_MUST_BE_ENABLED");
  if (
    !(
      await page
        .getByRole("button", {
          name: "Modèle par défaut de génération de vidéo",
          exact: true,
        })
        .innerText()
    ).includes(model)
  )
    throw new Error("SETTINGS_CHANGED");
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  if (
    (await page.locator("flow-permission-message").count()) ||
    (await page.locator("flow-video-tile").count())
  )
    throw new Error("PROJECT_NOT_EMPTY");
  await page
    .locator("[role=textbox][contenteditable=true]")
    .fill(
      `Crée UN SEUL clip vidéo avec ${model}, 8 secondes, 16:9, 720p, sans génération préalable d'image ni variante. Demande la confirmation native de Flow avant toute dépense. Maximum total ${maxCredits} crédits. Si le coût dépasse ce maximum, ne génère rien. Brief :\n${prompt}`
    );
  await page
    .getByRole("button", { name: "Lancer la génération", exact: true })
    .click();
  const approval = page.locator("flow-permission-message");
  await approval.waitFor({ state: "visible", timeout: 120000 });
  if ((await approval.count()) !== 1) throw new Error("AMBIGUOUS_APPROVAL");
  const credits = approvalCredits(await approval.innerText(), maxCredits);
  const approve = approval.getByRole("radio", {
    name: "Approuver",
    exact: true,
  });
  if ((await approve.count()) !== 1) throw new Error("AMBIGUOUS_APPROVAL");
  return { credits, approve };
}
export async function waitFlowAgentResult(page: Page) {
  const tile = page.locator("flow-video-tile");
  if ((await tile.count()) === 0) return false;
  if ((await tile.count()) !== 1) throw new Error("AMBIGUOUS_RESULT");
  if (/\d+\s*%/.test(await tile.innerText())) return false;
  await tile.hover();
  return await tile
    .locator('flow-video-hotbar button[aria-label="Autres options"]')
    .isVisible();
}
export async function downloadFlowAgent(page: Page) {
  const tile = page.locator("flow-video-tile");
  if ((await tile.count()) !== 1) throw new Error("AMBIGUOUS_RESULT");
  await tile.hover();
  await tile
    .locator('flow-video-hotbar button[aria-label="Autres options"]')
    .click();
  await page
    .getByRole("menuitem", { name: "download Télécharger", exact: true })
    .click();
  // Original size only: never select a potentially paid upscale.
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    page
      .getByRole("menuitem", { name: "720p Taille d'origine", exact: true })
      .click(),
  ]);
  return download;
}

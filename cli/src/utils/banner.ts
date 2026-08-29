import pc from "picocolors";

const SORAVYN_ART = [
  " ██████╗ ██████╗ ███████╗███╗   ██╗███████╗ ██████╗ ██╗   ██╗██╗     ",
  "██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔═══██╗██║   ██║██║     ",
  "██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████╗██║   ██║██║   ██║██║     ",
  "██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║╚════██║██║   ██║██║   ██║██║     ",
  "╚██████╔╝██║     ███████╗██║ ╚████║███████║╚██████╔╝╚██████╔╝███████╗",
  " ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝",
] as const;

const TAGLINE = "Open-source agentic marketing stack";

export function printSORAVYNCliBanner(): void {
  const lines = [
    "",
    ...SORAVYN_ART.map((line) => pc.cyan(line)),
    pc.blue("  ───────────────────────────────────────────────────────"),
    pc.bold(pc.white(`  ${TAGLINE}`)),
    "",
  ];

  console.log(lines.join("\n"));
}

/* The single source of the install commands the app shows to agent users.
   Command strings are literal on purpose — packages/mcp/tests/skill.test.ts
   greps this file's source against the real manifests, so a renamed package,
   plugin or marketplace turns CI red instead of shipping a wrong command. */

export interface AgentCommand {
  text: string;
  comment?: string;
}

export interface AgentSection {
  id: "claude-code" | "codex" | "agent-skills";
  title: string;
  note?: string;
  commands: AgentCommand[];
}

export const AGENT_SETUP_SECTIONS: AgentSection[] = [
  {
    id: "claude-code",
    title: "Claude Code",
    commands: [
      { text: "claude plugin marketplace add frontsail-ai/qr-code-generator" },
      { text: "claude plugin install qr-code-generator@frontsail-qr", comment: "the skill" },
      { text: "claude mcp add qr -- npx -y @frontsail-ai/qr-mcp", comment: "the generator" },
    ],
  },
  {
    id: "codex",
    title: "OpenAI Codex",
    commands: [
      {
        text: "$skill-installer https://github.com/frontsail-ai/qr-code-generator/tree/master/skills/qr-code",
      },
      { text: "codex mcp add qr -- npx -y @frontsail-ai/qr-mcp" },
    ],
  },
  {
    id: "agent-skills",
    title: "Any agent",
    note: "Follows the Agent Skills spec — copy skills/qr-code/ into your agent's skills directory, then register the generator as a stdio MCP server:",
    commands: [{ text: "npx -y @frontsail-ai/qr-mcp" }],
  },
];

export const REPO_URL = "https://github.com/frontsail-ai/qr-code-generator";

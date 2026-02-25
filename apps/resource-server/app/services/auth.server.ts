import { createHash } from "node:crypto";
import { prisma } from "@sample-auth-app/db-resource";

export type DemoUser = {
  id: string;
  username: string;
  displayName: string;
};

function getConfiguredUsername() {
  return process.env.RESOURCE_SERVER_USERNAME ?? "admin";
}

function getConfiguredPassword() {
  return process.env.RESOURCE_SERVER_PASSWORD ?? "password";
}

function getConfiguredDisplayName() {
  return process.env.RESOURCE_SERVER_DISPLAY_NAME ?? "Demo User";
}

function hashPassword(password: string) {
  // Minimal demo hash (not production-grade password storage policy).
  return createHash("sha256").update(password).digest("hex");
}

export async function ensureDemoUser() {
  const username = getConfiguredUsername();
  const displayName = getConfiguredDisplayName();
  const passwordHash = hashPassword(getConfiguredPassword());

  await prisma.resourceUser.upsert({
    where: { username },
    create: {
      username,
      displayName,
      passwordHash,
      isActive: true,
    },
    update: {
      displayName,
      passwordHash,
      isActive: true,
    },
  });
}

export async function authenticateWithPassword(username: string, password: string): Promise<DemoUser | null> {
  const user = await prisma.resourceUser.findUnique({
    where: { username },
  });

  if (!user || !user.isActive) return null;
  if (user.passwordHash !== hashPassword(password)) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  };
}

export function getLoginHint() {
  return {
    username: getConfiguredUsername(),
  };
}

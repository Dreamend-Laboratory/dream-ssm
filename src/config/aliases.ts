import * as path from 'path';
import * as os from 'os';

export interface Alias {
  instanceId: string;
  user: string;
  region: string;
  name?: string;
}

export interface AliasConfig {
  aliases: Record<string, Alias>;
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'dream-ssm');
const CONFIG_FILE = path.join(CONFIG_DIR, 'aliases.json');

async function ensureConfigDir(): Promise<void> {
  const dir = Bun.file(CONFIG_DIR);
  if (!await dir.exists()) {
    await Bun.write(CONFIG_FILE, JSON.stringify({ aliases: {} }, null, 2));
  }
}

export async function loadAliases(): Promise<AliasConfig> {
  try {
    const file = Bun.file(CONFIG_FILE);
    if (await file.exists()) {
      return await file.json();
    }
  } catch {}
  return { aliases: {} };
}

export async function saveAliases(config: AliasConfig): Promise<void> {
  await ensureConfigDir();
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function getAlias(name: string): Promise<Alias | undefined> {
  const config = await loadAliases();
  return config.aliases[name];
}

export async function setAlias(name: string, alias: Alias): Promise<void> {
  const config = await loadAliases();
  config.aliases[name] = alias;
  await saveAliases(config);
}

export async function removeAlias(name: string): Promise<boolean> {
  const config = await loadAliases();
  if (config.aliases[name]) {
    delete config.aliases[name];
    await saveAliases(config);
    return true;
  }
  return false;
}

export async function listAliases(): Promise<Record<string, Alias>> {
  const config = await loadAliases();
  return config.aliases;
}

export function parseAliasPath(pathStr: string): { alias: string; path: string } | null {
  const match = pathStr.match(/^([a-zA-Z][a-zA-Z0-9_-]*):(.+)$/);
  if (match) {
    const alias = match[1]!;
    const path = match[2]!;
    if (!alias.startsWith('i-')) {
      return { alias, path };
    }
  }
  return null;
}

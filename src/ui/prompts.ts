import * as p from '@clack/prompts';
import pc from 'picocolors';
import fuzzysort from 'fuzzysort';
import type { Instance, AWSProfile } from '../types';
import { getRegionDisplayName } from '../aws/regions';
import { listAliases } from '../config/aliases';

export async function selectRegion(regions: string[]): Promise<string | null> {
  const result = await p.select({
    message: 'Select AWS Region',
    options: [
      { value: 'all', label: pc.bold('All regions') },
      ...regions.map(r => ({ value: r, label: getRegionDisplayName(r) }))
    ]
  });
  
  if (p.isCancel(result)) {
    return null;
  }
  
  return result as string;
}

export async function selectInstance(instances: Instance[]): Promise<Instance | null> {
  const aliases = await listAliases();
  const aliasMap = new Map<string, string[]>();
  
  for (const [name, alias] of Object.entries(aliases)) {
    const existing = aliasMap.get(alias.instanceId) || [];
    existing.push(name);
    aliasMap.set(alias.instanceId, existing);
  }
  
  const options = instances.map(i => {
    const instanceAliases = aliasMap.get(i.instanceId);
    const aliasLabel = instanceAliases 
      ? pc.cyan(` [${instanceAliases.join(', ')}]`) 
      : '';
    
    return {
      value: i.instanceId,
      label: `${i.name || i.instanceId}${aliasLabel}`,
      hint: `${i.instanceId} | ${i.privateIp} | ${i.instanceType} | ${i.region}`
    };
  });
  
  const result = await p.select({
    message: 'Select instance',
    options
  });
  
  if (p.isCancel(result)) {
    return null;
  }
  
  return instances.find(i => i.instanceId === result)!;
}

export async function selectProfile(profiles: AWSProfile[]): Promise<string | null> {
  const result = await p.select({
    message: 'Select AWS profile',
    options: profiles.map(profile => ({
      value: profile.name,
      label: profile.name,
      hint: profile.ssoStartUrl 
        ? `SSO - ${profile.region || 'no region'}` 
        : profile.region || 'no region'
    }))
  });
  
  if (p.isCancel(result)) {
    return null;
  }
  
  return result as string;
}

export async function selectLoginMethod(): Promise<'sso' | 'profile' | 'configure' | 'manual' | null> {
  const result = await p.select({
    message: 'How would you like to authenticate?',
    options: [
      { value: 'sso', label: 'AWS SSO Login', hint: 'Recommended for organizations' },
      { value: 'profile', label: 'Use existing AWS Profile', hint: 'Select from ~/.aws/credentials' },
      { value: 'configure', label: 'Configure new profile', hint: 'Run aws configure sso' },
      { value: 'manual', label: 'Show manual instructions', hint: 'I will configure myself' }
    ]
  });
  
  if (p.isCancel(result)) {
    return null;
  }
  
  return result as 'sso' | 'profile' | 'configure' | 'manual';
}

export async function selectMainAction(): Promise<'list' | 'connect' | 'scp' | 'exit'> {
  const result = await p.select({
    message: 'What would you like to do?',
    options: [
      { value: 'list', label: 'List EC2 instances' },
      { value: 'connect', label: 'Connect to instance' },
      { value: 'scp', label: 'Transfer files (SCP)' },
      { value: 'exit', label: 'Exit' }
    ]
  });
  
  if (p.isCancel(result)) {
    return 'exit';
  }
  
  return result as 'list' | 'connect' | 'scp' | 'exit';
}

export async function confirmAction(message: string): Promise<boolean> {
  const result = await p.confirm({ message });
  if (p.isCancel(result)) return false;
  return result;
}

export function showSpinner() {
  return p.spinner();
}

import { $ } from 'bun';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getAllRegions } from '../aws/regions';
import { listInstancesAllRegions } from '../aws/ec2';
import { startSSMSession } from '../aws/ssm';
import { selectInstance, showSpinner } from '../ui/prompts';
import { getAlias } from '../config/aliases';
import type { AuthContext, Instance } from '../types';

export async function connectCommand(
  auth: AuthContext,
  instanceIdOrAlias?: string
): Promise<void> {
  const { profile, region } = auth;
  
  let targetInstance: Instance | undefined | null;
  
  if (instanceIdOrAlias) {
    if (!instanceIdOrAlias.startsWith('i-')) {
      const alias = await getAlias(instanceIdOrAlias);
      if (alias) {
        targetInstance = {
          instanceId: alias.instanceId,
          region: alias.region,
          name: alias.name || '',
          state: 'running',
          privateIp: '',
          instanceType: '',
          ssmStatus: 'Online'
        };
        p.note(
          `${pc.green(instanceIdOrAlias)} → ${alias.name || alias.instanceId}\n` +
          `${pc.dim(`Region: ${alias.region}`)}`,
          'Using Alias'
        );
      } else {
        p.note(pc.red(`Alias "${instanceIdOrAlias}" not found.\n\nUse ${pc.cyan('dream-ssm alias list')} to see available aliases.`), 'Error');
        process.exit(1);
      }
    } else {
      targetInstance = await findInstanceById(instanceIdOrAlias, region, profile);
      if (!targetInstance) {
        p.note(pc.red(`Instance ${instanceIdOrAlias} not found or SSM agent not online.`), 'Error');
        process.exit(1);
      }
    }
  } else {
    targetInstance = await selectInstanceInteractive(profile);
    if (!targetInstance) return;
  }
  
  if (!targetInstance) return;
  
  await startSession(targetInstance, profile);
}

async function findInstanceById(
  instanceId: string,
  region: string,
  profile?: string
): Promise<Instance | undefined> {
  const spinner = showSpinner();
  spinner.start('Looking up instance...');
  
  const regions = await getAllRegions(profile);
  const instances = await listInstancesAllRegions(regions, profile, true);
  
  spinner.stop('Done');
  
  return instances.find(i => i.instanceId === instanceId);
}

async function selectInstanceInteractive(profile?: string): Promise<Instance | null> {
  const spinner = showSpinner();
  spinner.start('Loading instances from all regions...');
  
  const regions = await getAllRegions(profile);
  const instances = await listInstancesAllRegions(regions, profile, true);
  
  spinner.stop(`Found ${instances.length} instance(s)`);
  
  if (instances.length === 0) {
    p.note(pc.yellow('No instances with SSM agent online found.'), 'No Instances');
    return null;
  }
  
  return await selectInstance(instances);
}

export async function startSession(instance: Instance, profile?: string): Promise<void> {
  const spinner = showSpinner();
  spinner.start(`Starting session to ${instance.name || instance.instanceId}...`);
  
  try {
    const session = await startSSMSession(instance.instanceId, instance.region, profile);
    spinner.stop(pc.green('Session started'));
    
    console.log('');
    console.log(pc.dim(`Region: ${instance.region}`));
    console.log(pc.dim(`Instance: ${instance.instanceId}`));
    console.log(pc.dim(`Tip: Press Enter + ~. to disconnect`));
    console.log('');
    
    const sessionJson = JSON.stringify({
      SessionId: session.sessionId,
      StreamUrl: session.streamUrl,
      TokenValue: session.tokenValue
    });
    
    const paramsJson = JSON.stringify({ Target: instance.instanceId });
    const profileArg = profile || 'default';
    
    const proc = Bun.spawn(
      ['session-manager-plugin', sessionJson, instance.region, 'StartSession', profileArg, paramsJson],
      { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' }
    );
    
    await proc.exited;
    
    console.log('');
    console.log(pc.green('Session ended.'));
  } catch (error: any) {
    spinner.stop(pc.red('Failed to start session'));
    
    if (error.message?.includes('session-manager-plugin')) {
      p.note(
        `${pc.yellow('session-manager-plugin is not installed.')}\n\n` +
        `Install it from:\n${pc.cyan('https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html')}`,
        'Missing Plugin'
      );
    } else {
      p.note(pc.red(error.message || 'Unknown error'), 'Error');
    }
    
    process.exit(1);
  }
}

import * as p from '@clack/prompts';
import pc from 'picocolors';
import Table from 'cli-table3';
import { getAllRegions } from '../aws/regions';
import { listInstancesAllRegions } from '../aws/ec2';
import { selectInstance, showSpinner } from '../ui/prompts';
import { listAliases, setAlias, removeAlias, getAlias, type Alias } from '../config/aliases';
import { startSession } from './connect';
import type { AuthContext } from '../types';

export async function aliasListCommand(): Promise<void> {
  const aliases = await listAliases();
  const entries = Object.entries(aliases);
  
  if (entries.length === 0) {
    p.note(pc.dim('No aliases configured.\n\nAdd one with: dream-ssm alias add <name>'), 'Aliases');
    return;
  }
  
  const table = new Table({
    head: [pc.cyan('Alias'), pc.cyan('Instance ID'), pc.cyan('User'), pc.cyan('Region'), pc.cyan('Name')],
    style: { head: [], border: [] }
  });
  
  for (const [name, alias] of entries) {
    table.push([
      pc.green(name),
      alias.instanceId,
      alias.user,
      alias.region,
      alias.name || '-'
    ]);
  }
  
  console.log(table.toString());
}

export async function aliasAddCommand(
  auth: AuthContext,
  aliasName?: string
): Promise<void> {
  const { profile } = auth;
  
  const spinner = showSpinner();
  spinner.start('Loading instances from all regions...');
  const regions = await getAllRegions(profile);
  const instances = await listInstancesAllRegions(regions, profile, true);
  spinner.stop(`Found ${instances.length} instance(s)`);
  
  if (instances.length === 0) {
    p.note(pc.yellow('No instances with SSM agent online found.'), 'No Instances');
    return;
  }
  
  selectInstance: while (true) {
    const instance = await selectInstance(instances);
    if (!instance) return;
    
    selectAction: while (true) {
      const instanceAction = await p.select({
        message: `${instance.name} (${instance.instanceId})`,
        options: [
          { value: 'alias', label: pc.green('Save as alias') },
          { value: 'both', label: 'Save as alias & connect' }
        ]
      });
      
      if (p.isCancel(instanceAction)) continue selectInstance;
      
      enterAlias: while (true) {
        let name = aliasName;
        if (!name) {
          const input = await p.text({
            message: 'Alias name',
            placeholder: instance.name?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'dev',
            validate: (v) => {
              if (!v) return 'Required';
              if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(v)) {
                return 'Must start with letter, only letters/numbers/-/_ allowed';
              }
              return undefined;
            }
          });
          if (p.isCancel(input)) continue selectAction;
          name = input;
        }
        
        const existing = await getAlias(name);
        if (existing) {
          const overwrite = await p.confirm({
            message: `Alias "${name}" already exists. Overwrite?`
          });
          if (p.isCancel(overwrite) || !overwrite) {
            if (aliasName) return;
            continue enterAlias;
          }
        }
        
        const user = await p.text({
          message: 'SSH user',
          defaultValue: 'ec2-user',
          placeholder: 'ec2-user'
        });
        if (p.isCancel(user)) continue enterAlias;
        
        const alias: Alias = {
          instanceId: instance.instanceId,
          user: user as string,
          region: instance.region,
          name: instance.name
        };
        
        await setAlias(name, alias);
        
        p.note(
          `${pc.green(name)} → ${instance.name || instance.instanceId}\n` +
          `${pc.dim(`Instance: ${instance.instanceId}`)}\n` +
          `${pc.dim(`User: ${user}`)}\n` +
          `${pc.dim(`Region: ${instance.region}`)}`,
          'Alias Saved'
        );
        
        if (instanceAction === 'both') {
          await startSession(instance, profile);
        }
        
        return;
      }
    }
  }
}

export async function aliasRemoveCommand(aliasName?: string): Promise<void> {
  let name = aliasName;
  
  if (!name) {
    const aliases = await listAliases();
    const entries = Object.entries(aliases);
    
    if (entries.length === 0) {
      p.note(pc.dim('No aliases to remove.'), 'Aliases');
      return;
    }
    
    const selected = await p.select({
      message: 'Select alias to remove',
      options: entries.map(([n, a]) => ({
        value: n,
        label: `${n} → ${a.name || a.instanceId}`
      }))
    });
    if (p.isCancel(selected)) return;
    name = selected as string;
  }
  
  const removed = await removeAlias(name);
  
  if (removed) {
    p.note(pc.green(`Alias "${name}" removed.`), 'Success');
  } else {
    p.note(pc.red(`Alias "${name}" not found.`), 'Error');
  }
}

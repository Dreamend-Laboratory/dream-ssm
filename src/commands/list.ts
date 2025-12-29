import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getAllRegions } from '../aws/regions';
import { listEC2Instances, listInstancesAllRegions } from '../aws/ec2';
import { displayInstancesTable } from '../ui/table';
import { selectInstance, showSpinner } from '../ui/prompts';
import { configureFilters, getDefaultFilters, displayCurrentFilters } from '../ui/filters';
import { startSession } from './connect';
import { setAlias } from '../config/aliases';
import type { AuthContext, Instance, FilterState } from '../types';

export async function listCommand(auth: AuthContext): Promise<Instance[]> {
  const { profile } = auth;
  
  const spinner = showSpinner();
  spinner.start('Loading regions...');
  
  const regions = await getAllRegions(profile);
  spinner.stop('Regions loaded');
  
  const filters = getDefaultFilters();
  filters.region = 'all';
  
  return await fetchAndDisplayInstances(filters, regions, profile);
}

async function fetchAndDisplayInstances(
  filters: FilterState,
  regions: string[],
  profile?: string
): Promise<Instance[]> {
  const spinner = showSpinner();
  const regionLabel = filters.region === 'all' ? 'all regions' : filters.region;
  spinner.start(`Loading instances from ${regionLabel}...`);
  
  let instances: Instance[];
  const onlySSMOnline = filters.ssmStatus === 'online';
  
  if (filters.region === 'all') {
    instances = await listInstancesAllRegions(regions, profile, onlySSMOnline);
  } else {
    instances = await listEC2Instances(filters.region, profile, onlySSMOnline);
  }
  
  if (filters.state === 'running') {
    instances = instances.filter(i => i.state === 'running');
  }
  
  spinner.stop(`Found ${instances.length} instance(s)`);
  
  displayInstancesTable(instances);
  displayCurrentFilters(filters);
  
  const ssmOnlineInstances = instances.filter(i => i.ssmStatus === 'Online');
  const hasConnectableInstances = ssmOnlineInstances.length > 0;
  
  const options = [
    ...(hasConnectableInstances ? [{ value: 'connect', label: pc.green('Connect to instance') }] : []),
    { value: 'filter', label: 'Change filters' },
    { value: 'refresh', label: 'Refresh' },
    { value: 'done', label: 'Done' }
  ];
  
  const action = await p.select({
    message: 'What next?',
    options
  });
  
  if (p.isCancel(action) || action === 'done') {
    return instances;
  }
  
  if (action === 'connect') {
    const targetInstance = await selectInstance(ssmOnlineInstances);
    if (!targetInstance) {
      return await fetchAndDisplayInstances(filters, regions, profile);
    }
    
    const instanceAction = await p.select({
      message: `${targetInstance.name} (${targetInstance.instanceId})`,
      options: [
        { value: 'connect', label: pc.green('Connect now') },
        { value: 'alias', label: 'Save as alias' },
        { value: 'both', label: 'Save as alias & connect' }
      ]
    });
    
    if (p.isCancel(instanceAction)) {
      return await fetchAndDisplayInstances(filters, regions, profile);
    }
    
    if (instanceAction === 'alias' || instanceAction === 'both') {
      const aliasName = await p.text({
        message: 'Alias name:',
        placeholder: targetInstance.name?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'my-server',
        validate: (value) => {
          if (!value) return 'Alias name is required';
          if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
            return 'Alias must start with a letter and contain only letters, numbers, hyphens, underscores';
          }
        }
      });
      
      if (p.isCancel(aliasName)) {
        return await fetchAndDisplayInstances(filters, regions, profile);
      }
      
      const user = await p.text({
        message: 'SSH user:',
        placeholder: 'ec2-user',
        defaultValue: 'ec2-user'
      });
      
      if (p.isCancel(user)) {
        return await fetchAndDisplayInstances(filters, regions, profile);
      }
      
      await setAlias(aliasName as string, {
        instanceId: targetInstance.instanceId,
        user: (user as string) || 'ec2-user',
        region: targetInstance.region,
        name: targetInstance.name
      });
      
      p.log.success(`Alias '${aliasName}' saved`);
    }
    
    if (instanceAction === 'connect' || instanceAction === 'both') {
      await startSession(targetInstance, profile);
    }
    
    return instances;
  }
  
  if (action === 'filter') {
    const newFilters = await configureFilters(filters, regions);
    return await fetchAndDisplayInstances(newFilters, regions, profile);
  }
  
  if (action === 'refresh') {
    return await fetchAndDisplayInstances(filters, regions, profile);
  }
  
  return instances;
}

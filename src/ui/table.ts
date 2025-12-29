import Table from 'cli-table3';
import pc from 'picocolors';
import type { Instance } from '../types';

export function displayInstancesTable(instances: Instance[]): void {
  if (instances.length === 0) {
    console.log(pc.yellow('\nNo instances found.\n'));
    return;
  }
  
  const table = new Table({
    head: [
      pc.cyan('Region'),
      pc.cyan('Instance ID'),
      pc.cyan('Name'),
      pc.cyan('Private IP'),
      pc.cyan('Type')
    ],
    style: { head: [], border: [] }
  });
  
  instances.forEach(instance => {
    table.push([
      instance.region,
      instance.instanceId,
      instance.name || pc.dim('(no name)'),
      instance.privateIp || pc.dim('-'),
      instance.instanceType
    ]);
  });
  
  console.log('');
  console.log(table.toString());
  console.log('');
  console.log(pc.dim(`Total: ${instances.length} instance(s)`));
  console.log('');
}

export function formatInstance(instance: Instance): string {
  const name = instance.name || instance.instanceId;
  return `${name} (${instance.instanceId}) - ${instance.privateIp}`;
}

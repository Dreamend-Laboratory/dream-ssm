import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { FilterState } from '../types';
import { selectRegion } from './prompts';

export function getDefaultFilters(): FilterState {
  return {
    state: 'running',
    ssmStatus: 'online',
    region: 'all'
  };
}

export async function configureFilters(
  current: FilterState,
  regions: string[]
): Promise<FilterState> {
  const result = await p.select({
    message: 'Configure filters',
    options: [
      {
        value: 'state',
        label: `State: [${pc.yellow(current.state.toUpperCase())}]`,
        hint: 'Toggle running/all'
      },
      {
        value: 'ssm',
        label: `SSM: [${pc.yellow(current.ssmStatus.toUpperCase())}]`,
        hint: 'Toggle online/all'
      },
      {
        value: 'region',
        label: `Region: [${pc.yellow(current.region)}]`,
        hint: 'Change region'
      },
      {
        value: 'apply',
        label: pc.green('Apply filters')
      }
    ]
  });
  
  if (p.isCancel(result) || result === 'apply') {
    return current;
  }
  
  const next = { ...current };
  
  switch (result) {
    case 'state':
      next.state = current.state === 'running' ? 'all' : 'running';
      break;
    case 'ssm':
      next.ssmStatus = current.ssmStatus === 'online' ? 'all' : 'online';
      break;
    case 'region':
      const newRegion = await selectRegion(regions);
      if (!newRegion) return current;
      next.region = newRegion;
      break;
  }
  
  return configureFilters(next, regions);
}

export function displayCurrentFilters(filters: FilterState): void {
  const parts = [
    `State: ${pc.cyan(filters.state)}`,
    `SSM: ${pc.cyan(filters.ssmStatus)}`,
    `Region: ${pc.cyan(filters.region)}`
  ];
  console.log(pc.dim(`Filters: ${parts.join(' | ')}`));
}

import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { fromIni } from '@aws-sdk/credential-providers';
import type { Instance } from '../types';
import { getSSMOnlineInstances } from './ssm';

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export async function listEC2Instances(
  region: string,
  profile?: string,
  onlySSMOnline: boolean = true
): Promise<Instance[]> {
  const clientConfig: any = { region };
  if (profile) {
    clientConfig.credentials = fromIni({ profile });
  }
  
  let targetInstanceIds: string[] | undefined;
  
  if (onlySSMOnline) {
    targetInstanceIds = await getSSMOnlineInstances(region, profile);
    if (targetInstanceIds.length === 0) {
      return [];
    }
  }
  
  const client = new EC2Client(clientConfig);
  const instances: Instance[] = [];
  
  const batches = targetInstanceIds ? chunk(targetInstanceIds, 199) : [undefined];
  
  for (const batch of batches) {
    const filters: any[] = [
      { Name: 'instance-state-name', Values: ['running'] }
    ];
    
    if (batch) {
      filters.push({ Name: 'instance-id', Values: batch });
    }
    
    const response = await client.send(
      new DescribeInstancesCommand({ Filters: filters })
    );
    
    response.Reservations?.forEach(reservation => {
      reservation.Instances?.forEach(instance => {
        const nameTag = instance.Tags?.find(t => t.Key === 'Name');
        instances.push({
          instanceId: instance.InstanceId!,
          name: nameTag?.Value || '',
          privateIp: instance.PrivateIpAddress || '',
          publicIp: instance.PublicIpAddress,
          instanceType: instance.InstanceType || '',
          state: instance.State?.Name || '',
          region,
          platform: instance.Platform,
          ssmStatus: 'Online'
        });
      });
    });
  }
  
  return instances;
}

export async function listInstancesAllRegions(
  regions: string[],
  profile?: string,
  onlySSMOnline: boolean = true
): Promise<Instance[]> {
  const results = await Promise.all(
    regions.map(async (region) => {
      try {
        return await listEC2Instances(region, profile, onlySSMOnline);
      } catch {
        return [];
      }
    })
  );
  
  return results.flat();
}

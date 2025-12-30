/**
 * EC2 인스턴스 조회 모듈
 * 
 * AWS EC2 API를 사용하여 인스턴스 정보를 조회합니다.
 * SSM Agent가 Online인 인스턴스만 필터링하여 조회할 수 있습니다.
 */

import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { fromIni } from '@aws-sdk/credential-providers';
import type { Instance } from '../types';
import { getSSMOnlineInstances } from './ssm';

/**
 * 배열을 지정된 크기의 청크로 분할
 * EC2 API의 InstanceIds 필터는 최대 200개까지만 지원하므로 배치 처리에 사용
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * 특정 리전의 EC2 인스턴스 목록 조회
 * 
 * @param region - AWS 리전 (예: ap-northeast-2)
 * @param profile - AWS 프로필 이름 (선택)
 * @param onlySSMOnline - true: SSM Agent Online 인스턴스만, false: 모든 running 인스턴스
 */
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
  
  // SSM Online 인스턴스만 조회할 경우, 먼저 SSM API로 대상 목록을 가져옴
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

/**
 * 모든 리전에서 병렬로 EC2 인스턴스 조회
 * Promise.all을 사용하여 동시에 조회하므로 빠른 응답 가능
 */
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

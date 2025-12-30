/**
 * SSM(Systems Manager) 연동 모듈
 * 
 * SSM Agent 상태 조회 및 세션 시작 기능 제공
 * session-manager-plugin과 연동하여 실제 터미널 세션 구현
 */

import { 
  SSMClient, 
  DescribeInstanceInformationCommand,
  StartSessionCommand 
} from '@aws-sdk/client-ssm';
import { fromIni } from '@aws-sdk/credential-providers';
import type { Instance } from '../types';

/**
 * SSM Agent가 Online 상태인 인스턴스 ID 목록 조회
 * 페이지네이션을 처리하여 모든 결과를 반환
 */
export async function getSSMOnlineInstances(
  region: string,
  profile?: string
): Promise<string[]> {
  const clientConfig: any = { region };
  if (profile) {
    clientConfig.credentials = fromIni({ profile });
  }
  
  const client = new SSMClient(clientConfig);
  const instanceIds: string[] = [];
  let nextToken: string | undefined;
  
  // 페이지네이션 처리: NextToken이 없을 때까지 반복
  do {
    const response = await client.send(
      new DescribeInstanceInformationCommand({
        Filters: [{ Key: 'PingStatus', Values: ['Online'] }],
        MaxResults: 50,
        NextToken: nextToken
      })
    );
    
    response.InstanceInformationList?.forEach(info => {
      if (info.InstanceId) {
        instanceIds.push(info.InstanceId);
      }
    });
    
    nextToken = response.NextToken;
  } while (nextToken);
  
  return instanceIds;
}

/**
 * SSM 세션 시작
 * 
 * 반환된 정보는 session-manager-plugin에 전달되어 실제 터미널 연결 수행
 * @returns sessionId, streamUrl, tokenValue - plugin 실행에 필요한 정보
 */
export async function startSSMSession(
  instanceId: string,
  region: string,
  profile?: string
): Promise<{ sessionId: string; streamUrl: string; tokenValue: string }> {
  const clientConfig: any = { region };
  if (profile) {
    clientConfig.credentials = fromIni({ profile });
  }
  
  const client = new SSMClient(clientConfig);
  const response = await client.send(
    new StartSessionCommand({ Target: instanceId })
  );
  
  if (!response.SessionId || !response.StreamUrl || !response.TokenValue) {
    throw new Error('Failed to start SSM session: missing response fields');
  }
  
  return {
    sessionId: response.SessionId,
    streamUrl: response.StreamUrl,
    tokenValue: response.TokenValue
  };
}

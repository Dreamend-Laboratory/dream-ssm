import { 
  SSMClient, 
  DescribeInstanceInformationCommand,
  StartSessionCommand 
} from '@aws-sdk/client-ssm';
import { fromIni } from '@aws-sdk/credential-providers';
import type { Instance } from '../types';

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

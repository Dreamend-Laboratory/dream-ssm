import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import type { ValidationResult } from '../types';

export async function validateAWSCredentials(
  region: string,
  profile?: string
): Promise<ValidationResult> {
  try {
    const clientConfig: { region: string; credentials?: ReturnType<typeof fromIni> } = { region };
    
    if (profile) {
      clientConfig.credentials = fromIni({ profile });
    }
    
    const client = new STSClient(clientConfig);
    const response = await client.send(new GetCallerIdentityCommand({}));
    
    if (!response.Account || !response.Arn) {
      throw new Error('Could not get Account ID or ARN from STS');
    }
    
    return {
      valid: true,
      identity: {
        accountId: response.Account,
        arn: response.Arn,
        userId: response.UserId
      }
    };
  } catch (error: any) {
    const errorName = error?.name || '';
    const errorMessage = (error?.message || '').toLowerCase();
    
    if (errorName === 'ExpiredTokenException' || 
        errorMessage.includes('expired') || 
        errorMessage.includes('token has expired')) {
      return {
        valid: false,
        error: { type: 'expired', message: 'AWS 자격증명이 만료되었습니다.' }
      };
    }
    
    if (errorName === 'CredentialsProviderError' ||
        errorMessage.includes('aws sso login') ||
        errorMessage.includes('could not load credentials')) {
      return {
        valid: false,
        error: { type: 'not-found', message: 'AWS 자격증명을 찾을 수 없습니다.' }
      };
    }
    
    if (errorName === 'InvalidClientTokenId' || errorMessage.includes('not authorized')) {
      return {
        valid: false,
        error: { type: 'invalid', message: 'AWS 자격증명이 유효하지 않습니다.' }
      };
    }
    
    return {
      valid: false,
      error: { type: 'unknown', message: error?.message || '알 수 없는 오류' }
    };
  }
}

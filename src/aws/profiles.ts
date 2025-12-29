import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader';
import type { AWSProfile } from '../types';

export async function listAWSProfiles(): Promise<AWSProfile[]> {
  try {
    const { configFile, credentialsFile } = await loadSharedConfigFiles();
    
    const profiles = new Set<string>();
    
    Object.keys(configFile).forEach(profile => profiles.add(profile));
    Object.keys(credentialsFile).forEach(profile => profiles.add(profile));
    
    return Array.from(profiles).sort().map(name => {
      const config = configFile[name] || {};
      return {
        name,
        region: config.region,
        ssoStartUrl: config.sso_start_url,
        ssoAccountId: config.sso_account_id,
        ssoRoleName: config.sso_role_name
      };
    });
  } catch {
    return [];
  }
}

export async function getDefaultRegion(profile?: string): Promise<string> {
  if (process.env.AWS_REGION) return process.env.AWS_REGION;
  if (process.env.AWS_DEFAULT_REGION) return process.env.AWS_DEFAULT_REGION;
  
  if (profile) {
    try {
      const { configFile } = await loadSharedConfigFiles();
      if (configFile[profile]?.region) return configFile[profile].region;
    } catch {}
  }
  
  return 'us-east-1';
}

export function getDefaultProfile(): string | undefined {
  return process.env.AWS_PROFILE || undefined;
}

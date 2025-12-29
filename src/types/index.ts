export interface Instance {
  instanceId: string;
  name: string;
  privateIp: string;
  publicIp?: string;
  instanceType: string;
  state: string;
  region: string;
  platform?: string;
  ssmStatus?: 'Online' | 'Offline' | 'Unknown';
}

export interface AWSProfile {
  name: string;
  region?: string;
  ssoStartUrl?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
}

export interface CallerIdentity {
  accountId: string;
  arn: string;
  userId?: string;
}

export interface ValidationResult {
  valid: boolean;
  identity?: CallerIdentity;
  error?: {
    type: 'expired' | 'not-found' | 'invalid' | 'unknown';
    message: string;
  };
}

export interface AuthContext {
  profile?: string;
  region: string;
  identity?: CallerIdentity;
}

export interface FilterState {
  state: 'running' | 'all';
  ssmStatus: 'online' | 'all';
  region: string;
}

export interface ScpArgs {
  source: string;
  destination: string;
  instanceId?: string;
  user?: string;
  identityFile?: string;
  isUpload: boolean;
}

export interface RegionInfo {
  name: string;
  displayName?: string;
}

import { $ } from 'bun';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { validateAWSCredentials } from '../aws/validator';
import { listAWSProfiles, getDefaultRegion } from '../aws/profiles';
import { selectProfile, selectLoginMethod, showSpinner } from '../ui/prompts';
import type { AuthContext, AWSProfile } from '../types';

export async function ensureAWSLogin(
  region: string,
  profile?: string
): Promise<AuthContext> {
  const spinner = showSpinner();
  spinner.start('Checking AWS credentials...');
  
  const validation = await validateAWSCredentials(region, profile);
  
  if (validation.valid && validation.identity) {
    spinner.stop(pc.green('AWS credentials valid'));
    p.note(
      `${pc.dim('Account:')} ${validation.identity.accountId}\n${pc.dim('ARN:')} ${validation.identity.arn}`,
      'Authenticated'
    );
    return { profile, region, identity: validation.identity };
  }
  
  spinner.stop(pc.yellow('AWS credentials not valid'));
  
  if (validation.error) {
    p.note(pc.yellow(validation.error.message), 'Authentication Issue');
  }
  
  const loginMethod = await selectLoginMethod();
  
  if (!loginMethod) {
    process.exit(0);
  }
  
  let result: AuthContext | null = null;
  
  switch (loginMethod) {
    case 'sso':
      result = await handleSSOLogin(region, profile);
      break;
    case 'profile':
      result = await handleProfileSelection();
      break;
    case 'configure':
      result = await handleConfigureSSO();
      break;
    case 'manual':
      showManualInstructions();
      process.exit(0);
  }
  
  if (!result) {
    process.exit(0);
  }
  
  return result;
}

async function handleSSOLogin(region: string, profile?: string): Promise<AuthContext | null> {
  const spinner = showSpinner();
  
  if (!profile) {
    const profiles = await listAWSProfiles();
    const ssoProfiles = profiles.filter(p => p.ssoStartUrl);
    
    if (ssoProfiles.length === 0) {
      p.note(pc.yellow('No SSO profiles found. Please configure one first.'), 'No SSO Profiles');
      return await handleConfigureSSO();
    }
    
    const selectedProfile = await selectProfile(ssoProfiles);
    if (!selectedProfile) return null;
    profile = selectedProfile;
  }
  
  spinner.start('Opening browser for AWS SSO login...');
  
  try {
    await $`aws sso login --profile ${profile}`.quiet();
    spinner.stop(pc.green('AWS SSO login successful'));
    
    const validation = await validateAWSCredentials(region, profile);
    if (!validation.valid || !validation.identity) {
      throw new Error('Login completed but credentials still invalid');
    }
    
    p.note(
      `${pc.dim('Account:')} ${validation.identity.accountId}\n${pc.dim('ARN:')} ${validation.identity.arn}`,
      'Logged in'
    );
    
    return { profile, region, identity: validation.identity };
  } catch (error) {
    spinner.stop(pc.red('AWS SSO login failed'));
    p.note(pc.yellow(`Please run manually:\n\n${pc.cyan(`aws sso login --profile ${profile}`)}`), 'Login Failed');
    process.exit(1);
  }
}

async function handleProfileSelection(): Promise<AuthContext | null> {
  const profiles = await listAWSProfiles();
  
  if (profiles.length === 0) {
    p.note(pc.yellow('No AWS profiles found in ~/.aws/config or ~/.aws/credentials'), 'No Profiles');
    showManualInstructions();
    process.exit(0);
  }
  
  const profile = await selectProfile(profiles);
  if (!profile) return null;
  
  const profileConfig = profiles.find(p => p.name === profile);
  const region = profileConfig?.region || await getDefaultRegion(profile);
  
  const validation = await validateAWSCredentials(region, profile);
  
  if (validation.valid && validation.identity) {
    p.note(`${pc.dim('Account:')} ${validation.identity.accountId}\n${pc.dim('Region:')} ${region}`, 'Using profile');
    return { profile, region, identity: validation.identity };
  }
  
  if (profileConfig?.ssoStartUrl) {
    p.note(pc.yellow('This is an SSO profile. Attempting SSO login...'), 'SSO Profile');
    return await handleSSOLogin(region, profile);
  }
  
  p.note(pc.red('Selected profile has invalid credentials.'), 'Invalid Profile');
  process.exit(1);
}

async function handleConfigureSSO(): Promise<AuthContext | null> {
  p.note(
    `${pc.cyan('Please run the following command in your terminal:')}\n\n${pc.bold('aws configure sso')}\n\n${pc.dim('This will guide you through setting up AWS SSO.')}`,
    'Configure SSO'
  );
  
  const configured = await p.confirm({ message: 'Have you completed the SSO configuration?' });
  
  if (!configured || p.isCancel(configured)) {
    return null;
  }
  
  return await handleProfileSelection();
}

function showManualInstructions(): void {
  p.note(
    `${pc.bold('Option 1: AWS SSO (Recommended)')}\n` +
    `  ${pc.cyan('aws configure sso')}\n` +
    `  ${pc.cyan('aws sso login --profile <profile-name>')}\n\n` +
    `${pc.bold('Option 2: Access Key')}\n` +
    `  ${pc.cyan('aws configure')}\n\n` +
    `${pc.bold('Option 3: Environment Variables')}\n` +
    `  ${pc.cyan('export AWS_ACCESS_KEY_ID=<your-access-key>')}\n` +
    `  ${pc.cyan('export AWS_SECRET_ACCESS_KEY=<your-secret-key>')}\n` +
    `  ${pc.cyan('export AWS_DEFAULT_REGION=us-east-1')}`,
    'AWS Authentication Options'
  );
}

export async function loginCommand(options: { region?: string; profile?: string }): Promise<void> {
  p.intro(pc.bgCyan(pc.black(' AWS Login ')));
  const region = options.region || await getDefaultRegion(options.profile);
  await ensureAWSLogin(region, options.profile);
  p.outro(pc.green('Authentication successful!'));
}

import { $ } from 'bun';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getAllRegions } from '../aws/regions';
import { listInstancesAllRegions } from '../aws/ec2';
import { startSSMSession } from '../aws/ssm';
import { selectInstance, showSpinner } from '../ui/prompts';
import { getAlias, parseAliasPath } from '../config/aliases';
import type { AuthContext, Instance, ScpArgs } from '../types';

export async function scpCommand(
  auth: AuthContext,
  args: string[]
): Promise<void> {
  const { profile } = auth;
  
  const resolved = await resolveAliasInArgs(args);
  const scpArgs = parseScpArgs(resolved.args);
  
  if (resolved.instance) {
    const finalArgs = scpArgs || {
      source: resolved.args[0] || '',
      destination: resolved.args[1] || '',
      isUpload: true
    };
    await executeSCP(resolved.instance, finalArgs, profile);
    return;
  }
  
  if (scpArgs?.instanceId) {
    const spinner = showSpinner();
    spinner.start('Looking up instance...');
    const regions = await getAllRegions(profile);
    const instances = await listInstancesAllRegions(regions, profile, true);
    const targetInstance = instances.find(i => i.instanceId === scpArgs.instanceId);
    spinner.stop('Done');
    
    if (!targetInstance) {
      p.note(pc.red(`Instance ${scpArgs.instanceId} not found.`), 'Error');
      process.exit(1);
    }
    
    await executeSCP(targetInstance, scpArgs, profile);
    return;
  }
  
  const result = await selectInstanceForScp(profile);
  if (!result) return;
  
  const { instance } = result;
  const finalArgs = await buildScpArgsInteractive(scpArgs, instance);
  if (!finalArgs) return;
  
  await executeSCP(instance, finalArgs, profile);
}

async function resolveAliasInArgs(args: string[]): Promise<{ args: string[]; instance?: Instance }> {
  const source = args[0];
  const dest = args[1];
  
  if (!source || !dest) return { args };
  
  const sourceAlias = parseAliasPath(source);
  const destAlias = parseAliasPath(dest);
  
  if (sourceAlias) {
    const alias = await getAlias(sourceAlias.alias);
    if (alias) {
      const newSource = `${alias.user}@${alias.instanceId}:${sourceAlias.path}`;
      const instance: Instance = {
        instanceId: alias.instanceId,
        name: alias.name || '',
        privateIp: '',
        instanceType: '',
        state: 'running',
        region: alias.region
      };
      return {
        args: [newSource, dest],
        instance
      };
    }
    p.note(pc.yellow(`Alias "${sourceAlias.alias}" not found. Use 'dream-ssm alias list' to see available aliases.`), 'Warning');
  }
  
  if (destAlias) {
    const alias = await getAlias(destAlias.alias);
    if (alias) {
      const newDest = `${alias.user}@${alias.instanceId}:${destAlias.path}`;
      const instance: Instance = {
        instanceId: alias.instanceId,
        name: alias.name || '',
        privateIp: '',
        instanceType: '',
        state: 'running',
        region: alias.region
      };
      return {
        args: [source, newDest],
        instance
      };
    }
    p.note(pc.yellow(`Alias "${destAlias.alias}" not found. Use 'dream-ssm alias list' to see available aliases.`), 'Warning');
  }
  
  return { args };
}

async function selectInstanceForScp(profile?: string): Promise<{ instance: Instance; instances: Instance[] } | null> {
  const spinner = showSpinner();
  spinner.start('Loading instances from all regions...');
  const regions = await getAllRegions(profile);
  const instances = await listInstancesAllRegions(regions, profile, true);
  spinner.stop(`Found ${instances.length} instance(s)`);
  
  if (instances.length === 0) {
    p.note(pc.yellow('No instances with SSM agent online found.'), 'No Instances');
    return null;
  }
  
  const instance = await selectInstance(instances);
  if (!instance) return null;
  
  return { instance, instances };
}

async function buildScpArgsInteractive(
  partialArgs: ScpArgs | null,
  instance: Instance
): Promise<ScpArgs | null> {
  if (partialArgs?.source && partialArgs?.destination) {
    const user = partialArgs.user || 'ec2-user';
    if (partialArgs.isUpload) {
      partialArgs.destination = `${user}@${instance.instanceId}:${partialArgs.destination}`;
    } else {
      partialArgs.source = `${user}@${instance.instanceId}:${partialArgs.source}`;
    }
    return partialArgs;
  }
  
  selectDirection: while (true) {
    const direction = await p.select({
      message: 'Transfer direction',
      options: [
        { value: 'upload', label: 'Upload (local → remote)' },
        { value: 'download', label: 'Download (remote → local)' }
      ]
    });
    
    if (p.isCancel(direction)) return null;
    
    const isUpload = direction === 'upload';
    
    enterUser: while (true) {
      const user = await p.text({
        message: 'SSH user',
        defaultValue: 'ec2-user',
        placeholder: 'ec2-user'
      });
      
      if (p.isCancel(user)) continue selectDirection;
      
      let source: string;
      let destination: string;
      
      if (isUpload) {
        enterLocalPath: while (true) {
          const localPath = await p.text({
            message: 'Local file path',
            placeholder: './file.txt',
            validate: (v) => v.length === 0 ? 'Required' : undefined
          });
          if (p.isCancel(localPath)) continue enterUser;
          
          const remotePath = await p.text({
            message: 'Remote destination path',
            defaultValue: '/tmp/',
            placeholder: '/tmp/'
          });
          if (p.isCancel(remotePath)) continue enterLocalPath;
          
          source = localPath;
          destination = `${user}@${instance.instanceId}:${remotePath}`;
          
          return {
            source,
            destination,
            user: user as string,
            isUpload
          };
        }
      } else {
        enterRemotePath: while (true) {
          const remotePath = await p.text({
            message: 'Remote file path',
            placeholder: '/var/log/app.log',
            validate: (v) => v.length === 0 ? 'Required' : undefined
          });
          if (p.isCancel(remotePath)) continue enterUser;
          
          const localPath = await p.text({
            message: 'Local destination path',
            defaultValue: './',
            placeholder: './'
          });
          if (p.isCancel(localPath)) continue enterRemotePath;
          
          source = `${user}@${instance.instanceId}:${remotePath}`;
          destination = localPath;
          
          return {
            source,
            destination,
            user: user as string,
            isUpload
          };
        }
      }
    }
  }
}

function parseScpArgs(args: string[]): ScpArgs | null {
  const source = args[0];
  const destination = args[1];
  
  if (!source || !destination) return null;
  
  const remotePattern = /^(?:(.+)@)?(i-[a-f0-9]+):(.+)$/;
  
  const sourceMatch = source.match(remotePattern);
  const destMatch = destination.match(remotePattern);
  
  if (sourceMatch) {
    return {
      source,
      destination,
      user: sourceMatch[1] || 'ec2-user',
      instanceId: sourceMatch[2]!,
      isUpload: false
    };
  }
  
  if (destMatch) {
    return {
      source,
      destination,
      user: destMatch[1] || 'ec2-user',
      instanceId: destMatch[2]!,
      isUpload: true
    };
  }
  
  return {
    source,
    destination,
    isUpload: true
  };
}

async function executeSCP(
  instance: Instance,
  scpArgs: ScpArgs,
  profile?: string
): Promise<void> {
  const spinner = showSpinner();
  spinner.start('Starting SCP session...');
  
  try {
    const session = await startSSMSession(instance.instanceId, instance.region, profile);
    spinner.stop(pc.green('Session started'));
    
    const sessionJson = JSON.stringify({
      SessionId: session.sessionId,
      StreamUrl: session.streamUrl,
      TokenValue: session.tokenValue
    });
    
    const paramsJson = JSON.stringify({
      Target: instance.instanceId,
      DocumentName: 'AWS-StartSSHSession',
      Parameters: { portNumber: ['22'] }
    });
    
    const profileArg = profile || 'default';
    const proxyCommand = `session-manager-plugin '${sessionJson}' ${instance.region} StartSession ${profileArg} '${paramsJson}'`;
    
    const scpCmdArgs = [
      '-o', `ProxyCommand=${proxyCommand}`,
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null'
    ];
    
    if (scpArgs.identityFile) {
      scpCmdArgs.push('-i', scpArgs.identityFile);
    }
    
    scpCmdArgs.push(scpArgs.source, scpArgs.destination);
    
    console.log('');
    console.log(pc.dim(`Source: ${scpArgs.source}`));
    console.log(pc.dim(`Destination: ${scpArgs.destination}`));
    console.log('');
    
    const proc = Bun.spawn(['scp', ...scpCmdArgs], {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit'
    });
    
    const exitCode = await proc.exited;
    
    if (exitCode !== 0) {
      console.log('');
      p.note(pc.red(`SCP failed with exit code ${exitCode}`), 'Error');
      process.exit(1);
    }
    
    console.log('');
    console.log(pc.green('Transfer complete!'));
  } catch (error: any) {
    spinner.stop(pc.red('Failed'));
    p.note(pc.red(error.message || 'Unknown error'), 'Error');
    process.exit(1);
  }
}

function showScpUsage(): void {
  p.note(
    `${pc.bold('Interactive mode (recommended):')}\n` +
    `  ${pc.cyan('dream-ssm scp')}\n\n` +
    `${pc.bold('Upload file to instance:')}\n` +
    `  ${pc.cyan('dream-ssm scp localfile.txt ec2-user@i-1234567890:/tmp/')}\n\n` +
    `${pc.bold('Download file from instance:')}\n` +
    `  ${pc.cyan('dream-ssm scp ec2-user@i-1234567890:/remote/file.txt ./local.txt')}\n\n` +
    `${pc.bold('Semi-interactive (select instance):')}\n` +
    `  ${pc.cyan('dream-ssm scp localfile.txt /tmp/')}`,
    'SCP Usage'
  );
}

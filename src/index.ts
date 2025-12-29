#!/usr/bin/env bun

import { program } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { ensureAWSLogin, loginCommand } from './commands/login';
import { listCommand } from './commands/list';
import { connectCommand } from './commands/connect';
import { scpCommand } from './commands/scp';
import { aliasListCommand, aliasAddCommand, aliasRemoveCommand } from './commands/alias';
import { getDefaultRegion, getDefaultProfile } from './aws/profiles';

const VERSION = process.env.DREAM_SSM_VERSION || '1.0.0';

program
  .name('dream-ssm')
  .description('AWS SSM CLI tool for easy EC2 instance access')
  .version(VERSION)
  .option('-r, --region <region>', 'AWS region')
  .option('-p, --profile <profile>', 'AWS profile name');

program
  .command('login')
  .description('Authenticate with AWS')
  .action(async () => {
    const opts = program.opts();
    await loginCommand({ region: opts.region, profile: opts.profile });
  });

program
  .command('list')
  .description('List EC2 instances')
  .action(async () => {
    const opts = program.opts();
    p.intro(pc.bgCyan(pc.black(' dream-ssm ')));
    
    const region = opts.region || await getDefaultRegion(opts.profile);
    const auth = await ensureAWSLogin(region, opts.profile);
    
    await listCommand(auth);
    p.outro(pc.green('Done!'));
  });

program
  .command('connect [instance-id]')
  .description('Connect to EC2 instance')
  .action(async (instanceId) => {
    const opts = program.opts();
    p.intro(pc.bgCyan(pc.black(' dream-ssm ')));
    
    const region = opts.region || await getDefaultRegion(opts.profile);
    const auth = await ensureAWSLogin(region, opts.profile);
    
    await connectCommand(auth, instanceId);
    p.outro(pc.green('Done!'));
  });

program
  .command('scp [source] [destination]')
  .description('Transfer files via SCP (interactive if no args)')
  .option('-i, --identity <file>', 'Identity file (private key)')
  .action(async (source, destination, cmdOpts) => {
    const opts = program.opts();
    p.intro(pc.bgCyan(pc.black(' dream-ssm SCP ')));
    
    const region = opts.region || await getDefaultRegion(opts.profile);
    const auth = await ensureAWSLogin(region, opts.profile);
    
    const args: string[] = [];
    if (cmdOpts.identity) {
      args.push('-i', cmdOpts.identity);
    }
    if (source) args.push(source);
    if (destination) args.push(destination);
    
    await scpCommand(auth, args);
    p.outro(pc.green('Done!'));
  });

const aliasCmd = program
  .command('alias')
  .description('Manage instance aliases');

aliasCmd
  .command('list')
  .description('List all aliases')
  .action(async () => {
    p.intro(pc.bgCyan(pc.black(' dream-ssm aliases ')));
    await aliasListCommand();
    p.outro('');
  });

aliasCmd
  .command('add [name]')
  .description('Add a new alias')
  .action(async (name) => {
    const opts = program.opts();
    p.intro(pc.bgCyan(pc.black(' dream-ssm alias ')));
    
    const region = opts.region || await getDefaultRegion(opts.profile);
    const auth = await ensureAWSLogin(region, opts.profile);
    
    await aliasAddCommand(auth, name);
    p.outro(pc.green('Done!'));
  });

aliasCmd
  .command('remove [name]')
  .description('Remove an alias')
  .action(async (name) => {
    p.intro(pc.bgCyan(pc.black(' dream-ssm alias ')));
    await aliasRemoveCommand(name);
    p.outro('');
  });

async function interactiveMode(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(' dream-ssm ')));
  
  const region = await getDefaultRegion(getDefaultProfile());
  const auth = await ensureAWSLogin(region, getDefaultProfile());
  
  while (true) {
    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'list', label: 'List EC2 instances' },
        { value: 'connect', label: 'Connect to instance' },
        { value: 'scp', label: 'Transfer files (SCP)' },
        { value: 'exit', label: 'Exit' }
      ]
    });
    
    if (p.isCancel(action) || action === 'exit') {
      p.outro(pc.dim('Goodbye!'));
      return;
    }
    
    switch (action) {
      case 'list':
        await listCommand(auth);
        break;
      case 'connect':
        await connectCommand(auth);
        break;
      case 'scp':
        await scpCommand(auth, []);
        break;
    }
    
    console.log('');
  }
}

if (process.argv.length <= 2) {
  interactiveMode().catch(console.error);
} else {
  program.parse();
}

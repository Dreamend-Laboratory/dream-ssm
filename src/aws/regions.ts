import { EC2Client, DescribeRegionsCommand } from '@aws-sdk/client-ec2';
import { fromIni } from '@aws-sdk/credential-providers';

const DEFAULT_REGIONS = [
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ca-central-1',
  'eu-central-1',
  'eu-north-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'sa-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
];

let cachedRegions: string[] | null = null;

export async function getAllRegions(profile?: string): Promise<string[]> {
  if (cachedRegions) return cachedRegions;
  
  try {
    const clientConfig: any = { region: 'us-east-1' };
    if (profile) {
      clientConfig.credentials = fromIni({ profile });
    }
    
    const client = new EC2Client(clientConfig);
    const response = await client.send(new DescribeRegionsCommand({ AllRegions: false }));
    
    cachedRegions = (response.Regions?.map(r => r.RegionName!).filter(Boolean) || []).sort();
  } catch {
    cachedRegions = DEFAULT_REGIONS;
  }
  
  return cachedRegions;
}

export function clearRegionCache(): void {
  cachedRegions = null;
}

const REGION_DISPLAY_NAMES: Record<string, string> = {
  'us-east-1': 'N. Virginia',
  'us-east-2': 'Ohio',
  'us-west-1': 'N. California',
  'us-west-2': 'Oregon',
  'ap-northeast-1': 'Tokyo',
  'ap-northeast-2': 'Seoul',
  'ap-northeast-3': 'Osaka',
  'ap-southeast-1': 'Singapore',
  'ap-southeast-2': 'Sydney',
  'ap-south-1': 'Mumbai',
  'eu-west-1': 'Ireland',
  'eu-west-2': 'London',
  'eu-west-3': 'Paris',
  'eu-central-1': 'Frankfurt',
  'eu-north-1': 'Stockholm',
  'sa-east-1': 'Sao Paulo',
  'ca-central-1': 'Canada',
};

export function getRegionDisplayName(region: string): string {
  const displayName = REGION_DISPLAY_NAMES[region];
  return displayName ? `${region} (${displayName})` : region;
}

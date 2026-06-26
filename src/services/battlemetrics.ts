interface BattleMetricsServer {
  id: string;
  type: string;
  attributes: {
    name: string;
    ip: string;
    port: number;
    players: number;
    maxPlayers: number;
    status: string;
    details?: {
      map?: string;
      mission?: string;
      reforger?: {
        scenarioName?: string;
        mods?: Array<{
          modId: string;
          name: string;
          version: string;
        }>;
      };
      arma3?: {
        mods?: Array<{
          modId: string;
          name: string;
          version?: string;
        }>;
      };
      modIds?: number[];
      modNames?: string[];
    };
  };
}

interface BattleMetricsResponse {
  data: BattleMetricsServer[];
  links: {
    next?: string;
  };
}

export type GameType = 'reforger' | 'arma3';

export class BattleMetricsService {
  private readonly baseUrl = 'https://api.battlemetrics.com/servers';
  private readonly apiKey = process.env.BATTLEMETRICS_API_KEY;

  constructor(private game: GameType = 'reforger') {}

  async fetchAllServers(updateMode = false): Promise<BattleMetricsServer[]> {
    const servers: BattleMetricsServer[] = [];
    let url = `${this.baseUrl}?filter[game]=${this.game}&page[size]=100`;
    let pageCount = 0;
    const maxPages = updateMode ? 3 : 10000; // Update mode: only first 3 pages (300 servers)

    while (url) {
      console.log(`Fetching: ${url}`);

      const headers: Record<string, string> = {
        'User-Agent': 'ReforgerMods/1.0',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`BattleMetrics API error: ${response.status}`);
      }

      const json: BattleMetricsResponse = await response.json();
      
      if (!json || !json.data) {
        console.error('❌ Malformed BattleMetrics response:', json);
        break;
      }

      servers.push(...json.data);

      console.log(`✅ Fetched ${json.data.length} servers, total items: ${servers.length}`);

      url = json.links?.next || '';
      pageCount++;

      // Stop after max pages in update mode
      if (updateMode && pageCount >= maxPages) {
        console.log(`🔄 Update mode: stopping after ${maxPages} pages`);
        break;
      }

      // Rate limiting - with API key: 120 req/min (500ms), without: 60 req/min (1s)
      const delay = this.apiKey ? 500 : 1000;
      await this.sleep(delay);
    }

    return servers;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface BattleMetricsServer {
  id: string;
  type: string;
  attributes: {
    name: string;
    ip: string;
    port: number;
    players: number;
    maxPlayers: number;
    status: 'online' | 'offline' | 'dead' | 'removed' | 'invalid' | string;
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
    const maxPages = updateMode ? 3 : 10000;

    while (url) {
      console.log(`Fetching: ${url}`);

      const headers: Record<string, string> = {
        'User-Agent': 'ReforgerMods/1.0',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Transient errors (5xx, network) — retry ×3 su backoff, be tylaus fallback.
      let response: Response | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetch(url, { headers });
          if (response.ok) break;
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
            console.log(`⏳ Rate limited (429) attempt ${attempt}/3. Waiting ${retryAfter}s...`);
            await this.sleep(retryAfter * 1000);
            continue;
          }
          if (response.status >= 500 && response.status < 600) {
            if (attempt < 3) {
              console.log(`⚠️ Transient ${response.status} attempt ${attempt}/3 — retrying in ${2 * attempt}s...`);
              await this.sleep(2000 * attempt);
              continue;
            }
          }
          break; // 4xx arba paskutinis 5xx — ne-retry
        } catch (err) {
          if (attempt < 3) {
            console.log(`⚠️ Fetch error attempt ${attempt}/3: ${err} — retrying...`);
            await this.sleep(2000 * attempt);
            continue;
          }
          throw err;
        }
      }
      if (!response) throw new Error('No response after retries');

      if (!response.ok) {
        if (response.status === 403) {
          console.error(`❌ BattleMetrics 403 - IP blocked or rate limited. Add BATTLEMETRICS_API_KEY to Worker env.`);
          if (servers.length > 0) {
            console.log(`⚠️ Returning ${servers.length} servers collected before block`);
            break;
          }
        }
        if (response.status === 429) {
          // Po 3 bandymų vis dar 429 — laikom kaip klaidą.
          throw new Error(`HTTP 429: rate limited after retries`);
        }
        throw new Error(`HTTP ${response.status}: error code: 1106`);
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

      if (updateMode && pageCount >= maxPages) {
        console.log(`🔄 Update mode: stopping after ${maxPages} pages`);
        break;
      }

      const delay = this.apiKey ? 500 : 1000;
      await this.sleep(delay);
    }

    return servers;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

import { CloudflareKVClient } from '../scripts/collector';

async function check() {
  const kv = new CloudflareKVClient();
  const game = 'reforger';
  
  // Tikriname visus galimus raktus
  const keys = [
    `cache:trending:daily`,
    `cache:trending:weekly`,
    `cache:trending:monthly`,
    `cache:trending:24h`,
    `cache:trending:7d`,
    `cache:trending:30d`
  ];
  
  console.log('🔍 Tikriname visus TRENDING raktus KV bazėje...\n');

  for (const key of keys) {
    const data = await kv.get(key, 'json');
    if (data) {
        console.log(`✅ RASTAS RAKTAS: ${key}`);
        console.log(`   Atnaujinta: ${data.meta?.lastUpdated || data.meta?.comparisonDate || 'Nėra datos'}`);
        const list = data.data?.rising || data.rising || [];
        console.log(`   Kylančių kiekis: ${list.length}`);
        if (list.length > 0) console.log(`   Pirmas sąraše: ${list[0].name}\n`);
    } else {
        console.log(`❌ Tuščia: ${key}`);
    }
  }
}

check().catch(console.error);

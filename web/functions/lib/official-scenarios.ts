/** Bohemia official Reforger scenarios (-listScenarios / base game). */

export interface OfficialScenario {
  slug: string;
  title: string;
  scenarioId: string;
  /** Substrings matched against BattleMetrics scenarioName (case-insensitive). */
  bmPatterns: string[];
}

export const OFFICIAL_SCENARIO_PREFIX = '#AR-';

export const OFFICIAL_SCENARIOS: OfficialScenario[] = [
  {
    slug: 'conflict-everon',
    title: 'Conflict - Everon',
    scenarioId: '{ECC61978EDCC2B5A}Missions/23_Campaign.conf',
    bmPatterns: ['Campaign_ScenarioName_Everon', '23_Campaign.conf'],
  },
  {
    slug: 'training',
    title: 'Training',
    scenarioId: '{002AF7323E0129AF}Missions/Tutorial.conf',
    bmPatterns: ['Tutorial', 'Training'],
  },
  {
    slug: 'gm-everon',
    title: 'Game Master - Everon',
    scenarioId: '{59AD59368755F41A}Missions/21_GM_Eden.conf',
    bmPatterns: ['21_GM_Eden', 'GM_Eden', 'Game Master - Everon'],
  },
  {
    slug: 'gm-arland',
    title: 'Game Master - Arland',
    scenarioId: '{2BBBE828037C6F4B}Missions/22_GM_Arland.conf',
    bmPatterns: ['22_GM_Arland', 'GM_Arland', 'Game Master - Arland'],
  },
  {
    slug: 'gm-kolguyev',
    title: 'Game Master - Kolguyev',
    scenarioId: '{F45C6C15D31252E6}Missions/27_GM_Cain.conf',
    bmPatterns: ['27_GM_Cain', 'GM_Cain', 'Game Master - Kolguyev'],
  },
  {
    slug: 'conflict-northern-everon',
    title: 'Conflict - Northern Everon',
    scenarioId: '{C700DB41F0C546E1}Missions/23_Campaign_NorthCentral.conf',
    bmPatterns: ['23_Campaign_NorthCentral', 'Northern Everon'],
  },
  {
    slug: 'conflict-southern-everon',
    title: 'Conflict - Southern Everon',
    scenarioId: '{28802845ADA64D52}Missions/23_Campaign_SWCoast.conf',
    bmPatterns: ['23_Campaign_SWCoast', 'Southern Everon'],
  },
  {
    slug: 'conflict-western-everon',
    title: 'Conflict - Western Everon',
    scenarioId: '{94992A3D7CE4FF8A}Missions/23_Campaign_Western.conf',
    bmPatterns: ['23_Campaign_Western', 'Western Everon'],
  },
  {
    slug: 'conflict-montignac',
    title: 'Conflict - Montignac',
    scenarioId: '{FDE33AFE2ED7875B}Missions/23_Campaign_Montignac.conf',
    bmPatterns: ['23_Campaign_Montignac', 'Montignac'],
  },
  {
    slug: 'combat-ops-arland',
    title: 'Combat Ops - Arland',
    scenarioId: '{DAA03C6E6099D50F}Missions/24_CombatOps.conf',
    bmPatterns: ['24_CombatOps', 'Combat Ops - Arland'],
  },
  {
    slug: 'conflict-arland',
    title: 'Conflict - Arland',
    scenarioId: '{C41618FD18E9D714}Missions/23_Campaign_Arland.conf',
    bmPatterns: ['23_Campaign_Arland', 'Campaign_Arland'],
  },
  {
    slug: 'combat-ops-everon',
    title: 'Combat Ops - Everon',
    scenarioId: '{DFAC5FABD11F2390}Missions/26_CombatOpsEveron.conf',
    bmPatterns: ['26_CombatOpsEveron', 'Combat Ops - Everon'],
  },
  {
    slug: 'cah-briars',
    title: 'Capture & Hold - Briars',
    scenarioId: '{3F2E005F43DBD2F8}Missions/CAH_Briars_Coast.conf',
    bmPatterns: ['CAH_Briars', 'Briars'],
  },
  {
    slug: 'cah-castle',
    title: 'Capture & Hold - Montfort Castle',
    scenarioId: '{F1A1BEA67132113E}Missions/CAH_Castle.conf',
    bmPatterns: ['CAH_Castle', 'Montfort Castle'],
  },
  {
    slug: 'cah-concrete-plant',
    title: 'Capture & Hold - Concrete Plant',
    scenarioId: '{589945FB9FA7B97D}Missions/CAH_Concrete_Plant.conf',
    bmPatterns: ['CAH_Concrete_Plant', 'Concrete Plant'],
  },
  {
    slug: 'cah-factory',
    title: 'Capture & Hold - Almara Factory',
    scenarioId: '{9405201CBD22A30C}Missions/CAH_Factory.conf',
    bmPatterns: ['CAH_Factory', 'Almara Factory'],
  },
  {
    slug: 'cah-forest',
    title: 'Capture & Hold - Simon\'s Wood',
    scenarioId: '{1CD06B409C6FAE56}Missions/CAH_Forest.conf',
    bmPatterns: ['CAH_Forest', 'Simon'],
  },
  {
    slug: 'cah-lemoule',
    title: 'Capture & Hold - Le Moule',
    scenarioId: '{7C491B1FCC0FF0E1}Missions/CAH_LeMoule.conf',
    bmPatterns: ['CAH_LeMoule', 'Le Moule'],
  },
  {
    slug: 'cah-military-base',
    title: 'Capture & Hold - Camp Blake',
    scenarioId: '{6EA2E454519E5869}Missions/CAH_Military_Base.conf',
    bmPatterns: ['CAH_Military_Base', 'Camp Blake'],
  },
  {
    slug: 'cah-morton',
    title: 'Capture & Hold - Morton',
    scenarioId: '{2B4183DF23E88249}Missions/CAH_Morton.conf',
    bmPatterns: ['CAH_Morton', 'Morton'],
  },
  {
    slug: 'elimination',
    title: 'Elimination',
    scenarioId: '{C47A1A6245A13B26}Missions/SP01_ReginaV2.conf',
    bmPatterns: ['SP01_Regina', 'Elimination'],
  },
  {
    slug: 'air-support',
    title: 'Air Support',
    scenarioId: '{0648CDB32D6B02B3}Missions/SP02_AirSupport.conf',
    bmPatterns: ['SP02_AirSupport', 'Air Support'],
  },
  {
    slug: 'hqc-everon',
    title: 'Conflict: HQ Commander - Everon',
    scenarioId: '{0220741028718E7F}Missions/23_Campaign_HQC_Everon.conf',
    bmPatterns: ['23_Campaign_HQC_Everon', 'HQ Commander - Everon'],
  },
  {
    slug: 'hqc-arland',
    title: 'Conflict: HQ Commander - Arland',
    scenarioId: '{68D1240A11492545}Missions/23_Campaign_HQC_Arland.conf',
    bmPatterns: ['23_Campaign_HQC_Arland', 'HQ Commander - Arland'],
  },
  {
    slug: 'hqc-kolguyev',
    title: 'Conflict: HQ Commander - Kolguyev',
    scenarioId: '{BB5345C22DD2B655}Missions/23_Campaign_HQC_Cain.conf',
    bmPatterns: ['23_Campaign_HQC_Cain', 'HQ Commander - Kolguyev'],
  },
  {
    slug: 'omega-01',
    title: 'Operation Omega 01: Over The Hills And Far Away',
    scenarioId: '{10B8582BAD9F7040}Missions/Scenario01_Intro.conf',
    bmPatterns: ['Scenario01_Intro', 'Omega 01'],
  },
  {
    slug: 'omega-02',
    title: 'Operation Omega 02: Radio Check',
    scenarioId: '{1D76AF6DC4DF0577}Missions/Scenario02_Steal.conf',
    bmPatterns: ['Scenario02_Steal', 'Omega 02'],
  },
  {
    slug: 'omega-03',
    title: 'Operation Omega 03: Light In The Dark',
    scenarioId: '{D1647575BCEA5A05}Missions/Scenario03_Villa.conf',
    bmPatterns: ['Scenario03_Villa', 'Omega 03'],
  },
  {
    slug: 'omega-04',
    title: 'Operation Omega 04: Red Silence',
    scenarioId: '{6D224A109B973DD8}Missions/Scenario04_Sabotage.conf',
    bmPatterns: ['Scenario04_Sabotage', 'Omega 04'],
  },
  {
    slug: 'omega-05',
    title: 'Operation Omega 05: Cliffhanger',
    scenarioId: '{FA2AB0181129CB16}Missions/Scenario05_Hill.conf',
    bmPatterns: ['Scenario05_Hill', 'Omega 05'],
  },
  {
    slug: 'combat-ops-kolguyev',
    title: 'Combat Ops - Kolguyev',
    scenarioId: '{CB347F2F10065C9C}Missions/CombatOpsCain.conf',
    bmPatterns: ['CombatOpsCain', 'Combat Ops - Kolguyev'],
  },
];

export function isOfficialScenarioName(scenarioName: string): boolean {
  return scenarioName.startsWith(OFFICIAL_SCENARIO_PREFIX);
}

export function matchOfficialScenario(scenarioName: string): OfficialScenario | null {
  const lower = scenarioName.toLowerCase();
  for (const official of OFFICIAL_SCENARIOS) {
    for (const pattern of official.bmPatterns) {
      if (lower.includes(pattern.toLowerCase())) return official;
    }
  }
  return null;
}

export function getOfficialScenarioBySlug(slug: string): OfficialScenario | null {
  return OFFICIAL_SCENARIOS.find((s) => s.slug === slug) ?? null;
}

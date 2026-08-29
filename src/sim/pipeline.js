// Tick boru hattı — sıra SABİT (ARCHITECTURE.md §5). Sistemler birbirini çağırmaz.

import { aiMobSystem } from './systems/aiMobSystem.js';
import { aiBotSystem } from './systems/aiBotSystem.js';
import { movementSystem } from './systems/movementSystem.js';
import { physicsSystem } from './systems/physicsSystem.js';
import { projectileSystem } from './systems/projectileSystem.js';
import { combatSystem } from './systems/combatSystem.js';
import { gatherSystem } from './systems/gatherSystem.js';
import { progressionSystem } from './systems/progressionSystem.js';
import { zoneSystem } from './systems/zoneSystem.js';
import { cleanupSystem } from './systems/cleanupSystem.js';

const systems = [
  aiMobSystem, // 1. moblar karar verir (Intent üretir)
  aiBotSystem, // 2. botlar karar verir (Intent üretir — §4 "sanal parmak")
  movementSystem, // 3. intent → hız → pozisyon
  physicsSystem, // 4. çarpışma çözümü
  projectileSystem, // 5. mermiler + hasar alanları
  combatSystem, // 6. saldırılar, hasar, ölüm işaretleme
  gatherSystem, // 7. kanal+kilit: toplama, yoğunlaşma, pot, kese
  progressionSystem, // 8. XP → seviye → kart teklifi/uygulaması
  zoneSystem, // 9. evre saati, cendere, GZ bütçesi, T2 dalgası
  cleanupSystem, // 10. ölüleri kaldır, kese düşür, son-kalan kontrolü
];

export function step(world) {
  world.tick++;
  for (const system of systems) system(world);
}

# CENDERE — Yazılım Mimarisi

> Amaç: spagetti kod sıfır. Her özelliğin tek bir evi var; katmanlar arası iletişim
> kurallarla sınırlı. Bu doküman "ne nerede yaşar, kim kiminle konuşur" sorusunun
> tek otoritesidir. PLAN.md *ne* yapılacağını, bu doküman *nasıl* yapılacağını anlatır.

---

## 0. Beş Temel İlke

1. **Sim ≠ Render.** Oyun mantığı (`sim/`) Canvas'ı, DOM'u, asset'leri, sesi TANIMAZ.
   Sadece durum (state) üretir. Render katmanı bu durumu okur ve çizer; asla değiştirmez.
   → Faz 2'de `sim/` olduğu gibi Node.js sunucusuna taşınır; client sadece çizer.
2. **Determinizm.** `sim/` içinde `Math.random()` ve `Date.now()` YASAK. Zaman = tick sayacı,
   rastgelelik = seed'li RNG (`core/rng.js`). Aynı seed + aynı girdiler = aynı maç.
   → Replay, bug tekrarı ve sunucu-client tutarlılığı bedavaya gelir.
3. **Veri koddan ayrı.** Tüm denge sayıları (mob HP, kart etkileri, evre süreleri, GZ bütçesi)
   `data/` altında düz obje olarak durur. Denge değişikliği = veri dosyası değişikliği.
4. **Yukarı doğru sadece event.** Alt katman üst katmanı import EDEMEZ. Alt katman olan biteni
   event olarak duyurur (`EntityDied`, `LevelUp`); üstteki kim ilgileniyorsa dinler.
5. **Tek yön veri akışı.** Girdi → Intent → Sim → State + Event → Render/UI/Ses.
   UI hiçbir zaman state'i doğrudan değiştirmez; intent üretir.

## 1. Katman Diyagramı

```
┌────────────────────────────────────────────────────────┐
│  app/  (composition root: oyun döngüsü, kablolama)     │
├──────────────┬─────────────────────────┬───────────────┤
│  ui/         │  render/                │  audio/ (v2)  │  ← state OKUR, event DİNLER
│  HUD,kartlar │  kamera,sprite,partikül │               │
├──────────────┴─────────────────────────┴───────────────┤
│  input/   dokunma/klavye → Intent                      │  ← sim'e girdi ÜRETİR
├────────────────────────────────────────────────────────┤
│  sim/     OYUNUN BEYNİ (deterministik, render bilmez)  │  ← Faz 2'de sunucuya taşınır
│  entities · systems (fizik,savaş,xp,bölge,AI,spawn)    │
├────────────────────────────────────────────────────────┤
│  data/    sınıflar, kartlar, moblar, evreler, denge    │  ← saf veri, sıfır mantık
├────────────────────────────────────────────────────────┤
│  core/    Vec2, çarpışma primitifleri, RNG, EventBus,  │  ← hiçbir şeyi import etmez
│           FSM, object pool, spatial hash               │
└────────────────────────────────────────────────────────┘
```

**Import kuralı (lint ile zorlanır):** bir katman yalnızca kendinden AŞAĞIDAKİ katmanları
import edebilir. `sim/` → `core/`+`data/` ✓ · `render/` → `sim/`(okuma)+`core/` ✓ ·
`sim/` → `render/` ✗ · `data/` → herhangi bir şey ✗ · `core/` → herhangi bir şey ✗

## 2. Klasör Yapısı

```
cendere/
├── PLAN.md, ARCHITECTURE.md
├── index.html                  ← tek giriş: <canvas> + UI kök div
├── package.json                ← Vite (dev server + build), Vitest, ESLint+Prettier
├── assets/
│   ├── atlas/                  ← sprite sheet PNG'leri + kare tanım JSON'ları
│   └── maps/                   ← harita: tile katmanları + spawn/bölge işaretleri (JSON)
├── src/
│   ├── app/
│   │   ├── main.js             ← bootstrap: katmanları kurar, kablolar
│   │   ├── gameLoop.js         ← fixed timestep (60 tps sim) + rAF render, interpolasyon
│   │   └── match.js            ← maç yaşam döngüsü: lobi → oyun → sonuç; sim'i kurar/yıkar
│   ├── core/                   ← oyundan bağımsız araç kutusu (başka projede de çalışır)
│   │   ├── vec2.js             ← vektör matematiği
│   │   ├── collision.js        ← daire-daire, daire-AABB, raycast (görüş hattı)
│   │   ├── spatialHash.js      ← geniş faz çarpışma ızgarası ("yakınımda kim var?")
│   │   ├── rng.js              ← seed'li rastgelelik (mulberry32)
│   │   ├── eventBus.js         ← emit/on/off; sim→üst katman tek iletişim yolu
│   │   ├── fsm.js              ← durum makinesi yardımcıları (AI ve maç evreleri kullanır)
│   │   └── pool.js             ← object pool (mermi/partikül GC baskısını önler)
│   ├── data/                   ← SAF VERİ. Fonksiyon yok, import yok (sabitler hariç)
│   │   ├── classes.js          ← 3 sınıf: statlar, oto-saldırı, beceri, toplama uzmanlığı
│   │   ├── cards.js            ← kart havuzu: id, nadirlik, tip, etki tanımı (bildirimsel)
│   │   ├── mobs.js             ← T0-T4 mob tanımları: stat, davranış parametreleri, drop
│   │   ├── phases.js           ← evre zaman çizelgesi, cendere yarıçap/hasar eğrisi
│   │   ├── zones.js            ← GZ bütçesi, geri dolum oranları, Sürgün kuralları
│   │   └── balance.js          ← XP eğrisi, hasar formülü katsayıları, pot/yoğunlaşma
│   ├── sim/                    ← ★ OYUNUN TAMAMI BURADA. Canvas/DOM/asset bilmez
│   │   ├── world.js            ← tek maçın tüm durumu: entity listesi, tick, evre, rng
│   │   ├── entity.js           ← entity fabrikaları (bileşen kompozisyonu, §4)
│   │   ├── commands.js         ← Intent tanımları: Move, UseSkill, Gather, DrinkPot, PickCard
│   │   └── systems/            ← her sistem: update(world, dt) — sırası §5'te
│   │       ├── movementSystem.js      ← intent → hız; hız → pozisyon
│   │       ├── physicsSystem.js       ← çarpışma çözümü, itme, engel kayması
│   │       ├── projectileSystem.js    ← mermi uçuşu, raycast, isabet tespiti
│   │       ├── combatSystem.js        ← oto-saldırı hedefleme, hasar formülü, ölüm
│   │       ├── zoneSystem.js          ← cendere daralması+hasarı, GZ bütçesi, Sürgün
│   │       ├── progressionSystem.js   ← XP, seviye, full-can, kart teklifi/uygulama
│   │       ├── gatherSystem.js        ← kanal+kilit: kaynak, Ganimet Kesesi, yoğunlaşma
│   │       ├── healthSystem.js        ← pot içme, can dolumu, Ani Ölüm yarılaması
│   │       ├── spawnSystem.js         ← mob/kaynak doğumu, evreye bağlı T3/T4 dalgaları
│   │       ├── aiMobSystem.js         ← mob FSM: boşta→devriye→kovala→saldır→kaç
│   │       └── aiBotSystem.js         ← bot utility-AI: hedef puanla → Intent ÜRET
│   ├── input/
│   │   ├── touchInput.js       ← sanal joystick + butonlar → Intent
│   │   └── keyboardInput.js    ← WASD+tuşlar → Intent (masaüstü test için)
│   ├── render/                 ← sim state'ini OKUR, asla yazmaz
│   │   ├── renderer.js         ← çizim orkestrasyonu, katman sırası, viewport culling
│   │   ├── camera.js           ← takip, sınır, sarsıntı
│   │   ├── tileRenderer.js     ← harita zemin katmanları (offscreen canvas'a önceden basılır)
│   │   ├── spriteAtlas.js      ← atlas PNG+JSON yükleme, kare kesme
│   │   ├── animator.js         ← entity durumu → animasyon karesi (asset değişse kod değişmez)
│   │   ├── effects.js          ← partiküller: hasar sayısı, seviye ışık sütunu, kızıl sis
│   │   └── zoneOverlay.js      ← cendere çemberi, GZ altın sınırı çizimi
│   └── ui/                     ← DOM tabanlı (canvas değil): HUD ve ekranlar
│       ├── hud.js              ← can/XP barı, GZ bütçesi, pot sayısı, minimap, çarpan rozeti
│       ├── joystick.js         ← sanal joystick görseli (input/touchInput ile eş çalışır)
│       ├── cardIndicator.js    ← yanıp sönen bekleyen-kart göstergesi (LevelUp event'i dinler)
│       ├── cardScreen.js       ← 3 kart seçim ekranı → PickCard intent'i üretir
│       └── screens.js          ← lobi/sınıf seçimi, ölüm, zafer ekranları
└── tests/                      ← Vitest — SADECE sim/ ve core/ test edilir (saf oldukları için)
    ├── combat.test.js, cards.test.js, zones.test.js, collision.test.js ...
```

## 3. Oyun Döngüsü (app/gameLoop.js)

- **Sim: sabit 60 tps.** `accumulator` deseni — kare süresi ne olursa olsun sim hep 16.66ms
  adımlarla ilerler. Telefon kasarsa görüntü yavaşlar ama OYUN MANTIĞI aynı kalır.
- **Render: rAF, serbest fps.** İki sim tick'i arasında `alpha` ile pozisyon interpolasyonu →
  60 tps simde bile tereyağı görüntü. (Bu yüzden entity'lerde `pos` + `prevPos` tutulur.)
- Tarayıcı sekmesi arka plana düşünce sim duraklar (v1 offline olduğu için sorun değil;
  Faz 2'de sunucu saati otorite olur).

## 4. Entity Modeli: Bileşen-Hafif ECS

Ağır bir ECS framework'ü YOK. Entity = düz JS objesi; bileşenler = üzerindeki alan grupları.
Sistemler "şu bileşenleri taşıyanlar" üzerinde döner. Basit, hızlı, debug'ı kolay.

```js
// entity.js — fabrika örneği
createPlayer(world, classId) => ({
  id, kind: 'player',
  transform: { pos, prevPos, dir },          // herkes
  motion:    { vel, speed },                  // hareket edenler
  body:      { radius, solid: true },        // fiziğe girenler
  health:    { hp, maxHp, regenBlockedUntil },
  combat:    { autoAttack, skill, cooldowns, lastAttacker },
  progress:  { level, xp, pendingCards, build: [] },   // sadece player/bot
  zone:      { gzBudget, exiled: false, inGZ: false },
  gather:    { channel: null, materials, pots },
  input:     { moveDir, wantSkill, wantGather },  // player: input/'tan, bot: aiBotSystem'den
  ai:        { personality, target, fsm },        // sadece bot/mob
  render:    { spriteId, animState, flipX },      // sim YAZAR ama YORUMLAMAZ (string etiket)
})
```

**Kritik incelik:** Botlar da `input` bileşeni taşır. `aiBotSystem` klavye yerine geçen bir
"sanal parmak"tır — bot ile oyuncu, sim'in gözünde AYNI şeydir. Bu, botların oyuncuyla birebir
aynı kurallara tabi olmasını mimari olarak garanti eder (hile yapamazlar) ve Faz 2'de sunucu
tarafında hiçbir değişiklik gerektirmez.

## 5. Tick Boru Hattı (sıra SABİTTİR, sistemler birbirini çağırmaz)

```
1. aiMobSystem      → moblar karar verir (input benzeri niyet üretir)
2. aiBotSystem      → botlar karar verir (Intent üretir)
3. movementSystem   → tüm intent'ler hıza, hızlar pozisyona
4. physicsSystem    → çarpışma çöz (spatial hash → daire/AABB), iç içe geçmeyi düzelt
5. projectileSystem → mermileri uçur, raycast ile isabet
6. combatSystem     → oto-saldırı hedef seç+vur, beceriler, hasarı uygula, ölümleri işle
7. gatherSystem     → kanalları ilerlet/boz, kilitleri yönet, kese/yoğunlaşma
8. healthSystem     → pot dolumu, yenilenmeler, Ani Ölüm yarılaması
9. progressionSystem→ XP dağıt, seviye atlat (full can + LevelUp event), kart uygula
10. zoneSystem      → cendere yarıçapını ilerlet, dışarıdakilere hasar, GZ bütçelerini işle
11. spawnSystem     → evreye göre mob/kaynak doğur (T4 dalgaları dahil)
12. matchSystem     → bitiş kontrolü: tek canlı kaldı mı / 20:00 doldu mu
```

Sistemler arası iletişim YOK — hepsi `world` üzerinden okur/yazar ve event yayınlar.
"CombatSystem, gatherSystem'i çağırsın" gibi bir şey asla olmaz; hasar yendiği bilgisini
gatherSystem bir sonraki adımda `world`'den/event'ten okur (kanal bozulur).

## 6. Event Kataloğu (sim → üst katmanlar; başlangıç seti)

| Event | Kim yayınlar | Kim dinler |
|---|---|---|
| `damage.dealt {target, amount, crit}` | combat | render (hasar sayısı, flash) |
| `entity.died {entity, killer}` | combat | render (ölüm efekti), ui, spawn (kese düşür) |
| `player.levelup {player}` | progression | render (ışık sütunu — HERKESE görünür), ui (kart göstergesi), audio |
| `cards.offered {player, cards}` | progression | ui/cardIndicator (yanıp sönme) |
| `gather.locked / .done / .broken` | gather | render (kanal barı), ui |
| `zone.phaseChanged {phase}` | zone | ui (duyuru bandı), render (sis yoğunluğu), spawn |
| `zone.exiled {player}` | zone | ui (Sürgün ikonu), render |
| `match.ended {winner}` | match | app (sonuç ekranına geçiş) |

Kural: event isimleri `alan.olay` biçiminde; payload düz veri (entity referansı + sayılar).
UI/render event'e tepki verir ama event'ten state türetmez — state'in kaynağı hep `world`.

## 7. Özellik → Katman Haritası ("bu özellik nereye yazılır?")

| Özellik (PLAN.md) | Evi | Verisi | Görseli |
|---|---|---|---|
| Hareket + çarpışma ("fizik") | movement+physicsSystem | balance.js | — |
| Oto-saldırı + hedefleme | combatSystem | classes.js | animator, effects |
| Aktif beceri (tek buton) | combatSystem | classes.js | ui/hud (buton), effects |
| Cendere daralması + hasarı | zoneSystem | phases.js | zoneOverlay, effects (sis) |
| GZ + kişisel bütçe + Sürgün | zoneSystem | zones.js | zoneOverlay, hud |
| XP / seviye / full-can | progressionSystem | balance.js | effects (ışık sütunu) |
| Kart teklifi + seçim + etkiler | progressionSystem | cards.js | cardIndicator, cardScreen |
| Kaynak kanal+kilit | gatherSystem | balance.js | render (kanal barı) |
| Ganimet Kesesi + Yankı Kartı | gather+progression | cards.js | effects, hud |
| Pot + yoğunlaşma | health+gatherSystem | balance.js | hud (pot sayacı) |
| Mob davranışları (T0-T4) | aiMobSystem (core/fsm) | mobs.js | animator |
| Bot zekâsı + kişilikler | aiBotSystem | balance.js | — (görünmez olmalı!) |
| Evre zamanlaması + Ani Ölüm | zone+matchSystem | phases.js | ui (duyuru) |
| Sanal joystick | input/touchInput | — | ui/joystick |
| Minimap | — (sadece okur) | — | ui/hud |

**Kart etkileri bildirimseldir:** `cards.js` içinde `{ stat: 'attackSpeed', mul: 1.15 }` veya
`{ modifier: 'arrow_split', count: 3 }` gibi tanımlar durur; `progressionSystem` bunları
uygular, `combatSystem` modifier'ları tanır. Yeni kart eklemek çoğunlukla SADECE veri eklemektir.

## 8. "Fizik" Katmanının Sınırları

Bu oyunda fizik = 3 parça, hepsi `core/collision.js` + `physicsSystem`:
- **Geniş faz:** spatial hash (hücre ≈ en büyük çap) — "300 entity'den yakınımdaki 5'i" O(1).
- **Dar faz:** daire-daire (karakterler), daire-AABB (duvar/kaya). Çözüm: en kısa itme vektörü.
- **Raycast:** mermi isabeti + görüş hattı (engel arkasına ok işlemez) + AI "hedefi görüyor muyum".
Yerçekimi, tork, sürtünme, fizik motoru YOK ve eklenmeyecek — ihtiyaç doğarsa bile önce tasarım
sorgulanır (top-down RPG'de gerçek fizik neredeyse her zaman yanlış cevaptır).

## 8b. Entity Yaşam Döngüsü ve Animasyon Sözleşmesi

**Geçilemeyen objeler:** zemin tile'ları saf görseldir, çarpışmaya girmez. Katılık bir
bileşendir: `body: {shape, solid: true}` taşıyan ve `motion` taşımayan entity = duvar/kaya/ağaç.
Harita JSON'unda tanımlanır, physicsSystem + spatialHash çözer, raycast'e de takılır (ok ve
görüş hattı otomatik engellenir). Görsel ile gövde ayrıdır: ağacın çarpışan kısmı sadece
gövde dairesidir; tepesi y-sıralamayla karakterin önüne/arkasına çizilir ama geçişi engellemez.

**Yok olan objeler — tek kural: sim anında öldürür, render güzelce uğurlar.**
- Sim: `dead` işaretle → tick sonunda listeden + spatial hash'ten sil (çarpışma, kilit,
  hedeflenebilirlik O AN biter; sim asla animasyon beklemez) → event yayınla
  (`entity.died`, `resource.depleted`).
- Render: event'i duyunca `effects.js`'te TEK SEFERLİK görsel başlatır — mob ölüm animasyonu,
  ağaç devrilmesi + kütük dekoru, kese parlaması. Bunlar oyun objesi değildir; sim bilmez.
- Yeniden doğum spawnSystem zamanlayıcılarındadır (Son Cendere'de kaynak doğmaz).

**Savaş animasyonu senkronu — sim zamanlamayı bilir, animator görüntüyü bilir:**
- combatSystem saldırıda `animState: 'attack'` yazar; hasarın ineceği tick `data/`daki
  süreden gelir (örn. `windup: 0.5`). "Animasyonun N. karesinde hasar" gibi kare-bağımlı
  kırılgan bağ YASAK — hasar veri süresinde iner, animasyon o süreye uydurulur.
- animator.js her karede `kind + animState + yön + hız`dan atlas karesini seçer
  (idle/walk/attack/hurt/die). Asset değişimi = PNG+JSON değişimi; sim'e dokunulmaz.
- Vuruş hissi (hasar sayısı, flash, sarsıntı) event dinleyen render süsüdür; sim'deki tek
  karşılığı sayıların değişmesidir.

## 9. Render Sözleşmesi

- Çizim sırası: zemin tile'ları (önceden offscreen canvas'a basılmış) → gölgeler →
  entity'ler (**y-koordinatına göre sıralı** — alttaki üsttekini örter, derinlik yanılsaması) →
  mermiler → efektler → bölge overlay'leri. UI ise DOM'da, canvas'ın üstünde ayrı katman.
- `render.spriteId/animState` sim'in bıraktığı string etikettir; hangi PNG'nin hangi karesi
  olduğunu SADECE `animator.js` + atlas JSON bilir. **Asset değiştirmek = PNG+JSON değiştirmek.**
- Viewport dışı entity çizilmez (culling). Partiküller pool'dan gelir. Hedef: orta segment
  Android'de 60 fps; profilleme Chrome DevTools ile gerçek cihazda yapılır.

## 10. Araçlar ve Kalite Çizgisi

- **Vite** — dev server (telefondan `http://<mac-ip>:5173` ile anında test), tek komut build,
  ileride PWA + Capacitor için hazır çıkış. Framework YOK, vanilla ES modülleri.
- **Vitest** — `sim/` ve `core/` saf olduğu için gerçek birim testi yazılabilir: hasar formülü,
  kart istifleme, GZ bütçe akışı, çarpışma çözümü, "seviye atlayınca can fullenir" gibi kurallar.
  UI/render test edilmez (elle + gözle).
- **ESLint + Prettier** — katman import kuralları lint ile zorlanır
  (`no-restricted-imports`: sim → render/ui/input yasak vb.). Format tartışması sıfır.
- **JSDoc + `// @ts-check`** — TypeScript derleyicisi olmadan tip güvenliği: editör hataları
  anında gösterir, build adımı eklenmez.
- Dosya büyürse böl: bir sistem ~300 satırı geçiyorsa muhtemelen iki sorumluluk taşıyordur.

## 11. Faz 2 (Online) Hazırlığı — bugünden alınan sigortalar

- `sim/` render bilmediği için sunucuya kopyalanır; client'ta `render+ui+input` kalır.
- Intent mimarisi = ağ paketi mimarisi: bugün `input → sim` olan akış, yarın
  `input → ağ → sunucu sim` olur. Komut tipleri (`commands.js`) zaten serileşebilir düz veridir.
- Deterministik RNG + tick sayacı = sunucu uzlaşması ve replay.
- Botların Intent üretmesi = sunucuda değişiklik gerektirmeden koltuk doldurma.

## 12. Anti-Spagetti Anayasası (özet)

1. Katman importu sadece aşağı doğru; yukarı sadece event.
2. `sim/` içinde Canvas/DOM/`Math.random()`/`Date.now()` görülürse PR reddedilir. :)
3. Sistemler birbirini çağırmaz; `world` + event üzerinden konuşur. Sıra §5'te sabittir.
4. Denge sayısı kodda "magic number" olarak duramaz — evi `data/`.
5. UI state değiştirmez, Intent üretir. Render state değiştirmez, okur.
6. Yeni özellik eklerken ilk soru: "§7 tablosunda evi neresi?" Tabloda yoksa önce tabloya eklenir.
```

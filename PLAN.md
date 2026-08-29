# CENDERE — Oyun Tasarım ve Geliştirme Planı

> Cendere: Haritayı yavaşça sıkıştıran mengene. Son kalan kazanır.

**Tür:** MMO-RPG × Battle Royale (tur bazlı, oda tabanlı)
**Tur süresi:** 15–20 dakika, son hayatta kalan kazanır
**Platform:** Mobil öncelikli (tarayıcı → ileride Capacitor ile mağaza uygulaması)
**Görsel:** 2D Top-down (kuş bakışı), kaliteli sprite + animasyon — *placeholder şekil yok, ilk günden göze hitap eden asset*
**Teknoloji:** JavaScript + HTML5 Canvas · Faz 2'de Node.js + Colyseus (multiplayer) · Capacitor (paketleme)

---

## 1. Oyun Vizyonu

Küçük bir haritada 15-20 oyuncu (v1'de botlar). Herkes 1. seviyeden başlar; mob keserek,
dummy dövererek, ağaç/maden toplayarak gelişir. Harita ikiye bölünmüştür: **Güvenli Bölge (GZ)**
ve **Vahşi Bölge**. GZ'de kimse kimseye saldıramaz ama gelişim yavaştır ve GZ'de kalma hakkı
sınırlıdır. Vahşi Bölge'de XP ve drop katbekat fazladır ama moblar serttir ve PvP açıktır.
Zaman ilerledikçe cendere sıkışır: harita daralır, GZ erir, güçlü moblar belirir ve sonunda
kimseye saklanacak yer kalmaz.

**Temel gerilim:** "Güvende yavaş mı gelişeyim, riskli hızlı mı?" — her oyuncu her dakika bu
kararı yeniden verir.

---

## 2. Maç Akışı (Zaman Çizelgesi)

| Zaman | Evre | Ne olur |
|---|---|---|
| 0:00 | **Lobi** | Sınıf seçimi, kısa geri sayım, haritaya dağınık spawn |
| 0:00–3:00 | **Hazırlık** | Tüm harita açık. Kolay moblar, bol kaynak. GZ tam boyut. PvP teknik olarak açık ama kimse güçlü değil |
| 3:00–8:00 | **Genişleme** | Dış halka kapanmaya başlar (cendere hasarı: düşük). Orta seviye moblar. Vahşi Bölge drop çarpanı devrede |
| 8:00–13:00 | **Sıkışma** | Cendere hızlanır (hasar: orta). GZ küçülmeye başlar, kişisel GZ süreleri erimeye devam eder. **Elit moblar** Vahşi Bölge'de belirir |
| 13:00–17:00 | **Son Cendere** | GZ tamamen kapanır — artık kimse güvende değil. Harita minik bir arenaya iner. Elit mob + oyuncu karambolü |
| 17:00–20:00 | **Ani Ölüm** | Maç 17. dakikada bitmediyse: cendere hasarı her 15 saniyede katlanır, tüm iyileştirme yarıya düşer. 20:00'de en yüksek canlı kazanır |

Cendere sınırı klasik BR gibi **dairesel daralan bir sınırdır**; dışında kalan sürekli hasar yer.
Hasar evre ilerledikçe artar, kaçış hep mümkün ama hep maliyetlidir.

---

## 3. Harita

- **Boyut:** ~2000×2000 birim (ekranın ~8×8 katı). Küçük ve yoğun — karşılaşma sıklığı yüksek.
- **Yerleşim:** Harita kabaca ikiye bölünür:
  - **GZ (≈%40):** Merkezi kasaba görünümü. İçinde: antrenman dummy'leri, düşük verimli kaynak
    noktaları (zayıf maden, ince ağaç), birkaç pasif mob.
  - **Vahşi Bölge (≈%60):** Ormanlar, maden mağarası ağzı, bataklık, harabe gibi 4-5 karakterli
    alt bölge. Her alt bölgenin kendine has mob kampı ve kaynak profili var (orman → odun+bitki,
    mağara çevresi → maden, harabe → sandık/tüketilebilir).
- **Engeller:** Kayalar, ağaçlar, duvar kalıntıları — hem çarpışma hem görüş hattı engeli
  (menzilli saldırılar engelin arkasına işlemez → pozisyon oynamak anlamlı).
- **Harita üretimi:** El yapımı tek harita (v1). Tur çeşitliliğini kaynak/mob spawn noktalarının
  rastgele seçimi sağlar. Prosedürel harita v1 kapsamı DIŞI.

## 4. GZ (Güvenli Bölge) Mekaniği

- GZ **coğrafi bir bölgedir** (kasaba); sınırı haritada net çizgiyle görünür.
- GZ içinde **PvP tamamen kapalı**: saldırı tuşları oyunculara işlemez, beceriler oyunculara hasar
  vermez. Moblara ve dummy'lere vurulabilir.
- **Kişisel GZ süresi (GZ bütçesi):** Her oyuncu maça **120 saniyelik** GZ hakkıyla başlar.
  GZ içindeyken bu süre akar; biterse oyuncu "Sürgün" olur → GZ ona artık koruma vermez
  (içeride bile saldırılabilir ve saldırabilir; HUD'da sürgün ikonu görünür).
  **Ceza mekaniktir, davranışa bırakılmaz:** Sürgün olan oyuncuyu GZ fiziksel olarak
  dışarı İTER (itiş yürüme hızından güçlü — direnilemez) ve içeride geçen her saniye
  yakar (3 can/sn). Kill feed'de katil "GZ" yazar.
  - Süre GZ dışındayken **yavaşça geri dolar** (örn. dışarıda geçen her 3 sn → 1 sn GZ hakkı,
    üst sınıra kadar). Böylece GZ "kamp yeri" değil "nefes alanı" olur.
- GZ'de gelişim kasıtlı olarak verimsizdir: dummy XP'si mob XP'sinin ~⅓'ü, kaynaklar düşük verimli.
- **Sıkışma evresinde** GZ alanı kademeli küçülür; **Son Cendere** evresinde tamamen kalkar.

## 5. Karakter Sınıfları (v1: 3 sınıf)

Her sınıfın **otomatik temel saldırısı** (nişan/tuş gerektirmez, menzildeki en yakın hedefe
kendiliğinden işler — Brotato usulü) + **tek aktif becerisi** (tek buton) + 1 toplama uzmanlığı
vardır. Gelişim yönünü kartlar belirler (bkz. §6). Beceri sayısı sabittir; derinlik buton
eklemekten değil, kartların otomatik saldırıyı ve tek beceriyi dönüştürmesinden gelir.
Tek istisna: bir **Destansı kart ikinci bir aktif beceri slotu** açabilir (tercihli karmaşıklık).

| | **Cengâver** (yakın dövüş) | **Nişancı** (menzilli) | **Ocakçı** (büyü/destek) |
|---|---|---|---|
| Otomatik saldırı | Kılıç savuruşu (yay şeklinde alan) | Ok (düz mermi, engel arkasına işlemez) | Büyü topu (yavaş ama izlekli hasar) |
| Aktif beceri (tek buton) | Atılma (kısa dash + hasar) | Geri sıçrama + hızlı atış | Alan yakması (yerde kalan hasar alanı) |
| Toplama uzmanlığı | **Madencilik** ×2 hız | **Kereste** ×2 hız | **Bitki/tüketilebilir** ×2 verim |
| Zayıflık | Menzilsiz, kite edilir | Kırılgan, yakında ezilir | Yavaş, mermisi kaçılabilir |

Uzmanlıklar ekonomik kimlik yaratır: Cengâver maden bölgesine mecbur (Vahşi Bölge'nin dibinde),
Nişancı ormana, Ocakçı harabe/bataklığa — sınıflar haritada doğal olarak farklı riskler alır.

## 6. Gelişim: XP, Seviye ve Kart Sistemi

- **XP kaynakları:** mob kesimi (ana), dummy (GZ'de, düşük), kaynak toplama (az), oyuncu kesme
  (yüksek + kurbanın seviyesiyle orantılı), sandıklar.
- **Vahşi Bölge çarpanı:** GZ dışında kazanılan tüm XP **×2**, drop şansı **×2**. HUD'da bu
  çarpan görünür durur — oyuncuya riski niye aldığını sürekli hatırlatır.
- XP barı **%100'e ulaşınca seviye atlanır** ve bir kart seçim hakkı kazanılır: **3 karttan 1'i seçilir**.
  - **Kart ekranı ASLA kendiliğinden açılmaz** — PvP'nin ortasında ekran kaplamaz. Bunun yerine
    HUD'da **yanıp sönen bir kart göstergesi** belirir (nabız gibi atan ikon + bekleyen kart
    sayısı rozeti); gözden kaçmaz ama oyunu bölmez. Oyuncu göstergeye dokununca ekran açılır.
  - Kart ekranı açıkken oyun durmaz ve karakter savunmasızdır — **güvenli anı seçmek oyuncunun
    taktik kararıdır**. Bekleyen seçim hakları birikir (üst üste seviye alınabilir).
- **Seviye atlama herkese görünür bir olaydır:** karakterin üzerinde parlak bir halka/ışık
  sütunu efekti + kısa ses patlar — hem oynayan kişi seviye aldığını net hisseder, hem de
  yakındaki oyuncular "şu güçlendi / kart seçmek için güvenli yer arayacak" istihbaratını alır.
  Seviye efekti bilinçli olarak gizlenemez: güçlenmenin bedeli görünür olmaktır.
- **Kart havuzu üç tip:**
  1. **Sınıf kartları:** yeni beceri veya mevcut beceriye modifikatör (örn. Atılma artık geçtiği
     yerde yangın bırakır).
  2. **Stat kartları:** +%HP, +hız, +saldırı hızı, +can çalma…
  3. **Ekonomi kartları:** toplama hızı, GZ süresi +60 sn, mob droplarında ekstra şans,
     cendere hasarına direnç.
- **Nadirlik:** Sıradan / Nadir / Destansı. Seviye yükseldikçe ve Vahşi Bölge'de kazanılan
  seviyelerde nadir kart şansı artar (risk → daha iyi build).
- Hedef: 15-20 dk'lık maçta ortalama **8-12 seviye** → her maç farklı bir build hissi
  (Vampire Survivors / Brotato kart döngüsü, ama PvP baskısı altında).

## 7. Kaynaklar ve "Tek Kişilik" Kuralı

- Kaynak türleri: **ağaç** (kereste), **maden damarı** (cevher), **bitki** (pot ve buff
  hammaddesi — pot sistemi için bkz. §9 Can yenileme; toplam 3 pot slotu), **zehir otu**
  (yalnızca bataklıkta — zehir/panzehir potlarının hammaddesi, bkz. §9 Zehir), **sandık**
  (harabe bölgesinde, rastgele değerli içerik).
- **Her kaynak ve her mob tek kişiye aittir:**
  - Kaynak toplama bir **kanal**dır (örn. 3 sn). Kanalı ilk başlatan kaynağı kilitler; kanal
    sırasında hasar yerse kanal bozulur ve kilit düşer → **kaynak gaspı** meşru bir taktiktir.
  - Mob'da **son vuruş değil, en çok hasar** sahibi XP ve dropu alır (kill-steal'i yumuşatır ama
    rekabeti öldürmez).
- **Kaynak ne işe yarar (v1 — basit tutuyoruz):** Cevher/kereste doğrudan **kalıcı stat parçasına**
  dönüşür (örn. 5 cevher = +1 zırh, 5 kereste = +%2 saldırı). Ayrı bir craft/envanter ekranı v1'de
  YOK — malzeme toplandıkça otomatik işlenir, sayaç HUD'da görünür. (Gerçek craft sistemi v3 adayı.)
- Kaynaklar yeniden doğar ama gittikçe yavaş; Son Cendere'de hiç doğmaz → kıtlık son savaşı zorlar.

## 8. Moblar

| Tier | Nerede | Ne zaman | Örnek | Davranış |
|---|---|---|---|---|
| T0 Dummy | GZ | Hep | Antrenman kuklası | Hareketsiz, vurdukça az XP |
| T1 | GZ + Vahşi kenarı | 0:00'dan itibaren | Yaban domuzu, yarasa | Pasif; vurulunca saldırır |
| T2 | Vahşi Bölge kampları | 3:00+ | Haydut, kurt sürüsü; bataklıkta dev örümcek/yılan (**zehirli vurur**) | Devriye gezer, yaklaşana saldırır, kamp savunur |
| T3 Elit | Vahşi Bölge derinliği | 8:00+ (Sıkışma) | Mağara trolü, hortlak şef | Yüksek HP, telegraflı alan saldırıları, **Destansı kart garantili drop** |
| T4 Cendere Canavarı | Daralan alanın kıyısı | 13:00+ (Son Cendere) | Cendere hortlağı | Sınırdan içeri sızar, oyuncuları merkeze SÜRER — tasarım görevi: kamp yapanı söküp atmak |

Mob AI durum makinesi: `Boşta → Devriye → Kovala → Saldır → (canı azsa) Kaç/Çağır`.
Telegraf kuralı: T2+ mobların güçlü vuruşları 0.5-1 sn önceden zeminde kızıl alanla gösterilir
— mobil ekranda okunabilirlik şart.

## 9. Savaş Sistemi

- **PvE + PvP aynı sistem:** aynı hasar formülü, aynı beceriler; GZ sadece hedef filtresi uygular.
- Hasar modeli: `hasar = beceri gücü × (1 + saldırı statı) − zırh` ; kritik şansı kartlarla gelir.
- **Mobil kontrol (minimal):** Sol yarı = sanal joystick (hareket). Sağ yarı = **tek beceri
  butonu** (cooldown göstergeli; Destansı slot kartı alındıysa ikinci buton belirir).
  Temel saldırı tamamen otomatik — buton yok. Kaynak toplama / Ganimet Kesesi = yaklaşınca
  beliren bağlamsal buton. Ekrandaki toplam etkileşim: joystick + 1(-2) buton + bağlamsal buton.
- **Can yenileme (üç katman — dövüş içinde iyileşme hep zayıf ve maliyetlidir):**
  1. **Yoğunlaşma:** yerinde durup kanallayarak yavaş can dolumu; hasar yiyince kesilir
     (toplama/kese ile aynı kanal mekaniği). Vahşi Bölge'de bedava ama savunmasız; GZ'de
     güvenli ama **GZ bütçesini yakar** → "nerede iyileşeceğim" başlı başına bir karardır.
  2. **Seviye atlayınca can FULLENİR.** Görünür seviye efektiyle birleşir: çevredekiler
     ışık sütununu görünce rakibin fullendiğini de bilir. "XP %90'dayım, şu mobu kesip
     fullenip döneyim" tipi kararlar üretir.
  3. **Pot:** bitki toplamaktan elde edilir (Ocakçı uzmanlığı — pot ekonomisinin sahibi).
     **En fazla 3 taşınır**; içmek kısa animasyon ister (yavaşlatır) ve can **2-3 saniyeye
     yayılarak** dolar — anlık full heal YOK. Pot dövüş arası tempo aracıdır; dövüş içinde
     basmak hız/pozisyon maliyetli bir kumardır.
  - Ani Ölüm evresinde üç katmanın tümü yarı etkiye düşer (bkz. §2).
- **Zehir (iyileşmenin dengeleyicisi — Ultima usulü):**
  - Etki: hafif DoT + **tüm iyileşme kapalı** (yoğunlaşma başlatılamaz, pot işlemez).
    Yığılmaz, tekrar zehirlenme süreyi tazeler. Süre sınırlı (~8 sn): panzehirsiz oyuncu
    ölmez ama o pencerede çok savunmasızdır — zehrin silahı hasar değil, baskıdır.
  - **İstisna: seviye atlamak zehri temizler, sonra can fullenir.** ("Zehirliyken XP %95 —
    mob kesip arınayım mı, kaçayım mı?" kararı.)
  - Kaynak: **zehir otu yalnızca bataklık alt bölgesinde** yetişir; bataklık mobları
    (örümcek, yılan) zehirli vurur → oyuncu mekaniği önce PvE'de öğrenir.
  - Kullanım: zehir potu içilmez, **silaha sürülür** — pot slotuna dokun, sonraki ~10 sn'lik
    otomatik saldırılar zehir bulaştırır. Ek buton yok.
  - Tedavi SADECE: panzehir potu (bataklık+normal bitki karışımı) VEYA iyileştirme temalı
    kart/beceri (Ocakçı havuzunda "Arındırma"). İkisi de yoksa süre beklenir/kaçılır.
  - Pot envanteri sade kalır: **toplam 3 slot, tür serbest** (can/panzehir/zehir karışımı) —
    slot dağılımı başlı başına build kararıdır.
  - Okunabilirlik: zehirli karakter yeşil tona döner + baloncuk partikülü — HERKESE görünür
    ("şimdi bas" istihbaratı; görünür seviye efektiyle aynı felsefe).
  - Mimari evi: `health.status` genel durum-efekti alanı (ilk üye zehir; ileride yavaşlatma/
    yanma aynı kapıdan) — DoT+iyileşme kapısı healthSystem'de, silah kaplaması combatSystem'de.
- **Ölüm ve Ganimet Kesesi:** Ölüm kalıcı (BR). Katil **anında** yalnızca kurban seviyesiyle
  orantılı XP alır; asıl ödül kurbanın düştüğü yerde beliren **Ganimet Kesesi**dir:
  - Kurbanın **işlenmemiş malzemeleri** (keseyi toplayana gider — katile değil).
  - **Yankı Kartı:** kurbanın build'indeki kartlardan rastgele birinin kopyası. Toplayan
    kartı anında build'ine ekler **veya** yarım seviyelik XP'ye çevirir. Kurbanın seviyesi
    yükseldikçe nadir kart şansı artar → gelişmiş oyuncuları kesmek geç oyunda gerçek hedef.
  - Keseyi toplamak kısa bir **kanal** gerektirir (kaynak sistemiyle aynı mekanik): kill
    sonrası bile açıkta savunmasız anlar yaşanır, üçüncü kişi ("akbaba") keseyi kapabilir.
    Yerde loot = akbaba oyunu + toplama riski + snowball freni.
- Seyirci modu (v2): ölen oyuncu katilini izler.

## 10. Botlar (v1'in "MMO"su)

Botlar geçici bir yama değil, **kalıcı bir oyun bileşenidir**: multiplayer geldikten sonra da
her maçta eksik koltuklar botlarla doldurulur → matchmaking bekleme süresi hiçbir zaman uzamaz,
maç her zaman 15-20 katılımcıyla dolu başlar. (Gerçek oyuncu sayısı arttıkça bot oranı doğal
olarak düşer.) Bu yüzden bot AI'ına yapılan yatırım Faz 2'de çöpe gitmez — oyunun ta kendisidir.

Bot AI'ı gerçek oyuncu gibi davranmalı:

- **Karar katmanı (utility AI):** her botun kişiliği var (agresif / çiftçi / fırsatçı).
  Periyodik olarak şunları puanlar: *en yakın kaynak, en yakın mob kampı, GZ'ye çekilme,
  zayıf oyuncuya saldırı, cendereden kaçış*. En yüksek puanlı hedefe yönelir.
- Botlar da XP kazanır, seviye atlar, kart "seçer" (basit öncelik listesinden) — böylece geç
  oyunda karşına gelen bot gerçekten gelişmiş olur.
- Zorluk ayarı: botların tepki süresi ve nişan hatası parametriktir.

## 11. Görsel Yön ve Asset Planı

**Kural: hiçbir aşamada üçgen-kare placeholder yok.** İlk oynanabilir sürüm bile sprite'lı çıkar.

- **Kaynak:** CC0/ücretsiz paketlerle başlıyoruz; aday setler (hepsi top-down, birbirine uyumlu
  seçilecek — tek maçta tek sanat stili):
  - Kenney (kenney.nl): "Tiny Dungeon", "RPG Urban/Nature" paketleri — tutarlı, temiz, CC0
  - itch.io: "Mystic Woods", "Ninja Adventure" (CC0, karakter animasyonları hazır), 0x72 Dungeon Tileset
- **Stil hedefi:** 16px-32px pixel art, sıcak palet; harita tile tabanlı (çim/toprak/taş
  geçişleri), karakterlerde 4 yön yürüme + saldırı animasyonu (sprite sheet).
- **Animasyon mekaniği:** sprite sheet + kare tablosu JSON'u; kod tarafında tek `Animator`
  bileşeni. Asset değişirse yalnızca PNG + JSON değişir, kod değişmez → "sonradan güncelleriz"
  isteği için mimari garanti.
- **Efektler:** hasar sayıları, vuruş parlaması, cendere sınırında kızıl sis, GZ sınırında
  altın çizgi, **seviye atlama halkası/ışık sütunu (uzaktan da görünür — §6)**, HUD'da yanıp
  sönen bekleyen-kart göstergesi — hepsi kodla üretilen parçacıklar (asset gerektirmez).
- Ses (v2): darbe, toplama, seviye, cendere uğultusu — freesound/Kenney audio.

## 12. Teknik Mimari

**Detaylı mimari ayrı dokümandadır: [`ARCHITECTURE.md`](ARCHITECTURE.md)** — katmanlar,
klasör yapısı, tick boru hattı, entity modeli, event kataloğu, özellik→katman haritası ve
anti-spagetti kuralları orada tanımlıdır. Kod yazarken otorite o dosyadır. Özü:

- **Sim ≠ Render:** oyun mantığı (`sim/`, 60 tps, deterministik) Canvas/DOM bilmez → Faz 2'de
  olduğu gibi Colyseus sunucusuna taşınır. Render/UI sadece okur ve event dinler.
- **Veri odaklı denge:** tüm sayılar `src/data/` altında — denge değişikliği kod değiştirmez.
- **Girdi = Intent:** oyuncu da bot da sim'e aynı Intent'lerle konuşur (botlar hile yapamaz,
  online geçişte komutlar ağ paketine dönüşür).
- **Araçlar:** Vite (telefondan anlık test), Vitest (sim birim testleri), ESLint ile katman
  import kuralları, JSDoc `@ts-check` ile tip güvenliği.
- **Performans hedefi:** orta seviye Android'de 60 fps; viewport culling, object pool, tek atlas.

## 13. Yol Haritası

### Faz 1 — Offline Cendere (hedef: oynanabilir ve eğlenceli)

Sıralama iki ilkeyle kuruldu: **bağımlılık** (alttaki sistem olmadan üstteki yazılamaz) ve
**en riskli varsayım en önce** (çekirdek savaş eğlenceli değilse gerisi boşa gider).
Her milestone sonunda oyun ÇALIŞIR durumda ve telefonda test edilir.

- [x] **M1 – İskelet ve Dünya** *(her şeyin zemini)* ✅ 2026-08-28
      Vite + ESLint katman kuralları + klasör iskeleti · harita JSON + tile render ·
      joystick & klavye → Intent · hareket + çarpışma (spatial hash, katı objeler) ·
      kamera + interpolasyon · animasyonlu karakter (atlas + animator)
      → *Çıktı: telefonda 60 fps gezilebilen dünya. Performans varsayımı burada doğrulanır.*
- [x] **M2 – Savaş Çekirdeği** *(en riskli varsayımın testi: vurmak zevkli mi?)* ✅ 2026-08-28
      Otomatik saldırı + hedefleme + hasar formülü · TEK sınıfla başla (Cengâver) + aktif
      becerisi · T1 moblar (basit FSM) · ölüm akışı (sim siler, render uğurlar) ·
      vuruş hissi: hasar sayıları, flash, sarsıntı
      → *Çıktı: mob kesmek tatmin ediyor mu? Etmiyorsa burada durup his ayarı yapılır.*
- [x] **M3 – Gelişim Döngüsü** *(savaşa "neden" ekler)* ✅ 2026-08-29
      XP + seviye (full can + herkese görünür ışık sütunu) · yanıp sönen kart göstergesi +
      kart ekranı · ilk ~15 stat/ekonomi kartı · dummy'ler
      → *Çıktı: "kes → gelis → güçlen" çekirdek döngüsü dönüyor.*
- [x] **M4 – Kanal Ekonomisi** *(tek mekanik, dört özellik)* ✅ 2026-08-29
      Kanal+kilit sistemi (bir kez yazılır) → kaynak toplama, yoğunlaşma, can potu ·
      otomatik malzeme işleme (cevher→zırh) · Vahşi/GZ ×2 çarpan altyapısı
      → *Çıktı: harita üzerinde rota kararları anlamlı ("madene mi, mob kampına mı?").*
- [x] **M5 – Cendere ve GZ** *(oyunu "maç" yapan adım)* ✅ 2026-08-29
      Evre zamanlayıcısı (5 evre) · daralan sınır + cendere hasarı · GZ bölgesi + kişisel
      bütçe + Sürgün · maç akışı: lobi/sınıf seçimi → maç → ölüm/zafer ekranı
      → *Çıktı: başı-sonu olan 15-20 dk'lık gerçek bir maç (rakipsiz de olsa).*
- [x] **M6 – Rakipler** *(oyunu "oyun" yapan adım — en büyük iş kalemi)* ✅ 2026-08-29
      Bot AI: utility puanlama + kişilikler + kart seçimi (Intent üretir) · PvP (GZ hedef
      filtresi) · Ganimet Kesesi + Yankı Kartı · kalan 2 sınıf (Nişancı, Ocakçı) ·
      T2 mob kampları
      → *Çıktı: 15-20 katılımcılı tam Cendere maçı. İlk gerçek "eğlenceli mi?" testi.*
- [x] **M7 – Derinlik Katmanı** *(sistemler oturduktan sonra gelen içerik)* ✅ 2026-08-29
      Zehir (status altyapısı + silah kaplama + panzehir) + bataklık mobları · T3 elit +
      T4 Cendere Canavarları · sınıf kartları/modifier'lar (ok bölünmesi vb.) · Destansı
      ikinci beceri slotu kartı
      → *Çıktı: build çeşitliliği ve geç oyun baskısı — tasarımın imza mekanikleri.*
- [x] **M8 – Cila ve Denge** ✅ 2026-08-29
      Minimap + kenar okları · SFX seti (18 ses: vuruş/ok/büyü/kill/seviye/kart/toplama/
      kese/pot/zehir/evre/zafer) + mute düğmesi · duyuru bandı · kill feed · denge
      simülatörü (`tools/balance.mjs`) ile sınıf kalibrasyonu · harita çakışma temizliği ·
      açık soruların (§14) kapanışı
      → *Çıktı: arkadaşa link atılabilir ilk sürüm. (Gerçek cihaz performans turu: kullanıcı telefonda 120 fps doğruladı.)*

**Bilinçli erteleme kararları:** 3 sınıfın 2'si M6'ya kaldı (savaş hissi tek sınıfla kanıtlanır;
sınıf çeşitliliği içeriktir, sistem değildir). Zehir M7'de çünkü iyileşme+pot+savaşın üçüne
birden bağımlı. Bot AI M6'da çünkü botun "oynayacağı oyun" ancak M5'te var olur. Ses ve minimap
sona kaldı çünkü hiçbir sistemin girdisi değiller.

### Faz 1.5 — Dağıtım ve Erişilebilirlik
- [x] **PWA paketi** ✅ 2026-08-29 — manifest + service worker (cache-first) + ikon
      (cendere halkası içinde ninja) + budanmış build (`tools/prune-dist.mjs`: 64MB → 3MB).
      HTTPS host'a (Netlify/GitHub Pages) yüklenince telefona "Ana ekrana ekle" ile kurulur.
- [ ] **Yerelleştirme (TR/EN):** tüm UI metinleri tek sözlük dosyasına (`src/data/i18n.js`)
      taşınır; dil seçimi lobide + localStorage; kart adları/açıklamaları dahil.
- [ ] **Giriş öğreticisi:** ilk açılışta ayrı küçük bir öğretici sahnesi — hareket,
      otomatik saldırı, toplama, beceri, GZ ve cendere kavramlarını 60-90 saniyede
      adım adım yaşatan güdümlü mini harita (görev metinleri + ok işaretçileri);
      "geç" butonu ve localStorage "gördü" bayrağı.

### Faz 2 — Online
- [ ] Colyseus sunucusu; sim katmanı sunucuya taşınır, client tahmin/interpolasyon
- [ ] Oda sistemi (15-20 oyuncu), eksik koltuklara bot doldurma, basit isim/lobi

### Faz 3 — Büyüme (fikir havuzu)
- [ ] 4.-5. sınıf, gerçek craft/envanter, sezonluk kart havuzu, takım modu (duo), maç içi mağaza,
      mağaza dağıtımı (Capacitor), istatistik/sıralama

## 14. Açık Sorular — HEPSİ KARARLAŞTI (M8, 2026-08-29)

1. **GZ bütçesi: 120 sn** (8 dk'lık maça göre). Aşımın cezası mekanik: Sürgün + fiziksel
   dışarı itilme + 3 can/sn yanma.
2. **Ganimet Kesesi + Yankı Kartı** (bkz. §9); Yankı Kartı açanın sınıfına uygun seçilir,
   uygun yoksa +20 XP. Kese, çatışmadan 0.5 sn sonra açılabilir.
3. **Kart ekranı: tam savunmasızlık kaldı** — oyun durmaz, seri seçim destekli; oynanışta
   sorun çıkarmadı.
4. **T4 kill edilebilir** (130 can, 60 XP) — ama asıl işlevi sürmek; 20 sn'de bir dalga.
5. **Bot sayısı: 9** (toplam 10 oyuncu) — telefonda 120 fps ile sorunsuz.
6. **Zehir:** mob zehri 3 dps × 4 sn; kart zehri 2 dps × 3 sn; pot = panzehir; seviye temizler.
7. **PvP XP: 25 + kurban seviyesi × 10** (bölge çarpanlı) — her mobdan değerli.
8. **Sınıf dengesi** `tools/balance.mjs` simülasyonuyla kalibre: 30 maçta 12/12/6 dağılımı.

---
*Son güncelleme: 2026-08-28 — teknoloji ve perspektif kararları kesinleşti (JS/Canvas, 2D top-down).*

// Lobi (sınıf seçimi) ve maç sonu ekranları (PLAN §2 maç akışı).

import { CLASSES } from '../data/classes.js';
import { openCardCatalog } from './cardCatalog.js';
import { openClassCatalog } from './classCatalog.js';

// Son seçilen sınıf localStorage'da kalıcı (cendere-mute deseni) —
// lobiye her dönüşte karosel bu sınıfla açılır.
const LS_CLASS = 'cendere-class';

const WRAP_STYLE = {
  position: 'fixed',
  inset: '0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 50% 40%, #2b2749, #12101f 75%)',
  color: '#efe6d5',
  zIndex: '50',
  userSelect: 'none',
  webkitUserSelect: 'none',
  textAlign: 'center',
};

// Karosel kartının içeriği: önizleme + ad + statlar + auto/beceri kutuları + perk.
// CLASSES'tan türetilir — 5. sınıf eklenince kod değişmeden karosele girer.
function classCardHtml(cls) {
  const f = cls.flavor;
  return (
    // Karakter önizlemesi: Idle sheet'in ilk (aşağı bakan) karesi, 5× büyütme
    `<div style="width:80px;height:80px;margin:2px auto 6px;image-rendering:pixelated;` +
    `background:url('pack/Actor/Characters/${cls.charFolder}/SeparateAnim/Idle.png') 0 0 no-repeat;` +
    `background-size:320px 80px"></div>` +
    `<div style="font:bold 22px Georgia,serif">${cls.name}</div>` +
    `<div style="font:bold 12px monospace;color:#8cd9ff;margin:5px 0 10px">❤ ${cls.hp} · 👢 SPEED ${cls.speed}</div>` +
    `<div style="text-align:left;background:rgba(0,0,0,0.25);border-radius:6px;padding:7px 10px;margin-bottom:7px">` +
    `<div style="font:bold 12px sans-serif;color:#e8dcb8">⚔ ${f.autoName} <span style="opacity:0.6;font-weight:normal">(otomatik)</span></div>` +
    `<div style="font:11px sans-serif;opacity:0.75;line-height:1.4;margin-top:2px">${f.autoDesc}</div>` +
    `</div>` +
    `<div style="text-align:left;background:rgba(255,215,94,0.08);border:1px solid rgba(255,215,94,0.25);border-radius:6px;padding:7px 10px">` +
    `<div style="font:bold 12px sans-serif;color:#ffd75e">` +
    `<img src="${f.skillIcon}" style="height:14px;vertical-align:-2px;image-rendering:pixelated" alt=""> ${f.skillName} <span style="opacity:0.6;font-weight:normal">(beceri)</span></div>` +
    `<div style="font:11px sans-serif;opacity:0.8;line-height:1.4;margin-top:2px">${f.skillDesc}</div>` +
    `</div>` +
    `<div style="font:11px monospace;color:#8cf58c;margin-top:8px">⛏ ${f.perk}</div>`
  );
}

/** Lobi: karoselden şampiyon seç → başlat. Ortadaki karakter = seçili karakter. */
export function showLobby(onStart) {
  const el = document.createElement('div');
  Object.assign(el.style, WRAP_STYLE);
  el.style.overflowY = 'auto'; // kısa ekranda içerik taşarsa kaydırılabilsin

  // Ok düğmeleri: büyük dokunma alanı (dikeyde uzun) — karakterler arasında döngüsel gezer
  const arrowStyle =
    'flex:none;width:clamp(46px,7vw,62px);height:clamp(88px,16vw,120px);display:flex;' +
    'align-items:center;justify-content:center;border-radius:14px;cursor:pointer;' +
    'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);' +
    'color:#ffd75e;font:bold 38px Georgia,serif;user-select:none';

  el.innerHTML =
    `<div style="font:bold 44px Georgia,serif;letter-spacing:8px;color:#ffd75e;text-shadow:0 0 24px #ffb54566">CENDERE</div>` +
    `<div style="font:13px sans-serif;opacity:0.7;margin:6px 0 18px">Son kalan kazanır. Cendere daralıyor.</div>` +
    // Karosel: ‹ [tek büyük kart] › — oklar döngüsel (sondan başa sarar), swipe da çalışır
    `<div id="lobby-carousel" style="display:flex;align-items:center;justify-content:center;gap:clamp(8px,2vw,18px);max-width:96vw;touch-action:pan-y">` +
    `<div id="lobby-prev" style="${arrowStyle}">‹</div>` +
    `<div id="lobby-card" style="width:clamp(220px,56vw,320px);min-height:300px;padding:14px 14px 14px;` +
    `border-radius:14px;background:linear-gradient(170deg,#2b2749,#171430);border:2px solid #ffd75e;` +
    `box-shadow:0 0 18px #ffd75e44;overflow:hidden">` +
    `<div id="lobby-card-inner" style="transition:opacity 0.12s ease,transform 0.12s ease"></div>` +
    `</div>` +
    `<div id="lobby-next" style="${arrowStyle}">›</div>` +
    `</div>` +
    // Nokta göstergesi: kaçıncı karakterdeyiz (CLASSES sayısı kadar)
    `<div id="lobby-dots" style="display:flex;gap:8px;margin-top:12px"></div>` +
    // Belirgin buton: KARTLAR ile aynı görsel dil (soluk altın zemin + çerçeve), geniş dokunma alanı
    `<div id="lobby-all" style="margin-top:12px;padding:10px 30px;border-radius:8px;background:rgba(255,215,94,0.08);` +
    `border:1px solid rgba(255,215,94,0.45);color:#ffd75e;font:bold 13px sans-serif;letter-spacing:1px;cursor:pointer">KARAKTERLERİN TÜMÜNÜ GÖR</div>` +
    `<div id="lobby-start" style="margin-top:16px;padding:12px 46px;border-radius:8px;background:linear-gradient(160deg,#ffd75e,#c98a2e);color:#221a08;font:bold 17px sans-serif;cursor:pointer;box-shadow:0 4px 16px #0009">MAÇA BAŞLA</div>` +
    // İkincil buton: altın dilinin soluk/çerçeveli hali — kart kataloğunu açar
    `<div id="lobby-cards" style="margin-top:12px;padding:9px 34px;border-radius:8px;background:rgba(255,215,94,0.08);border:1px solid rgba(255,215,94,0.45);color:#ffd75e;font:bold 13px sans-serif;letter-spacing:1px;cursor:pointer">KARTLAR</div>`;

  const ids = Object.keys(CLASSES);
  // Son seçim localStorage'dan; kayıt yok/geçersizse (sınıf silindiyse) ilk sınıf
  let selected = localStorage.getItem(LS_CLASS) ?? '';
  if (!CLASSES[selected]) selected = ids[0];

  const inner = el.querySelector('#lobby-card-inner');
  const dotsWrap = el.querySelector('#lobby-dots');
  const dots = ids.map(() => {
    const d = document.createElement('div');
    Object.assign(d.style, { width: '9px', height: '9px', borderRadius: '50%', transition: 'background 0.15s' });
    dotsWrap.appendChild(d);
    return d;
  });

  function refresh() {
    inner.innerHTML = classCardHtml(CLASSES[selected]);
    dots.forEach((d, i) => (d.style.background = ids[i] === selected ? '#ffd75e' : '#ffffff33'));
  }

  // Seçim güncelle + kalıcılaştır. dir≠0 ise hafif kaydırma/solma geçişi:
  // dışarı kay+sol → içerik değiş → karşı taraftan içeri kay+belir.
  function select(id, dir = 0) {
    selected = id;
    try {
      localStorage.setItem(LS_CLASS, id);
    } catch {
      /* gizli mod vb. — kalıcılık olmadan devam */
    }
    if (dir === 0) {
      refresh();
      return;
    }
    inner.style.opacity = '0';
    inner.style.transform = `translateX(${-16 * dir}px)`;
    setTimeout(() => {
      refresh(); // hızlı ok basışlarında son 'selected' kazanır
      inner.style.transition = 'none';
      inner.style.transform = `translateX(${16 * dir}px)`;
      void inner.offsetWidth; // reflow: giriş konumu geçişsiz otursun
      inner.style.transition = 'opacity 0.12s ease,transform 0.12s ease';
      inner.style.opacity = '1';
      inner.style.transform = 'translateX(0)';
    }, 120);
  }

  // Döngüsel gezinme: son karakterden ileri → ilk; ilkten geri → son
  function nav(dir) {
    select(ids[(ids.indexOf(selected) + dir + ids.length) % ids.length], dir);
  }

  el.querySelector('#lobby-prev').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    nav(-1);
  });
  el.querySelector('#lobby-next').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    nav(1);
  });
  // Swipe: kart üstünde yatay sürükleme de gezdirir (touch-action:pan-y dikey scroll'u korur)
  const cardEl = el.querySelector('#lobby-card');
  let swipeX = null;
  cardEl.addEventListener('pointerdown', (e) => (swipeX = e.clientX));
  cardEl.addEventListener('pointerup', (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 36) nav(dx < 0 ? 1 : -1);
  });

  // Tüm karakterler sayfası: dokunulan karakter seçilir, karosel ona döner
  el.querySelector('#lobby-all').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    openClassCatalog(selected, (id) => select(id, 0));
  });

  refresh();

  el.querySelector('#lobby-start').addEventListener('pointerdown', () => {
    el.remove();
    onStart(selected);
  });
  // Kart kataloğu: lobinin üstünde tam ekran overlay (oyun henüz başlamadı)
  el.querySelector('#lobby-cards').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    openCardCatalog();
  });
  document.body.appendChild(el);
}

/** Maç sonu: ölüm ya da hayatta kalma. */
export function showEndScreen({ win, level, timeText }, onRestart) {
  const el = document.createElement('div');
  Object.assign(el.style, { ...WRAP_STYLE, background: win ? WRAP_STYLE.background : 'radial-gradient(circle at 50% 40%, #3d1420, #12060b 75%)' });
  el.innerHTML =
    `<div style="font:bold 38px Georgia,serif;letter-spacing:4px;color:${win ? '#ffd75e' : '#e85a5a'}">${win ? 'HAYATTA KALDIN' : 'CENDERE SENİ ALDI'}</div>` +
    `<div style="font:14px sans-serif;opacity:0.8;margin:14px 0 4px">Seviye ${level} · Süre ${timeText}</div>` +
    `<div id="end-restart" style="margin-top:26px;padding:12px 42px;border-radius:8px;background:linear-gradient(160deg,#ffd75e,#c98a2e);color:#221a08;font:bold 16px sans-serif;cursor:pointer">TEKRAR OYNA</div>`;
  el.querySelector('#end-restart').addEventListener('pointerdown', onRestart);
  document.body.appendChild(el);
}

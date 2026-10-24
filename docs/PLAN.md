# Uygulama Planı ve Görev Dağılımı

**Ekip Rolleri:**
- **Developer A — Fahad (@MFahadFaisal):** Frontend, UI/UX, responsive layout, API adapter, public web deployment, demo UI kontrolleri.
- **Developer B — Salik (@aposalik):** Contracts (Foundry), Monad Testnet deployment, backend API, receipt/log analyzer, teknik doğrulama.
- **Ortak Sözleşme:** `shared/types/index.ts` ve `docs/API_CONTRACT.md`.

Durumlar: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`. `DONE` yalnızca doğrulama kanıtıyla kullanılır.

---

## Fazlar — Fahad (Frontend)

### Phase F1 — Live Monitor, Quick Demo Switcher & Kanıt UI (P0)
- **Hedef:** 90 saniyelik sunumda jüriye tek tıkla testnet tx'lerini gösterebilmek ve sonuçları zenginleştirmek.
- **Görevler:**
  1. `LiveMonitorPanel` bileşenini tamamla; geçmiş analizleri ve durum göstergelerini listele.
  2. Quick Demo Senaryo butonları ekle:
     - "Legitimate Demo Transfer" -> Doğrulanmış `DemoToken` transfer hash'ini yükler ve analiz eder.
     - "Spoofed Event (Fake Transfer)" -> `DemoEventOnly` sahte transfer hash'ini yükler ve analiz eder.
  3. `AnalysisPanel` görsel geliştirmeleri:
     - `VERIFIED_DEMO_TRANSFER` için yeşil kalkan/onay ikonu ve explorer bağlantısı.
     - `SUSPICIOUS_EVENT` için kırmızı/turuncu uyarı rozeti ve "Emitter Mismatch: Beklenen sözleşme ile log yayıcısı uyuşmuyor, bakiye değişmedi" vurgusu.
- **Kabul Kriteri:** Tek tıkla demo senaryoları çalışır, classification rozetleri belirgindir.

### Phase F2 — Backend Entegrasyonu & Hata/Offline Yönetimi (P0)
- **Hedef:** Backend API'sine (`VITE_API_BASE_URL`) bağlanmak ve backend erişilemediğinde arayüzün çökmesini engellemek.
- **Görevler:**
  1. `frontend/src/services/api.ts`'nin `POST /api/v1/transactions/analyze` ve `GET /health` endpoint'leri ile entegrasyonu.
  2. Backend kapalıyken net hata mesajı, tekrar dene butonu ve offline demo fallback modu sunumu.
  3. Monad Testnet explorer linklerinin (adres ve hash) güvenli link (`target="_blank" rel="noopener noreferrer"`) olarak açılması.
- **Kabul Kriteri:** API hataları ekranda güvenli ve açıklayıcı gösterilir, raw html injection riski yoktur.

### Phase F3 — Public Deployment & Mobil/Responsive Uyumluluk (P0)
- **Hedef:** Hakemlerin ve jürinin kendi telefonlarından veya harici cihazdan açabileceği canlı web adresi.
- **Görevler:**
  1. Vercel veya Cloudflare Pages üzerinde production deployment kurulumu (`npm run build`).
  2. 375px ve 500px mobil ekranlarda taşma ve metin çakışmalarının kontrolü.
  3. `npm run check` (lint + typecheck + test + build) 0 hata ile geçmelidir.
- **Kabul Kriteri:** Canlı HTTPS URL'i çalışır, mobilde kırılma/taşma olmaz.

### Phase F4 — WebSocket Canlı Akış & Bildirimler (P1 - Opsiyonel)
- **Hedef:** `WS /api/v1/events` üzerinden gelen gerçek zamanlı bulguları ekrana toast/canlı akış olarak düşürmek.
- **Kabul Kriteri:** Bağlantı koptuğunda HTTP fallback ve reconnect backoff çalışır.

---

## Fazlar — Salik (Backend & Contracts)

### Phase B1 — Foundry ile Demo Sözleşmeleri & Birim Testleri (P0)
- **Hedef:** İki kontrollü sözleşmenin yazılması ve test edilmesi.
- **Görevler:**
  1. `contracts/src/DemoToken.sol`: Gerçek bakiye değiştiren standart ERC-20.
  2. `contracts/src/DemoEventOnly.sol`: Transfer eventi fırlatan fakat bakiye değiştirmeyen sözleşme.
  3. Foundry unit testleri: `DemoToken.t.sol` bakiye değişimini, `DemoEventOnly.t.sol` ise token bakiyesinin değişmediğini doğrular.
- **Kabul Kriteri:** `forge test` tüm testleri yeşil geçer.

### Phase B2 — Monad Testnet Dağıtımı & Tohum İşlemleri (P0)
- **Hedef:** Testnet üzerinde iki doğrulanmış işlem oluşturmak.
- **Görevler:**
  1. `DemoToken` ve `DemoEventOnly` sözleşmelerini Monad Testnet'e deploy et.
  2. 1 adet meşru transfer işlemi yap (`DemoToken.transfer`).
  3. 1 adet sahte event işlemi yap (`DemoEventOnly.emitSpoofedTransfer`).
  4. Adresleri ve işlem hash'lerini `docs/DEMO.md` ve `.env.example` içine kaydet; Fahad ile paylaş.
- **Kabul Kriteri:** Monad Explorer'da sözleşmeler ve iki işlem hash'i görüntülenebilir.

### Phase B3 — Deterministik Analyzer & Fastify API (P0)
- **Hedef:** `POST /api/v1/transactions/analyze` endpoint'ini ayağa kaldırmak.
- **Görevler:**
  1. Monad RPC üzerinden `eth_getTransactionReceipt` çağırma.
  2. Receipt loglarından `Transfer` topic'ini (`0xddf252ad1...`) ayıklama.
  3. Logun `address` alanı ile beklenen `DemoToken` adresini karşılaştırarak `VERIFIED_DEMO_TRANSFER` veya `SUSPICIOUS_EVENT` dönme.
  4. `GET /health` endpoint'ini sağlama.
- **Kabul Kriteri:** İki tohum hash backend'e yollandığında sözleşmeye uygun JSON döndürür.

### Phase B4 — Public Backend Deployment & CORS (P0)
- **Hedef:** Backend'i Render / Railway / Fly.io üzerinde canlıya almak.
- **Görevler:**
  1. Public HTTPS URL yapılandırması.
  2. Fahad'ın Vercel domain'ine CORS izinlerinin tanımlanması.
- **Kabul Kriteri:** Frontend canlı backend'e istek atabilir.

### Phase B5 — Bulguların Saklanması & WebSocket Servisi (P1)
- **Hedef:** Analiz edilen işlemlerin kalıcı saklanması (`GET /api/v1/findings`) ve `WS /api/v1/events` yayını.

---

## Genel P0 İş Takip Matrisi

| İş | Sahip | Bağımlılık | Durum | Kabul kriteri |
|---|---|---|---|---|
| Monorepo & dokümantasyon temeli | Ortak | Yok | DONE | `npm run check` geçti, monorepo hazır |
| Ortak API tipleri ve sözleşme | Ortak | Yok | DONE | `shared/types/index.ts` ve `API_CONTRACT.md` hazır |
| Dashboard temel UI ve arama | Fahad | Ortak tipler | DONE | Hash formu, validasyon, vitest testleri geçti |
| DemoToken + unit test | Salik | Foundry | TODO | Gerçek transfer bakiyeleri ve event assert edilir |
| DemoEventOnly + unit test | Salik | Foundry | TODO | Event oluşur, token bakiyesi değişmez |
| Monad Testnet deployment & seed tx | Salik | Sözleşmeler | TODO | Explorer'da iki adres ve demo tx'leri doğrulanır |
| Receipt/log analyzer API | Salik | Testnet adresleri, RPC | TODO | Emitter ve receipt kanıtıyla iki demo ayrılır |
| Quick Demo Switcher & Kanıt UI | Fahad | UI tasarımı | TODO | Tek tıkla demo senaryoları çalışır |
| Frontend API entegrasyonu | Fahad | Analyzer endpoint | TODO | Gerçek response ekranda, hata yönetimi güvenli |
| Public deployment (Frontend + Backend) | Fahad / Salik | Build & Env | TODO | Canlı public URL'ler çalışır |
| 90 saniyelik demo provası | Ortak | Uçtan uca akış | TODO | `docs/DEMO.md` akışı süre içinde iki işlemi ayırır |

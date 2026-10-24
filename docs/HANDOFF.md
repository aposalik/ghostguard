# Handoff

## Proje özeti

GhostGuard, Monad Testnet'te transfer biçimli event'in gerçek emitter'ını ve receipt durumunu inceleyerek kontrollü `DemoToken` ile `DemoEventOnly` senaryolarını ayırır. Üretim fraud detector iddiası yoktur.

## Sahiplik

- **Fahad:** `frontend/`, UI/UX, API tüketimi, frontend deploy ve sunum.
- **Salik:** `backend/`, `contracts/`, RPC/analyzer, testnet ve backend deploy.
- **Ortak:** `shared/types/index.ts`, `docs/API_CONTRACT.md`.

## Git durumu

- Repo: `https://github.com/aposalik/ghostguard.git`
- Yerel: `/Users/abdullahsalik/.openclaw/workspace/Ghostguard`
- Entegrasyon PR #9 merge commit'i: `893e01f` (`main`)
- Frontend dashboard PR #6 sonrası doğrulanmış evidence düzeltmeleri PR #8 ile merge edildi.
- Findings/WebSocket entegrasyonu `main` ve public Render servisindedir.

## Son tamamlanan backend dilimi

- Strict env configuration.
- Timeout'lu ve response-shape doğrulamalı JSON-RPC adapter.
- Deterministik receipt/log analyzer.
- Transfer topic/from/to/amount decoding.
- Trusted DemoToken/EventOnly config'ine göre verified/suspicious/review ayrımı.
- Fastify `GET /health` ve `POST /api/v1/transactions/analyze`.
- Canonical 400/404/503/500 error shape ve CORS allowlist.
- 4 dosyada 21 test; lint/typecheck/build geçti.

## Son tamamlanan contract dilimi

- Foundry 1.8.6 kullanılabilir; Solidity 0.8.28 ve optimizer ayarları sabitlendi.
- `DemoToken` gerçek ERC-20 balance değişimi ve event üretir.
- `DemoEventOnly` token state değiştirmeden, yalnızca deploy eden owner üzerinden Transfer biçimli event üretir.
- `forge fmt --check --root contracts` geçti.
- 3 Foundry testi geçti: gerçek transfer, event-only balance ayrımı ve yetkisiz çağrı reddi.

## Aktif deployment dilimi

- Resmî Monad Testnet endpoint'i `https://testnet-rpc.monad.xyz`, chain ID `10143`; live read-only probe doğrulandı.
- `DeployAndSeed.s.sol` local ve gerçek RPC üzerinde broadcast edilmeden başarıyla simüle edildi.
- Simülasyon iki deployment + iki seed çağrısı için 767094 tahmini gas ve yaklaşık 0.154952988 testnet MON üst sınırı verdi.
- Makinede yalnızca önceki MonVault projesine isimlendirilmiş keystore görüldü; GhostGuard için açık karar olmadan kullanılmadı.

## Tamamlanan testnet doğrulaması

- DemoToken: `0x21A48A0f107BaF3DC2eDA13e4aB6B7e624397639`.
- DemoEventOnly: `0xa7836d1245593d16929a3Eea3Aa34461EF08F474`.
- Gerçek transfer: `0x22b9eb3a62f096515a44a319fc119ea4411c1fb3c2652915497ecd4df57f6d1f` → `VERIFIED_DEMO_TRANSFER`.
- Event-only: `0x321987f432eefd92503aadd386a18d4c7df518653046cdb9e37b54e8cbde07c4` → `SUSPICIOUS_EVENT`.
- Dört deployment/seed receipt'i başarılı; gerçek transfer recipient'a `25 GGD` yazdı.

## Aktif P1 watcher/email dilimi

- `TransferWatcher` finalized block range'lerini 100 blokluk parçalarla tarar; monitored addresses hem `from` hem `to` topic'inde aranır.
- SQLite checkpoint/findings restart sonrası korunur ve canonical event identity ile deduplicate edilir.
- Email transport Resend-compatible HTTP API kullanır; HTML escape, evidence template ve failed-delivery retry uygulanmıştır.
- 7 dosyada 30 backend testi geçer; 101 normal + 1 suspicious event, duplicate cycle, provider failure retry ve process restart kapsanır.
- Real RPC backfill transaction hash girdisi olmadan event-only seed'i otomatik bulup `SUSPICIOUS_EVENT` üretti.
- Resend test sender üzerinden gerçek API acceptance başarıyla doğrulandı; pending finding `alerted_at` ile tamamlandı. Inbox görünürlüğü kullanıcı teyidi bekler.

## Public backend deployment

- Railway signup kapalı olduğu için Render seçildi.
- `render.yaml` ücretsiz Node web service, Frankfurt region, ephemeral `/tmp/ghostguard.db`, public config ve dashboard-entered secrets içerir. Ücretsiz host restart/spin-down durumunda SQLite verisi kaybolabilir ve watcher durur.
- `/health/live` RPC-independent liveness endpoint'i eklendi ve testlidir.
- Render service live: `https://ghostguard-backend-kmrj.onrender.com`.
- Public `/health/live`, Monad-aware `/health` ve iki gerçek transaction analyze isteği doğrulandı; sonuçlar sırasıyla `VERIFIED_DEMO_TRANSFER` ve `SUSPICIOUS_EVENT`.
- Public frontend URL belirlendiğinde `CORS_ORIGINS` Render environment değerine eklenmelidir.

## Frontend/backend entegrasyonu

- Quick Demo gerçek transfer ve event-only hash'lerini kullanır; varsayılan olarak public API'ye gider.
- Recorded fallback sadece doğrulanmış iki response içerir ve UI'da açıkça recorded olarak etiketlenir.
- Frontend `GET /api/v1/findings` ile history recovery ve `WS /api/v1/events` ile live update uygular.
- Backend aynı endpoint'leri SQLite store ve in-process finding broker üzerinden sağlar.
- `GET /` Render base URL'sinde servis ve endpoint bilgisini döndürür.
- Root `npm run check`: frontend 16 test, backend 38 test; lint, typecheck ve production build başarılı.
- Render deploy `dep-dbe9m8vavr4c73a655a0` live; servis branch'i `main`, health check `/health/live`.
- Public root, health, iki gerçek analyze cevabı, iki persisted finding ve allowed-origin WebSocket handshake doğrulandı.

## Unified Render deployment

- PR #12 / merge `08c2059`, Fastify'ın built Vite dashboard'u ve API'yi aynı process/origin üzerinden sunmasını sağlar.
- Yeni project `ghostguard-unified`, Production environment içinde tek free web service içerir.
- Public URL: `https://ghostguard-unified.onrender.com`; API bilgisi `/api`, health `/health`, endpoints `/api/v1/*` altındadır.
- Email-enabled deploy `dep-dbea40oae00c73cf5d0g` live; dashboard HTML/assets, health, findings, iki gerçek analyze sonucu ve same-origin WebSocket doğrulandı.
- Kullanıcının açık onayıyla Resend ayarları aktarıldı; watcher suspicious finding için email delivery logunu üretti.

## Tasarım sınırları

- Request içindeki `expectedTokenAddress` server-side trusted config'i override etmez.
- Trusted config yoksa request adresi comparison context olabilir, verified kararı üretmez.
- Reverted receipt için findings boş kalır; başarı uydurulmaz.
- Balance-delta kontrolü henüz yok; ilgili check `UNKNOWN`.
- Unknown emitter `NEEDS_REVIEW`; fraud etiketi verilmez.

## Çalıştırma

```bash
npm install
# MONAD_RPC_URL ve gerekli public config'i güvenli environment üzerinden sağla
npm run dev:backend
```

Doğrulama:

```bash
npm audit --audit-level=moderate
npm run check
```

## Blocker'lar

- Resend API key güvenlik rotasyonu ve yeni key'in unified servise yazılması bekliyor.
- Eski ayrı frontend/backend Render servisleri silinmedi.

## Sonraki görevler

1. **Salik:** Resend API key'i rotate et; unified serviste güncelleyip live email'i tekrar doğrula.
2. **Ortak:** 90 saniyelik demo provası ve backup ekran kaydı hazırla.
3. **Operasyon:** Kullanıcı isterse eski ayrı Render servislerini kaldır.

## Resume protokolü

`AGENTS.md` → `docs/PROJECT_CONTEXT.md` → bu dosya → `docs/STATUS.md` → `docs/PLAN.md` → `docs/API_CONTRACT.md` okuyun. Sonra:

```bash
git status --short --branch
git log -5 --oneline --decorate
npm run check
```

Diğer geliştiricinin owned dizinini koordinasyonsuz değiştirmeyin.

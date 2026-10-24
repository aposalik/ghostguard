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
- Backend branch: `feature/backend-analyzer`
- Base: `511a866` (`origin/main`)
- Backend commit konusu: `feat: add deterministic receipt analyzer API`
- Backend branch push/PR: yapılmadı
- Zincir deployment: yok

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

- Public frontend URL yok; public backend live.
- Findings HTTP/WebSocket delivery uçları henüz yok.

## Sonraki üç görev

1. **Fahad + Salik:** Public frontend entegrasyonunu gerçek iki hash ve Render backend URL'siyle doğrula; frontend origin'ini CORS'a ekle.
2. **P1:** Findings HTTP/WebSocket uçlarını tamamla.
3. **Operasyon:** Ücretsiz hostun spin-down ve ephemeral SQLite sınırlamalarını demo akışında belgeleyip doğrula.

## Resume protokolü

`AGENTS.md` → `docs/PROJECT_CONTEXT.md` → bu dosya → `docs/STATUS.md` → `docs/PLAN.md` → `docs/API_CONTRACT.md` okuyun. Sonra:

```bash
git status --short --branch
git log -5 --oneline --decorate
npm run check
```

Diğer geliştiricinin owned dizinini koordinasyonsuz değiştirmeyin.

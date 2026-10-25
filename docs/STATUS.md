# Güncel Durum

**Tarih:** 2026-10-24

**Unified deployment merge commit'i:** `08c2059` (`main`, PR #12)

**Render deploy:** `dep-dbea40oae00c73cf5d0g` (`live`)

**Sahiplik:** Fahad frontend; Salik backend/contracts

## Çalışan

### Ortak / frontend baseline

- Monorepo, ortak TypeScript API tipleri ve proje belgeleri mevcut.
- Fahad'ın dashboard PR'ı incelendi; semantic düzeltmeler corrective PR #8 ile `main` branch'ine merge edildi.
- Dashboard gerçek iki Monad transaction'ını Quick Demo olarak kullanır, live API'yi varsayılan seçer ve yalnızca açık etiketli recorded response fallback'i sunar.
- Backend health, findings geçmişi, WebSocket reconnect/backoff ve HTTP recovery frontend'de uygulanmıştır.

### Portfolio Home + Try It redesign — local branch

- Branch: `feature/home-try-redesign`; henüz push/deploy edilmedi.
- Yeni `/` Home deneyimi problem, method, shipped proof, detection loop, team ve roadmap bölümleriyle projeyi portfolio formatında anlatır.
- Canlı Monad analyzer ayrı `/#/try-it` deneyimine taşındı; hash route unified static hostta server rewrite gerektirmez.
- Home ve Try It ortak acid-lime/deep-olive/orange/cream görsel sistemi, condensed/editorial tipografi, print-grid texture, hard-shadow kartlar ve reduced-motion fallback kullanır.
- Idle, live feed ve gerçek `SUSPICIOUS_EVENT` result state'i desktop; Home/Try It hero'ları 500 px mobilde görsel olarak doğrulandı.
- 2026-10-25 local final check: frontend 16 test, backend 45 test, lint/typecheck ve iki production build geçti; npm audit 0 vulnerability.
- Kullanıcının önceden değiştirdiği `LICENSE` bu branch'te korunur fakat redesign commit kapsamına alınmayacaktır.

### Account Agent Mode — local implementation

- Try It artık transaction-hash-first form yerine account address + Agent Mode toggle kullanır.
- SQLite `account_watches` ve `account_activities` tabloları watch state ve geçmişi restart sonrasında korur; pause history silmez.
- Watcher finalized ERC-20 loglarını ve aktivasyon sonrası top-level native transfer/contract call'ları tarar. Internal trace transferları henüz kapsam dışıdır.
- Activity model direction (`INCOMING`/`OUTGOING`/`SELF`) ile trust verdict'ini (`CONFIRMED`/`SUSPICIOUS`/`NEEDS_REVIEW`/`REVERTED`) ayrı tutar.
- `PUT /api/v1/monitoring/accounts/:address`, account/activity GET endpointleri ve `activity.created` WebSocket frame'i eklendi.
- Evidence Inspector animated account graph'tır: incoming green, outgoing yellow, suspicious red, needs-review violet. Stored Transactions listesi SQLite geçmişini gösterir.
- Geçici SQLite üzerinde iki gerçek Monad logu kalıcı activity olarak doğrulandı: bir confirmed ve bir suspicious; Agent Mode pause/resume sonrasında history count korunarak `2` kaldı.
- Desktop ve 500 px mobile active-account ekranları görsel incelemeden geçti.

### Backend ilk dikey dilim

- Fastify uygulaması ve CORS allowlist.
- `GET /health`: RPC chain ID probe, `ok`/`degraded` sonucu.
- `POST /api/v1/transactions/analyze`: request validation ve canonical error response.
- Timeout'lu Ethereum JSON-RPC client (`eth_chainId`, `eth_getTransactionReceipt`).
- Receipt success/revert ayrımı.
- ERC-20 `Transfer` topic, indexed from/to ve uint256 amount decode.
- Gerçek `log.address` ile configured `DemoToken` / `DemoEventOnly` karşılaştırması.
- Unknown emitter için `NEEDS_REVIEW`; otomatik fraud iddiası yok.
- Malformed upstream receipt ve RPC hataları güvenli `RPC_UNAVAILABLE` yoluna alınır.

### Foundry demo sözleşmeleri

- Foundry 1.8.6 (`forge`, `cast`, `anvil`) kullanılabilir.
- Solidity 0.8.28 ve optimizer ayarları `foundry.toml` içinde sabitlendi.
- `DemoToken` minimal ERC-20 davranışıyla gerçek balance değişimi ve `Transfer` event'i üretir.
- `DemoEventOnly`, token state tutmadan owner-gated `Transfer` biçimli event üretir.
- Testler gerçek transfer balance/event kanıtını, event-only sırasında değişmeyen token balance'larını ve yetkisiz çağrı reddini ayrı doğrular.

### Monad Testnet deployment hazırlığı

- Resmî Monad Testnet chain ID `10143`, RPC `https://testnet-rpc.monad.xyz` olarak doğrulandı.
- Live read-only RPC probe chain ID `10143` ve blok `73784660` döndürdü.
- `DeployAndSeed.s.sol` iki contract'ı deploy edip gerçek transfer ve event-only seed çağrısını tek kontrollü akışta hazırlar.
- Script local EVM'de ve Monad Testnet RPC üzerinde broadcast edilmeden başarıyla simüle edildi.
- RPC simülasyonu 767094 tahmini gas ve yaklaşık 0.154952988 testnet MON üst sınırı hesapladı; bu gerçek harcama veya zincir işlemi değildir.

### Monad Testnet deployment ve gerçek API doğrulaması

- `DemoToken`: `0x21A48A0f107BaF3DC2eDA13e4aB6B7e624397639`.
- `DemoEventOnly` (Seed): `0xa7836d1245593d16929a3Eea3Aa34461EF08F474`.
- `DemoEventOnly` (Live Spoofer): `0xE8c493C05C08ab458391af1D71e1B8939fd5a392` (Tx: `0x21a8a63f9f0360b8a05266210191dbdceeb3ea2799cffa5ad87b6c2d6ae139b2`).
- Gerçek transfer tx `0x22b9eb3a62f096515a44a319fc119ea4411c1fb3c2652915497ecd4df57f6d1f` başarılı; recipient `25 GGD` aldı.
- Event-only tx `0x321987f432eefd92503aadd386a18d4c7df518653046cdb9e37b54e8cbde07c4` başarılı; DemoToken balance değiştirmedi.
- Local backend gerçek RPC üzerinde sırasıyla `VERIFIED_DEMO_TRANSFER` ve `SUSPICIOUS_EVENT` döndürdü.
- **2026-10-25 100-Transaction Storm Doğrulaması:** `scripts/flood_transactions.py` ile 25 rastgele cüzdan oluşturuldu; 100 adet işlem (40x Spoofed Fake Transfer, 30x Incoming MON, 30x Outgoing MON) paralel olarak 1.74 saniyede Monad Testnet'e broadcast edildi ve 100/100 başarıyla onaylandı. Monitored hesap `0x351deba8041a4359399c5af0e11f8e66ed300492` canlı workbench üzerinde tüm incoming, outgoing ve red suspicious event'leri anlık yakaladı.

### P1 watcher, persistence ve email altyapısı

- Finalized head'e kadar bounded HTTP `eth_getLogs` polling uygular; monitored wallet'ları hem indexed `from` hem `to` topic'inde tarar.
- SQLite `watcher_state` ve `findings` tabloları restart recovery sağlar.
- Canonical `chainId:transactionHash:logIndex` identity ve DB unique constraint tekrar finding/email üretimini engeller.
- RPC/analyzer hatasında tamamlanmamış range checkpoint edilmez; sonraki cycle yeniden dener.
- `SUSPICIOUS_EVENT` ve `NEEDS_REVIEW` email queue'suna girer; provider hatasında `alerted_at` boş kalır ve sonraki cycle aynı provider idempotency key'iyle tekrar denenir.
- Email HTML'i zincir kaynaklı alanları escape eder ve classification/emitter/reason/explorer linki içerir.
- Gerçek Monad backfill testi transaction hash verilmeden event-only seed'i otomatik buldu.
- Public RPC `1000` blok sorgusuna HTTP 413 verdiği için varsayılan range `100` blok olarak sınırlandı.
- Resend test sender ile pending `SUSPICIOUS_EVENT` email'i provider tarafından kabul edildi; SQLite `alerted_at` alanı acceptance sonrası yazıldı. Inbox görünürlüğü kullanıcı tarafından doğrulanmalıdır.
- `GET /api/v1/findings` bulguları `analyzedAt DESC, id DESC` sırasıyla opaque cursor üzerinden sayfalar.
- `WS /api/v1/events`, watcher'ın yeni kaydettiği bulguları `finding.created` olarak yayınlar ve browser origin allowlist'ini uygular.
- Public base URL için servis/endpoints bilgisi döndüren `GET /` eklendi.

### Public backend

- Railway signup geçici olarak kapalı olduğu için hedef Render web service olarak değiştirildi.
- Kullanıcının sıfır maliyet tercihi nedeniyle root `render.yaml` ücretsiz planı, ephemeral `/tmp/ghostguard.db` SQLite yolunu ve secret prompt'larını tanımlar; restart/spin-down veriyi silebilir ve watcher'ı durdurabilir.
- RPC'den bağımsız `GET /health/live` endpoint'i hosting liveness probe'u için eklendi.
- Render service `https://ghostguard-backend-kmrj.onrender.com` üzerinde live. Public `/health/live` ve `/health` başarılı; chain ID `10143`.
- Gerçek token işlemi public API'de `VERIFIED_DEMO_TRANSFER`, event-only işlemi `SUSPICIOUS_EVENT` verdi. Watcher iki bulguyu da startup backfill sırasında kaydetti.
- Render servisi artık `main` branch'inden deploy olur ve health check olarak `/health/live` kullanır.
- Public `GET /` servis bilgisini, `GET /api/v1/findings` gerçek iki persisted finding'i döndürdü; allowed-origin WebSocket handshake başarılı oldu.

### Unified public deployment

- Yeni Render project: `ghostguard-unified`; tek free web service `main` branch'inden deploy olur.
- Public URL `https://ghostguard-unified.onrender.com`; `/` dashboard HTML, `/api` servis bilgisi sunar.
- Production frontend aynı-origin HTTP ve WebSocket yollarını kullanır; ayrı frontend/backend CORS bağımlılığı kaldırıldı.
- Public health chain ID `10143`; iki gerçek finding history'de göründü; gerçek ve event-only transaction'lar doğru sınıflandırıldı.
- Same-origin public WebSocket handshake başarılı oldu.
- Kullanıcının açık onayıyla üç Resend email setting'i unified servise aktarıldı ve `EMAIL_ENABLED=true` yapıldı.
- Watcher backfill sonrası suspicious finding için `Watcher delivered an email alert` logu doğrulandı.

## Doğrulanan komutlar

2026-10-24:

```bash
forge fmt --check --root contracts
forge lint --root contracts
forge test --root contracts -vv
forge script script/DeployAndSeed.s.sol:DeployAndSeed --sig "run(address,uint256,uint256)" <local-test-values> --offline
forge script script/DeployAndSeed.s.sol:DeployAndSeed --sig "run(address,uint256,uint256)" <test-values> --rpc-url monad_testnet
npm audit --audit-level=moderate
npm run lint --workspace @ghostguard/backend
npm run typecheck --workspace @ghostguard/backend
npm run test --workspace @ghostguard/backend
npm run build --workspace @ghostguard/backend
```

Sonuç:

- Foundry format ve lint kontrolleri geçti; 3 contract testi geçti.
- Deployment+seed script'i local ve chain 10143 RPC üzerinde broadcast edilmeden geçti.
- Backend 7 dosyada 38 test geçti; watcher yüz normal event + bir suspicious event, dedup, retry, restart recovery, findings pagination ve WebSocket senaryolarını kapsar.
- Real-RPC watcher backfill'i `0x321987...07c4` işlemini otomatik `SUSPICIOUS_EVENT` buldu.
- npm audit: 0 vulnerability.
- Backend lint: 0 warning / 0 error.
- Production ve test TypeScript graph'ları geçti.
- 4 test dosyasında 21 test geçti.
- Backend production build geçti.

Final root `npm run check` geçti: frontend 16 test + backend 40 test, iki workspace için lint/typecheck/build başarılı.

## Kısmi

- Analyzer hem fixture/fake RPC hem gerçek Monad RPC üzerindeki iki seed transaction ile doğrulandı.
- `TOKEN_STATE_SUPPORTS_CLAIM` bilinçli olarak `UNKNOWN`; balance-delta kanıtı henüz uygulanmadı.
- Frontend ve backend tek public origin üzerinde entegre ve doğrulandı.

## Henüz yok / blocker

1. Önceki ayrı `ghostguard-backend` ve `ghostguard-frontend` servisleri kullanıcı onayı olmadan silinmedi.
2. Resend API key güvenlik için rotasyon bekliyor; yeni key sonrası unified service değeri güncellenmeli.

## Git/TLS notu

Remote fetch, TLS doğrulaması kapatılmadan mevcut güvenilir bundle ile yapıldı. Backend branch push edildi.

## Hemen sonraki iş

- Resend API key'i rotate et ve unified service değerini yeni key ile güncelle.
- 90 saniyelik demo provası ve backup screenshot/video hazırla.

## İki ajanlı gerçek işlem testi — yerel implementasyon

- `feature/transaction-agents` branch'inde capped gerçek transaction producer eklendi.
- Producer `DemoToken.transfer` yollarını ve her N işlemde bir `DemoEventOnly.emitTransfer` yolunu kullanır; kayıtlı fixture üretmez.
- Producer default kapalı, 10 tx/s hard cap ve zorunlu finite işlem bütçesiyle korunur.
- Mevcut `TransferWatcher`, Detector & Notifier ajanı olarak runtime sayaçları ve email-enabled durumunu raporlar.
- `GET /api/v1/agents/status` iki ajanı credential sızdırmadan sunar.
- Dashboard demo presetleri, recorded fallback, offline simulation banner'ı ve sahte live-event butonları kaldırıldı; history yalnızca HTTP/WS backend verisinden gelir.
- Local unified build port 3100'da `/`, `/health/live` ve `/api/v1/agents/status` ile smoke-test edildi; producer bilinçli olarak disabled tutuldu ve zincir işlemi gönderilmedi.
- Final `npm run check`: frontend 16 test, backend 45 test; lint, strict typecheck ve iki production build geçti.
- Public aktivasyon için `ghostguard-deployer` private key'inin Render secret olarak kullanıcı tarafından girilmesi gerekir; key chat/repo/log'a konmamalıdır. Aynı signer mevcut `DemoEventOnly` owner'ıdır.

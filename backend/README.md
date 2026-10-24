# GhostGuard Backend

**Sahip: Salik (@aposalik, Developer B).** Fastify, strict TypeScript ve doğrudan Ethereum JSON-RPC kullanır.

## Mevcut dikey dilim

- `GET /health`: RPC chain ID kontrolü; `200 ok` veya `503 degraded`.
- `POST /api/v1/transactions/analyze`: receipt getirir, ERC-20 `Transfer` imzalı logları decode eder ve configured demo adreslerine göre deterministik sınıflandırır.
- `VERIFIED_DEMO_TRANSFER`: decoded log gerçek, configured `DemoToken` emitter'ından gelir.
- `SUSPICIOUS_EVENT`: decoded log configured `DemoEventOnly` emitter'ından gelir.
- `NEEDS_REVIEW`: emitter bilinmiyor veya log alanları decode edilemiyor.
- Revert receipt: transaction `REVERTED`, finding listesi boş; başarılı transfer iddiası üretilmez.
- Opsiyonel finalized-block watcher, monitored wallet'ları indexed `from` ve `to` topic'lerinde tarar.
- SQLite checkpoint/findings ile restart recovery ve `chainId:txHash:logIndex` deduplication sağlar.
- `SUSPICIOUS_EVENT` ve `NEEDS_REVIEW` bulguları için opsiyonel email gönderir; başarısız gönderimler SQLite'ta pending kalır.

Bu aşama balance-delta kontrolü yapmaz; `TOKEN_STATE_SUPPORTS_CLAIM` sonucu bilinçli olarak `UNKNOWN` kalır. Bilinmeyen emitter “fraud” ilan edilmez.

## Çalıştırma

Root'ta `.env.local` yerine shell/host secret ayarlarıyla aşağıdaki değişkenleri sağlayın. Secret değerleri komuta veya repoya yazmayın.

- `MONAD_RPC_URL` — zorunlu HTTP(S) RPC URL
- `TRUSTED_DEMO_TOKEN_ADDRESS` — opsiyonel; doğrulanmış DemoToken adresi
- `DEMO_EVENT_ONLY_ADDRESS` — opsiyonel; kontrollü event-only demo adresi
- `CORS_ORIGINS` — virgülle ayrılmış frontend origin listesi; varsayılan `http://localhost:5173`
- `PORT` — varsayılan `3000`
- `RPC_TIMEOUT_MS` — varsayılan `10000`
- `WATCH_ENABLED` — watcher'ı açmak için `true`
- `MONITORED_WALLET_ADDRESSES` — virgülle ayrılmış public wallet adresleri
- `WATCH_START_BLOCK` — ilk backfill bloğu; boşsa ilk cycle'ın finalized head bloğundan başlar
- `WATCH_CONFIRMATIONS` — varsayılan `5`
- `WATCH_BLOCK_RANGE` — tek RPC sorgusundaki azami blok aralığı; public Monad RPC limiti için varsayılan `100`
- `WATCH_POLL_INTERVAL_MS` — varsayılan `3000`
- `DATABASE_URL` — varsayılan `./data/ghostguard.db`
- `EMAIL_ENABLED` — email delivery için `true`; watcher da açık olmalıdır
- `EMAIL_API_URL`, `EMAIL_API_KEY`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO` — Resend-compatible email API ayarları
- `MONAD_EXPLORER_URL` — email içindeki transaction link tabanı

```bash
npm run dev:backend
```

Backend, trusted address tanımlı değilse kullanıcıdan gelen `expectedTokenAddress` değerini yalnızca karşılaştırma bağlamı olarak gösterir; bu değer tek başına `VERIFIED_DEMO_TRANSFER` üretemez.

## Doğrulama

```bash
npm run lint --workspace @ghostguard/backend
npm run typecheck --workspace @ghostguard/backend
npm run test --workspace @ghostguard/backend
npm run build --workspace @ghostguard/backend
```

Email kapalıyken watcher bulguları kaydeder fakat dış mesaj göndermez. Email secret'larını `.env.example`, Git veya komut geçmişine yazmayın.

## Sonraki backend adımları

1. Foundry sözleşmeleri ve testleri.
2. Monad Testnet deployment + doğrulanmış iki seed transaction.
3. Gerçek RPC integration testi ve public backend deployment.
4. Public host üzerinde watcher/email operational doğrulaması.
5. Bulgular için HTTP pagination ve WebSocket delivery.

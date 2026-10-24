# Mimari

## Sistem görünümü

```text
Monad Testnet RPC
       │ receipt, logs, block range
       ▼
Backend Watcher ── checkpoint/retry ──► SQLite
       │                                   │
       ▼                                   │
Deterministic Analyzer ── findings ────────┘
       │
       ├──► Grounded Explanation Layer
       │
       └──► HTTP API / WebSocket ──► React Dashboard
```

## Uygulama durumu

Receipt/log analyzer gerçek Monad seed işlemleriyle doğrulanmıştır. Finalized-block polling watcher, SQLite checkpoint/findings ve retry edilebilir email transport uygulanmıştır. Gerçek RPC backfill'i kontrollü suspicious event'i transaction hash girdisi olmadan bulmuştur. Dashboard, HTTP API ve WebSocket aynı public Render servisi üzerinde doğrulanmıştır. Balance-state check uygulanana kadar bu kanıt `UNKNOWN` kalır.

## Bileşen sorumlulukları

### Frontend

- Transaction hash ve opsiyonel beklenen token adresini alır.
- API'nin döndürdüğü receipt, emitter, kontrol sonuçları ve sınıflandırmayı gösterir.
- Backend erişilemezse veya hash geçersizse açık hata sunar; yerel olarak güvenlik bulgusu üretmez.
- WebSocket hazır olana kadar live feed alanı kontrollü boş durum gösterir.

### Watcher

- Konfigüre edilen adresler/blok aralıkları için log toplar.
- Son tamamlanan blok checkpoint'ini kalıcı saklar.
- Yeniden başlatmada checkpoint'ten güvenli tekrar payıyla tarama yapar.
- `chainId:transactionHash:logIndex` kimliği ve DB unique constraint ile tekrarları idempotent işler.
- WebSocket kopmasında exponential backoff sonrası yeniden bağlanır; HTTP range backfill ile boşluğu kapatır.

### Analyzer

Girdiyi RPC'den yeniden doğrular; kullanıcı tarafından verilen receipt/log verisine güvenmez.

Önerilen sıra:

1. Transaction bulunamadıysa bekleme/not-found sonucu döndür.
2. Receipt revert olduysa `FAILED_TRANSACTION` sınıflandır.
3. Transfer imzasına sahip her log için gerçek `log.address` değerini kaydet.
4. ABI uyumluysa `from`, `to`, `amount` alanlarını decode et.
5. `log.address`, beklenen demo token adresiyle eşleşiyorsa ve gerekli ek kanıtlar tutarlıysa `VERIFIED_DEMO_TRANSFER` ver.
6. Event, kontrollü event-only demo sözleşmesinden geliyorsa `SUSPICIOUS_EVENT` ver.
7. Diğer bilinmeyen/eksik kanıtlarda `NEEDS_REVIEW` ver.

`SUSPICIOUS_EVENT` genel olarak “bu token dolandırıcıdır” anlamına gelmez; iddia edilen DEMO transferinin bu logla doğrulanamadığını ifade eder.

### Explanation layer

Sadece yapılandırılmış finding alanlarını şablonla açıklar. İsteğe bağlı AI sağlayıcısı eklenirse model yeni sınıflandırma üretemez; transaction hash, emitter veya kontrol sonucu icat edemez. Model yoksa deterministik metin kullanılabilir.

## Veri modeli

Önerilen minimum tablolar:

- `watcher_state(chain_id, stream_key, last_finalized_block, updated_at)`
- `transactions(chain_id, transaction_hash, receipt_status, block_number, analyzed_at)`
- `findings(id, chain_id, transaction_hash, log_index, block_number, classification, actual_emitter, expected_token, explanation, analyzed_at)`
- `checks(finding_id, code, outcome, label, detail)`

`findings(chain_id, transaction_hash, log_index)` için unique constraint zorunludur. Büyük sayılar DB ve JSON sınırında kayıpsız decimal string olarak taşınır.

## Güvenlik sınırları

- Browser RPC'ye güvenlik kararı için doğrudan güvenmez; karar backend'de verilir.
- RPC ve blockchain metadata dış/güvenilmeyen girdidir.
- Trusted-token allowlist deployment config'idir; kullanıcı girdisiyle sessizce değişmez.
- Cüzdan imzası veya private key GhostGuard backend/frontend kapsamına girmez.
- Hosted backend olmadan “always-on live monitor” iddiası yapılmaz.

## Deployment topolojisi

- Tek Render web service, build sırasında Vite dashboard'u ve Node backend'i üretir.
- Fastify `/` ve `/assets/*` üzerinden dashboard'u; `/health`, `/api` ve `/api/v1/*` üzerinden backend'i sunar.
- Frontend production çağrıları aynı origin'i kullanır; WebSocket `wss://<same-host>/api/v1/events` adresine bağlanır.
- RPC: Monad Testnet endpoint.
- Free Render instance ve `/tmp` SQLite ephemeral'dır; restart/spin-down persistence ve always-on izleme garantisi vermez.
- Public URL: `https://ghostguard-unified.onrender.com`.

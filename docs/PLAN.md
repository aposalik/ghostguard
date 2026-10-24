# Uygulama Planı ve Görev Dağılımı

## Sahiplik

- **Fahad (@MFahadFaisal):** `frontend/`, UI/UX, API tüketimi, responsive davranış, public frontend ve sunum.
- **Salik (@aposalik):** `backend/`, `contracts/`, Foundry testleri, RPC/analyzer, testnet ve public backend.
- **Ortak:** `shared/types/index.ts` ve `docs/API_CONTRACT.md`; kırıcı değişiklik birlikte koordine edilir.

Durumlar: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`. `DONE` yalnızca komut veya gözlenebilir kanıtla kullanılır.

## Faz kontrolü — önerilen yürütme sırası

Önceki sıra analyzer'ı testnet deployment sonrasına bırakıyordu. Buna gerek yoktur: analyzer ve API fixture/fake RPC ile sözleşmelerden bağımsız geliştirilebilir. Bu nedenle iki paralel hat kullanılır:

```text
Backend:  B1 Contracts ──► B3 Testnet deploy ──► B4 Real-RPC/public backend
              ╲                                      ▲
               └──── B2 Fixture analyzer/API ────────┘

Frontend: F1 Evidence/demo UI ──► F2 API integration ──► F3 Public frontend
                                                        │
Common:                   90-second end-to-end demo ◄────┘
```

Kritik yol: **B1 + B2 → B3 → B4 → F2 final doğrulama → F3 → demo provası.** F1, B1 ve B2 paralel ilerler.

---

## Fahad — Frontend

### F1 — Kanıt UI ve Quick Demo Switcher (P0, `DONE`)

- Classification rozetleri, emitter/expected address ve explorer linklerini görünür yap.
- İki Quick Demo butonunu env/config üzerinden gelecek gerçek tx hash'lerine bağlanmaya hazırla.
- Backend adresleri gelmeden hash veya sonuç uydurma; butonları “awaiting deployment” durumunda tut.
- **Kabul:** Gerçek iki hash sağlandığında kod değişmeden/yalnızca env ile iki senaryo çalışır.

> Geçmiş analiz listesi ve sürekli live monitor, backend persistence/WebSocket'e bağlı olduğu için P1/F4 kapsamındadır; P0 kabul kriterini bloke etmez.

### F2 — API entegrasyonu ve hata yönetimi (P0, `DONE`)

- `GET /health` ve `POST /api/v1/transactions/analyze` entegrasyonu.
- 400/404/503 hata şekillerini güvenli ve anlaşılır göster.
- Tekrar dene akışı ve degraded backend durumu.
- Offline fallback kullanılırsa yalnızca versioned/gerçek transaction response fixture'ı ve açık **Recorded demo** etiketi kullan; canlı sonuç gibi gösterme.
- **Kabul:** Local backend fixture testinde success/reverted/not-found/RPC-down durumları UI'ı çökertmez.

### F3 — Public frontend ve responsive doğrulama (P0, `DONE`)

- Vercel/Cloudflare Pages production build.
- 375 px ve 500 px kontrolleri.
- `npm run check` sıfır hata.
- **Kabul:** Harici cihazdan HTTPS URL açılır ve public backend'e erişir.

### F4 — Findings feed, WebSocket ve bildirimler (P1, `DONE`)

- `GET /api/v1/findings` ve `WS /api/v1/events`.
- Reconnect/backoff ve HTTP recovery.
- Gerçek iki testnet transaction'ı recorded fallback olarak açık etiketle gösterilir; varsayılan akış live API'dir.

---

## Salik — Backend ve Contracts

### B1 — Foundry demo sözleşmeleri (P0, `DONE`)

- `DemoToken.sol`: gerçek ERC-20 balance değişimi.
- `DemoEventOnly.sol`: kontrollü transfer-shaped event, token state değişimi yok.
- Unit testlerde balance ve event kanıtlarını ayrı assert et.
- `DemoToken` gerçek balance değişimi ve ERC-20 `Transfer` event'i üretir.
- `DemoEventOnly` owner-gated biçimde aynı event şeklini token state olmadan üretir.
- 3 Foundry testi gerçek balance/event ayrımını ve yetkisiz event reddini doğrular.
- **Kabul:** `forge fmt --check` ve `forge test` geçer.

### B2 — Fixture tabanlı analyzer ve Fastify API (P0, `DONE`)

Tamamlanan ilk dilim:

- Validated env config ve timeout'lu JSON-RPC client.
- Receipt status + gerçek `log.address` incelemesi.
- Transfer topic/from/to/amount decode.
- Configured DemoToken/EventOnly adreslerine göre deterministik classification.
- `GET /health`, `POST /api/v1/transactions/analyze`, canonical API errors ve CORS allowlist.
- 4 test dosyasında 21 unit/API testi.

- Gerçek Monad RPC üzerinde iki seed tx aynı API şemasında doğru ayrıldı.
- Aynı blok bağlamında token-state/balance kanıtı uygulanana kadar ilgili check `UNKNOWN` kalır; kontrollü demo emitter kanıtı doğrulandı.
- **Kabul:** Fixture testleri ve iki gerçek seed tx aynı API şemasında doğru ayrılır.

### B3 — Monad Testnet deployment ve seed işlemler (P0, `DONE`)

- B1 sonrası iki sözleşmeyi disposable testnet wallet ile deploy et.
- Bir gerçek token transferi ve bir event-only işlem üret.
- Chain ID, contract adresleri, tx hash'leri ve explorer linklerini doğrula.
- `TRUSTED_DEMO_TOKEN_ADDRESS` ve `DEMO_EVENT_ONLY_ADDRESS` deployment config'e ekle.
- Resmî RPC/chain bilgisi ve live chain ID doğrulandı; deployment+seed script'i local ve gerçek RPC üzerinde broadcast edilmeden simüle edildi.
- İki contract deploy edildi; gerçek transfer ve event-only seed transaction'ları RPC ve API üzerinden doğrulandı.
- **Kabul:** Explorer ve RPC iki işlemi aynı chain'de gösterir.

### B4 — Gerçek RPC doğrulaması ve public backend (P0, `DONE`)

- B2'yi B3'ün gerçek adres/hash'leriyle integration test et.
- Render/Railway/Fly.io benzeri long-running hostta HTTPS backend.
- Fahad'ın kesin frontend origin'ini CORS allowlist'e ekle.
- Ücretsiz Render web service `https://ghostguard-backend-kmrj.onrender.com` üzerinde live; `/health/live`, `/health` ve iki gerçek analyze isteği dış ağdan doğrulandı.
- Public frontend URL oluştuğunda mevcut localhost CORS origin'i genişletilecek. Ücretsiz planda SQLite verisi ephemeral ve watcher uyku sırasında durur.
- **Kabul:** Public `/health` ve iki analyze isteği dış ağdan çalışır. **PASSED**

### B5 — Persistence, watcher ve notifications (P1, `DONE`)

- SQLite findings + checkpoint. **DONE**
- Idempotent `chainId:txHash:logIndex` kayıtları. **DONE**
- Finalized-block polling, bounded range backfill ve restart recovery. **DONE**
- Monitored wallet için indexed `from`/`to` topic taraması. **DONE**
- `SUSPICIOUS_EVENT`/`NEEDS_REVIEW` email transport, template ve retry queue. **DONE; live Resend API acceptance doğrulandı**
- `GET /api/v1/findings` opaque cursor pagination. **DONE**
- `WS /api/v1/events` yeni finding delivery ve CORS-origin kontrolü. **DONE**

### B6 — Gerçek işlem üretici ve iki ajan görünürlüğü (P1, `IN PROGRESS`)

- Capped `TransactionProducer`, gerçek `DemoToken.transfer` ve periyodik `DemoEventOnly.emitTransfer` çağrılarını imzalar. **DONE (local code/tests)**
- Public-chain güvenlik sınırı: en fazla 10 tx/s ve process başına zorunlu 1–10000 işlem bütçesi. **DONE**
- Producer varsayılan kapalıdır; private key yalnızca host secret olarak verilir. **DONE**
- Detector ve producer durumları `GET /api/v1/agents/status` üzerinden yayınlanır. **DONE (local)**
- Frontend recorded fallback, preset ve client-side fake event tetiklerini kaldırır; yalnızca live API/WS verisi gösterir. **DONE (local)**
- Gerçek producer aktivasyonu, owner signer secret'i, kesin rate/bütçe ve deploy onayı bekler. **BLOCKED / user input**

---

## P0 durum matrisi

| İş | Sahip | Bağımlılık | Durum | Kanıt / kabul |
|---|---|---|---|---|
| Monorepo ve ortak tipler | Ortak | Yok | DONE | Root check geçti |
| Dashboard foundation | Fahad | Ortak tipler | DONE | Frontend lint/typecheck/test/build |
| Demo sözleşmeleri | Salik | Foundry | DONE | `forge fmt --check`; 3 Foundry testi geçti |
| Fixture analyzer/API | Salik | Ortak tipler | DONE | 21 test + iki gerçek tx API doğrulaması |
| Testnet deployment/seed tx | Salik | B1 | DONE | Chain 10143; iki contract + iki seed tx doğrulandı |
| Quick Demo + final API UI | Fahad | B2/B3 | DONE | Gerçek hashler + live/recorded ayrımı |
| Public backend | Salik | B2/B3 | DONE | Free Render service live; health + iki gerçek analyze doğrulandı |
| Public frontend | Fahad | B4 | DONE | Unified Render HTTPS UI + same-origin API/WS doğrulandı |
| 90 saniyelik demo | Ortak | Tüm P0 | TODO | İki tx doğru ayrılır |

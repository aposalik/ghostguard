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

### F1 — Kanıt UI ve Quick Demo Switcher (P0, `IN PROGRESS`)

- Classification rozetleri, emitter/expected address ve explorer linklerini görünür yap.
- İki Quick Demo butonunu env/config üzerinden gelecek gerçek tx hash'lerine bağlanmaya hazırla.
- Backend adresleri gelmeden hash veya sonuç uydurma; butonları “awaiting deployment” durumunda tut.
- **Kabul:** Gerçek iki hash sağlandığında kod değişmeden/yalnızca env ile iki senaryo çalışır.

> Geçmiş analiz listesi ve sürekli live monitor, backend persistence/WebSocket'e bağlı olduğu için P1/F4 kapsamındadır; P0 kabul kriterini bloke etmez.

### F2 — API entegrasyonu ve hata yönetimi (P0, `IN PROGRESS`)

- `GET /health` ve `POST /api/v1/transactions/analyze` entegrasyonu.
- 400/404/503 hata şekillerini güvenli ve anlaşılır göster.
- Tekrar dene akışı ve degraded backend durumu.
- Offline fallback kullanılırsa yalnızca versioned/gerçek transaction response fixture'ı ve açık **Recorded demo** etiketi kullan; canlı sonuç gibi gösterme.
- **Kabul:** Local backend fixture testinde success/reverted/not-found/RPC-down durumları UI'ı çökertmez.

### F3 — Public frontend ve responsive doğrulama (P0, `TODO`)

- Vercel/Cloudflare Pages production build.
- 375 px ve 500 px kontrolleri.
- `npm run check` sıfır hata.
- **Kabul:** Harici cihazdan HTTPS URL açılır ve public backend'e erişir.

### F4 — Findings feed, WebSocket ve bildirimler (P1, `TODO`)

- `GET /api/v1/findings` ve `WS /api/v1/events`.
- Reconnect/backoff ve HTTP recovery.

---

## Salik — Backend ve Contracts

### B1 — Foundry demo sözleşmeleri (P0, `BLOCKED`)

- `DemoToken.sol`: gerçek ERC-20 balance değişimi.
- `DemoEventOnly.sol`: kontrollü transfer-shaped event, token state değişimi yok.
- Unit testlerde balance ve event kanıtlarını ayrı assert et.
- **Blocker:** Bu makinede `forge`, `cast`, `anvil` kurulu değil.
- **Kabul:** `forge fmt --check` ve `forge test` geçer.

### B2 — Fixture tabanlı analyzer ve Fastify API (P0, `IN PROGRESS`)

Tamamlanan ilk dilim:

- Validated env config ve timeout'lu JSON-RPC client.
- Receipt status + gerçek `log.address` incelemesi.
- Transfer topic/from/to/amount decode.
- Configured DemoToken/EventOnly adreslerine göre deterministik classification.
- `GET /health`, `POST /api/v1/transactions/analyze`, canonical API errors ve CORS allowlist.
- 4 test dosyasında 21 unit/API testi.

Kalan:

- Gerçek Monad RPC integration testi.
- Gerekirse aynı blok bağlamında token-state/balance kanıtı; uygulanana kadar check `UNKNOWN` kalır.
- **Kabul:** Fixture testleri ve iki gerçek seed tx aynı API şemasında doğru ayrılır.

### B3 — Monad Testnet deployment ve seed işlemler (P0, `TODO`)

- B1 sonrası iki sözleşmeyi disposable testnet wallet ile deploy et.
- Bir gerçek token transferi ve bir event-only işlem üret.
- Chain ID, contract adresleri, tx hash'leri ve explorer linklerini doğrula.
- `TRUSTED_DEMO_TOKEN_ADDRESS` ve `DEMO_EVENT_ONLY_ADDRESS` deployment config'e ekle.
- **Kabul:** Explorer ve RPC iki işlemi aynı chain'de gösterir.

### B4 — Gerçek RPC doğrulaması ve public backend (P0, `TODO`)

- B2'yi B3'ün gerçek adres/hash'leriyle integration test et.
- Render/Railway/Fly.io benzeri long-running hostta HTTPS backend.
- Fahad'ın kesin frontend origin'ini CORS allowlist'e ekle.
- **Kabul:** Public `/health` ve iki analyze isteği dış ağdan çalışır.

### B5 — Persistence, watcher ve WebSocket (P1, `TODO`)

- SQLite findings + checkpoint.
- Idempotent `chainId:txHash:logIndex` kayıtları.
- Disconnect/reconnect + missed-range recovery.
- `GET /api/v1/findings` ve `WS /api/v1/events`.

---

## P0 durum matrisi

| İş | Sahip | Bağımlılık | Durum | Kanıt / kabul |
|---|---|---|---|---|
| Monorepo ve ortak tipler | Ortak | Yok | DONE | Root check geçti |
| Dashboard foundation | Fahad | Ortak tipler | DONE | Frontend lint/typecheck/test/build |
| Demo sözleşmeleri | Salik | Foundry | BLOCKED | `forge test` |
| Fixture analyzer/API | Salik | Ortak tipler | IN PROGRESS | 21 backend test + build geçti; real RPC bekliyor |
| Testnet deployment/seed tx | Salik | B1 | TODO | Explorer kanıtı |
| Quick Demo + final API UI | Fahad | B2/B3 | IN PROGRESS | Gerçek hashlerle UI |
| Public backend | Salik | B2/B3 | TODO | HTTPS health/analyze |
| Public frontend | Fahad | B4 | TODO | HTTPS UI |
| 90 saniyelik demo | Ortak | Tüm P0 | TODO | İki tx doğru ayrılır |

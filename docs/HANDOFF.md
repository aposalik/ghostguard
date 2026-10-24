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

- Foundry kurulu değil.
- Resmî/doğrulanmış Monad RPC ve chain bilgisi henüz bağlanmadı.
- Contract implementasyonu, deployment adresleri ve seed tx hash'leri yok.
- Public backend/frontend URL yok.

## Sonraki üç görev

1. **Salik:** Foundry erişimini sağla; `DemoToken` ve `DemoEventOnly` test-first implement et.
2. **Salik:** İki contract'ı disposable Monad Testnet wallet ile, insan onayından sonra deploy et; iki seed tx oluştur.
3. **Fahad + Salik:** Public backend ve local/public frontend entegrasyonunu gerçek hash'lerle doğrula.

## Resume protokolü

`AGENTS.md` → `docs/PROJECT_CONTEXT.md` → bu dosya → `docs/STATUS.md` → `docs/PLAN.md` → `docs/API_CONTRACT.md` okuyun. Sonra:

```bash
git status --short --branch
git log -5 --oneline --decorate
npm run check
```

Diğer geliştiricinin owned dizinini koordinasyonsuz değiştirmeyin.

# Handoff

## Proje özeti

GhostGuard, Monad Testnet'te transfer biçimli olayların gerçek emitter'ını ve işlem durumunu inceleyerek iki kontrollü demo senaryosunu ayırmayı hedefler. Üretim dolandırıcılık tespit ürünü olduğu iddia edilmez.

## Mevcut MVP hedefi

Gerçek `DemoToken` transferi ile `DemoEventOnly` olayını analyzer üzerinden ayırıp public React dashboard'da 90 saniye içinde göstermek.

## Mevcut durum

- Repo: `https://github.com/aposalik/ghostguard.git`
- Yerel dizin: `/Users/abdullahsalik/.openclaw/workspace/Ghostguard`
- Branch: `feature/frontend-dashboard`
- Remote base commit: `f361c99`
- Initialization commit: `feat: initialize GhostGuard monorepo and frontend` (yerel branch; kesin hash için `git log -1`)
- Pending PR: yok
- Remote'a push: origin/main ve origin/feature/frontend-dashboard dallarına yapıldı (f4805ec)
- Zincir deployment: yok

## Son tamamlanan iş

Frontend UI/UX ve 90 saniyelik hakem demo akışı tamamlandı:
1. **Quick Demo Scenario Switcher**: Scenario A (Legitimate Transfer -> Verified yeşil rozet), Scenario B (Spoofed Decoy -> Emitter Mismatch uyarısı), Scenario C (Needs Review) tek tıkla yüklenip incelenebilir.
2. **Evidence UI & Badges**: 5 sınıfa özel rozetler, Monad Explorer (`testnet.monadexplorer.com`) doğrudan linkleri, ve "Emitter Mismatch" vurgu kutusu entegre edildi.
3. **Live Monitor Feed**: İncelenen olaylar geçmişte listelenir; tıklanan kart anında Evidence Inspector'da açılır.
4. **Monad 3D Tasarım**: Resmi Monad Foundation marka paleti (#6E54FF, #0E091C, #85E6FF, #00E599), responsive tipografi ve interaktif 3D Canvas animasyonu eklendi.
5. **API Entegrasyonu & Hata Tanıları**: `POST /api/v1/transactions/analyze` ve `GET /health` istemcisi, istemci tarafı hash doğrulaması, HTTP 400/404/502/503 tanıları, "Try Again" butonu ve amber "Demo Simulation Mode Active (Backend offline)" bandı entegre edildi.
6. **WebSocket İstemcisi & Canlı Bildirimler (P1)**:
   - `ws://<BACKEND>/api/v1/events` bağlantısı ve `finding.created` veri akışı dinleyicisi (`useLiveEvents.ts`).
   - Üstel geri çekilme (exponential backoff) ve otomatik HTTP fallback (`GET /api/v1/findings`).
   - Gerçek zamanlı uyarı toast bileşeni (`LiveToast.tsx`): Spoofed olaylarda kırmızı Emitter Mismatch uyarısı, tek tıkla inceleme butonu, doğrulanmış transferlerde yeşil kalkan toast'ı.
   - Hakem sunumları için Live Monitor Feed üzerinde canlı simülasyon tetikleyici butonları (+ Real Transfer, + Spoofed Decoy).
7. **Testler ve Build**: `npm run check` (oxlint 0 warning/error, typecheck, 16 unit test, production build) 0 hata ile doğrulandı.

## Önemli yollar

- `shared/types/index.ts`: canonical API tipleri
- `docs/API_CONTRACT.md`: endpoint sözleşmesi
- `docs/ARCHITECTURE.md`: analyzer/watcher tasarımı
- `frontend/src/services/api.ts`: frontend HTTP adaptörü
- `docs/PLAN.md`: sahiplik ve öncelikler

## Doğrulanmış komutlar

```bash
npm install
npm audit --audit-level=moderate  # 0 vulnerability
npm run check                     # lint + typecheck + 3 test + production build geçti
npm run dev --workspace @ghostguard/frontend -- --host 0.0.0.0 --port 4173
curl http://127.0.0.1:4173/       # HTTP 200
```

Headless Chrome ile desktop ve 500 px responsive screenshot'ları görsel olarak kontrol edildi.

## Bilinen sorunlar

- Foundry kurulu değil.
- Backend ve sözleşme implementasyonu yok.
- RPC, testnet address/hash ve deployment URL'leri yok.
- Varsayılan Git HTTPS trust path'i bu hostta hata verdi; TLS kapatılmadan ortam trust bundle'ı kullanıldı.

## Sonraki üç görev

1. **Developer B:** Foundry ile `DemoToken` ve `DemoEventOnly` testlerini yazıp sözleşmeleri implement et.
2. **Developer B:** Fixture tabanlı analyzer + `POST /api/v1/transactions/analyze` endpoint'ini ortak tiplere göre oluştur.
3. **Developer A:** Endpoint hazır olduğunda gerçek response entegrasyonunu test et ve public frontend deployment yap.

## Resume protokolü

`AGENTS.md` → `docs/PROJECT_CONTEXT.md` → bu dosya → `docs/STATUS.md` → `docs/PLAN.md` → `docs/API_CONTRACT.md` okuyun. Sonra `git status --short --branch`, `git log -5 --oneline` ve ilgili testleri kontrol edin. Diğer geliştiricinin dizinini koordinasyonsuz değiştirmeyin.

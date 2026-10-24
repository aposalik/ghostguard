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

## Public backend deployment hazırlığı

- Railway signup kapalı olduğu için Render seçildi.
- `render.yaml` ücretsiz Node web service, Frankfurt region, ephemeral `/tmp/ghostguard.db`, public config ve dashboard-entered secrets içerir. Ücretsiz host restart/spin-down durumunda SQLite verisi kaybolabilir ve watcher durur.
- `/health/live` RPC-independent liveness endpoint'i eklendi ve testlidir.
- Render service/account oluşturma ve public URL doğrulaması henüz yapılmadı.

## Tasarım sınırları

- Request içindeki `expectedTokenAddress` server-side trusted config'i override etmez.
- Trusted config yoksa request adresi comparison context olabilir, verified kararı üretmez.
- Reverted receipt için findings boş kalır; başarı uydurulmaz.
- Balance-delta kontrolü henüz yok; ilgili check `UNKNOWN`.
- Unknown emitter `NEEDS_REVIEW`; fraud etiketi verilmez.

## Çalıştırma

```bash
npm install
npm audit --audit-level=moderate  # 0 vulnerability
npm run check                     # lint + typecheck + 3 test + production build geçti
npm run dev --workspace @ghostguard/frontend -- --host 0.0.0.0 --port 4173
curl http://127.0.0.1:4173/       # HTTP 200
```

Headless Chrome ile desktop ve 500 px responsive screenshot'ları görsel olarak kontrol edildi.

## Bilinen sorunlar

## Blocker'lar

- Public backend/frontend URL yok.
- Findings HTTP/WebSocket delivery uçları henüz yok.

## Sonraki üç görev

1. **Salik:** Public repo URL + `render.yaml` ile Render backend service oluştur; secret env değerlerini dashboard'dan gir.
2. **Fahad + Salik:** Local/public frontend entegrasyonunu gerçek iki hash'le doğrula.
3. **P1:** Findings HTTP/WebSocket uçlarını tamamla ve public hostta watcher sürekliliğini doğrula.

## Resume protokolü

`AGENTS.md` → `docs/PROJECT_CONTEXT.md` → bu dosya → `docs/STATUS.md` → `docs/PLAN.md` → `docs/API_CONTRACT.md` okuyun. Sonra `git status --short --branch`, `git log -5 --oneline` ve ilgili testleri kontrol edin. Diğer geliştiricinin dizinini koordinasyonsuz değiştirmeyin.

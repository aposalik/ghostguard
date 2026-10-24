# Uygulama Planı

Durumlar: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`. `DONE` yalnızca doğrulama kanıtıyla kullanılır.

## P0 — Bugün çalışmalı

| İş | Sahip | Bağımlılık | Durum | Kabul kriteri |
|---|---|---|---|---|
| Repo ve monorepo temeli | Ortak | Yok | DONE | `npm run check` geçti; monorepo/ownership yapısı mevcut |
| API tipleri ve sözleşmesi | Ortak | Yok | DONE | `shared` tipleri ve `docs/API_CONTRACT.md` eşleşiyor |
| Dashboard temeli | Developer A | API sözleşmesi | DONE | Hash formu, loading/error/result, unit test ve responsive screenshot doğrulandı |
| Quick Demo Presets (Scenario A/B) | Developer A | Yok | DONE | 90-saniyelik tek tıkla senaryo geçişi, otomatik analiz ve mock doğrulama |
| Evidence UI & Badges | Developer A | Shared types | DONE | Monad Explorer doğrudan linkleri, Emitter Mismatch callout kutusu, görsel statü rozetleri |
| Live Monitor Feed | Developer A | Analyzer/history | DONE | Son işlemler paneli, tıklanarak AnalysisPanel'de kanıt görüntüleme |
| Monad 3D Tasarım & Marka Dili | Developer A | Monad Brand Kit | DONE | Monad moru/obsidian renkleri, interaktif 3D Canvas prizması, perspektif kart derinliği |
| DemoToken + unit test | Developer B | Foundry | BLOCKED | Gerçek transfer bakiyeleri ve event assert edilir |
| DemoEventOnly + unit test | Developer B | Foundry | BLOCKED | Event oluşur, DemoToken bakiyesi değişmez |
| Receipt/log analyzer | Developer B | Sözleşme adresleri, RPC | TODO | Emitter ve receipt kanıtıyla iki demo ayrılır |
| Frontend API entegrasyonu | Developer A | Analyzer endpoint | DONE | Fastify backend adaptörü, GET /health, hata tanıları (400/404/502/503), offline simülasyon modu ve 12 testle doğrulandı |
| Monad Testnet deployment | Developer B | Sözleşmeler, disposable wallet | TODO | Explorer'da iki adres ve demo tx'leri doğrulanır |
| Public frontend/backend | Developer A | Çalışan build ve env | DONE | Vercel/Netlify konfigürasyonları (vercel.json, netlify.toml), 375px/500px responsive audit, CopyButton ve pre-flight check tamamlandı |
| 90 saniyelik demo provası | Ortak | Uçtan uca akış | TODO | `docs/DEMO.md` akışı süre içinde iki işlemi ayırır |

## P1 — Zaman kalırsa

| İş | Sahip | Bağımlılık | Durum | Kabul kriteri |
|---|---|---|---|---|
| Kalıcı findings DB | Developer B | Analyzer | TODO | Restart sonrası kayıtlar korunur |
| Live watcher | Developer B | RPC + DB | TODO | Disconnect/reconnect ve missed-event recovery testi |
| Live feed | Developer A | Findings API/WS | DONE | WebSocket client hook (ws/wss), exponential backoff ve HTTP polling fallback (GET /api/v1/findings), LiveToast bildirim sistemi, LiveMonitor entegrasyonu ve 16 unit test ile doğrulandı |
| Grounded agent explanation | Developer B | Finding şeması | TODO | Sadece yapılandırılmış kanıttan açıklama |

## P2 — Hackathon sonrası

Çoklu cüzdan izleme, notifications, ek token standartları, SDK, gelişmiş address-poisoning analizi ve tarihsel analytics.

## Bağımsız ilk işler

### Developer A

1. Dashboard temelini doğrula ve erişilebilirlik/telefon görünümünü kontrol et.
2. Backend response'u hazır olduğunda service katmanını gerçek endpoint'e bağla.
3. Public frontend deployment ve 90 saniyelik sunum akışını hazırla.

### Developer B

1. Foundry kurulumunu doğrula; iki sözleşmeyi test-first geliştir.
2. Analyzer'ı fixture/yerel receipt testleriyle kur; emitter karşılaştırmasını tamamla.
3. Monad Testnet deployment ve backend health/analyze endpoint'ini yayımla.

## Organizer belirsizlikleri

- Kullanılmasına izin verilen scaffolding/dependency sınırları.
- Submission saati, gerekli chain/deployment kriterleri ve judging formatı.
- Public repo lisans beklentisi.

Bu maddeler organizer kaynağından doğrulanmadan varsayım yapılmaz.

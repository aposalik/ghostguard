# Uygulama Planı

Durumlar: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`. `DONE` yalnızca doğrulama kanıtıyla kullanılır.

## P0 durum matrisi

| İş | Sahip | Bağımlılık | Durum | Kanıt / kabul |
|---|---|---|---|---|
| Monorepo ve ortak tipler | Ortak | Yok | DONE | Root check geçti; monorepo ve shared tipler mevcut |
| Dashboard foundation | Fahad | Ortak tipler | DONE | Frontend lint/typecheck/test/build ve responsive layout doğrulandı |
| Quick Demo Presets (Scenario A/B) | Fahad | Yok | DONE | 90-saniyelik tek tıkla senaryo geçişi, otomatik analiz ve mock/real hash doğrulama |
| Evidence UI & Badges | Fahad | Shared types | DONE | Monad Explorer doğrudan linkleri, Emitter Mismatch callout kutusu, görsel statü rozetleri |
| Live Monitor Feed | Fahad | Analyzer/history | DONE | Son işlemler paneli, tıklanarak AnalysisPanel'de kanıt görüntüleme |
| Monad 3D Tasarım & Marka Dili | Fahad | Monad Brand Kit | DONE | Monad moru/obsidian renkleri, interaktif 3D Canvas prizması |
| Light Mode & Humanized UI | Fahad | Monad Brand Kit | DONE | Varsayılan açık mod, karanlık mod geçişi, insanileştirilmiş tipografi, 30-saniyelik hakem rehberi (`VulnerabilityExplainer`) |
| Demo sözleşmeleri | Salik | Foundry | DONE | `forge fmt --check`; 3 Foundry testi geçti |
| Fixture analyzer/API | Salik | Ortak tipler | DONE | Fastify backend, GET /health, POST /api/v1/transactions/analyze, 30 test |
| Testnet deployment/seed tx | Salik | Foundry | DONE | Monad Testnet (Chain 10143); DemoToken ve DemoEventOnly deploy edildi, iki seed tx doğrulandı |
| Frontend API entegrasyonu | Fahad | Analyzer endpoint | DONE | Fastify backend adaptörü, hata tanıları (400/404/502/503), offline simülasyon modu ve 16 testle doğrulandı |
| Public frontend/backend | Ortak | Çalışan build ve env | IN PROGRESS | Render backend blueprint ve Vercel/Netlify frontend konfigürasyonları hazır |
| 90 saniyelik demo provası | Ortak | Uçtan uca akış | TODO | `docs/DEMO.md` akışı süre içinde iki işlemi ayırır |

## P1 — Zaman kalırsa

| İş | Sahip | Bağımlılık | Durum | Kabul kriteri |
|---|---|---|---|---|
| Kalıcı findings DB & Watcher | Salik | RPC + SQLite | DONE | Finalized head HTTP polling, SQLite checkpointing, restart recovery |
| Live feed & WebSocket | Fahad | Findings API/WS | DONE | WebSocket client hook (ws/wss), exponential backoff ve HTTP polling fallback, LiveToast bildirim sistemi |
| Email notifications | Salik | Resend API | DONE | Idempotent email queue ve template |
| Grounded agent explanation | Salik | Finding şeması | TODO | Sadece yapılandırılmış kanıttan açıklama |

## P2 — Hackathon sonrası

Çoklu cüzdan izleme, notifications, ek token standartları, SDK, gelişmiş address-poisoning analizi ve tarihsel analytics.

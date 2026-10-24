# Mühendislik Kararları

## D-001 — Tek repo, sahiplik sınırları olan monorepo

**Tarih:** 2026-10-24  
**Karar:** `frontend`, `backend`, `contracts`, `shared` ve `docs` aynı repoda tutulur.  
**Neden:** Hackathon hızında API değişikliklerini görünür kılarken iki geliştiricinin dizin sahipliğini korur.  
**Trade-off:** Root tooling koordinasyonu gerekir; AGENTS ve PR kuralları bu riski azaltır.

## D-002 — Güvenlik kararı backend'de deterministik kalır

**Tarih:** 2026-10-24  
**Karar:** Frontend veya LLM sınıflandırma üretmez; analyzer receipt ve log kanıtından üretir.  
**Neden:** AI halüsinasyonu ve browser-only izleme iddiasını önler.  
**Trade-off:** Hosted backend P0 için zorunlu hale gelir.

## D-003 — Bilinmeyen sonuçlar `NEEDS_REVIEW`

**Tarih:** 2026-10-24  
**Karar:** Sadece tanımlı demo kanıtı kesin `VERIFIED_DEMO_TRANSFER`/`SUSPICIOUS_EVENT` üretir; diğerleri `NEEDS_REVIEW` kalır.  
**Neden:** Bilinmeyen token'ı yanlışlıkla kötü niyetli ilan etmeyi önler.

## D-004 — Zincir sayıları decimal string

**Tarih:** 2026-10-24  
**Karar:** Amount ve block number JSON sınırında string taşınır.  
**Neden:** JavaScript `number` hassasiyet kaybını önler.  
**Trade-off:** UI formatlama katmanı explicit parse/format yapar.

## D-005 — Tailwind yalnızca utility gerçekten gerekirse

**Tarih:** 2026-10-24  
**Karar:** İlk frontend foundation, Vite ile gelen sade CSS'i modern component sınıflarıyla kullanır; Tailwind bağımlılığı yalnızca ekip somut fayda gördüğünde eklenir.  
**Neden:** P0 için bağımlılık ve konfigürasyon yüzeyini küçültür; tercih edilen teknolojiye ters düşmeden gereksiz framework eklemez.  
**Trade-off:** Tasarım tokenları ve responsive kurallar CSS dosyasında yönetilir.

## D-006 — Frontend-local type dizini yerine ortak paket

**Tarih:** 2026-10-24  
**Karar:** API/domain tipleri `frontend/src/types/` içinde kopyalanmaz; `@ghostguard/shared` doğrudan kullanılır.  
**Neden:** Frontend ve backend şemasının sessizce ayrışmasını önler.  
**Trade-off:** `shared` değişikliği ortak sahiplik ve koordinasyon gerektirir.

## D-007 — Event-only demo owner-gated kalır

**Tarih:** 2026-10-24

**Karar:** `DemoEventOnly` Transfer biçimli event'i yalnızca deploy eden owner'ın üretmesine izin verir.

**Neden:** Kontrollü testnet kanıtını korur ve üçüncü tarafların demo contract'ını keyfi event üretimi için kullanmasını engeller.

**Trade-off:** Seed event işlemi deployment owner cüzdanıyla imzalanmalıdır.

## D-008 — Watcher finalized HTTP range polling kullanır

**Tarih:** 2026-10-24

**Karar:** P1 watcher, monitored wallet adreslerini Transfer event'inin indexed `from` ve `to` topic'lerinde ayrı `eth_getLogs` sorgularıyla tarar; yalnızca confirmation eşiğinin gerisindeki blokları işler.

**Neden:** Her emitter'ı önceden bilmeden wallet'a referans veren transfer biçimli event'leri yakalar; SQLite checkpoint ve bounded backfill restart/RPC recovery sağlar.

**Trade-off:** Public RPC limitleri nedeniyle range 100 blokla sınırlandırılır ve iki topic pozisyonu için iki sorgu gerekir.

## D-009 — Email delivery bulgudan ayrı ve retry edilebilir

**Tarih:** 2026-10-24

**Karar:** Finding önce SQLite'a idempotent kaydedilir; email başarılı olduktan sonra `alerted_at` yazılır. Provider hatası chain checkpoint'ini geri almaz, unsent alert sonraki cycle'da aynı provider idempotency key'iyle tekrar denenir.

**Neden:** Email kesintisinin zincir indekslemeyi durdurmasını veya event kaybına yol açmasını önler.

**Trade-off:** Provider uzun süre kapalıysa pending alert kuyruğu büyüyebilir; production hostta ölçüm/limit gerekir.

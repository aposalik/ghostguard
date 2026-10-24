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

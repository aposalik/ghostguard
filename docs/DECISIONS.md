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

## D-007 — 90 saniyelik hakem presetleri ve deterministik fallback

**Tarih:** 2026-10-24  
**Karar:** Scenario A (Verified) ve Scenario B (Spoofed Decoy) senaryoları `frontend/src/data/demoScenarios.ts` içinde deterministik fixture olarak tanımlandı. Backend çevrimdışıyken bile bu presetler hakeme kanıt gösterir; bilinmeyen hash'lerde ise API sözleşmesi gereği açıkça hata verilir ve sahte verdict üretilmez.  
**Neden:** Abdullah sözleşmeleri ve backend'i deploy edene kadar canlı hakem demosunun kesintisiz ve hatasız çalışmasını sağlamak.

## D-008 — Monad Foundation resmi marka kimliği ve Canvas 3D görselleştirme

**Tarih:** 2026-10-24  
**Karar:** Monad resmi tasarım sistemi renkleri (#6E54FF Monad Moru, #0E091C Deep Obsidian, #85E6FF Monad Cyan, #00E599 Emerald) ve sıfır-bağımlılık HTML5 Canvas 3D koruma prizması entegre edildi.  
**Neden:** Hackathon jürisine görsel etkisi yüksek, Monad ekosistemine tam entegre ve performansı yüksek (küçük bundle boyutu) bir deneyim sunmak.

## D-009 — Dayanıklı API istemcisi, erken hash doğrulaması ve güvenli hata render'ı

**Tarih:** 2026-10-24  
**Karar:** `frontend/src/services/api.ts` içinde `VITE_API_BASE_URL` (fallback `http://localhost:3001` / `/api`) üzerinden Fastify backend'e bağlandı. İstek ağa çıkmadan önce `0x` + 64 hex karakter formatı doğrulanır. HTTP 400, 404, 502/503 ve ağ kopmalarına özel kullanıcı dostu hata mesajları üretilir. UI'da hata ve zincir metinleri React güvenli metin düğümleriyle render edilir (asla innerHTML kullanılmaz). Backend çevrimdışıyken amber simülasyon bandı ("Demo Simulation Mode Active (Backend offline)") devreye girer ve "Try Again" / yeniden deneme butonları sunulur.  
**Neden:** Hakem sunumu sırasında RPC veya backend kesintisi yaşansa dahi UI'ın donmasını, çökmesini veya sahte verdict üretmesini engellemek; hata anında kullanıcıya açık yönlendirme sunmak.

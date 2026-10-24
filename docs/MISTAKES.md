# Hatalar ve Dersler

Bu kayıt append-only tutulur; sorun çözülse de geçmiş silinmez.

## 2026-10-24 — Repository clone TLS issuer hatası

- **Bileşen:** Git/GitHub bağlantısı
- **Belirti:** `SSL certificate problem: unable to get local issuer certificate`
- **Kök neden:** Git varsayılan çağrısı, OpenClaw ortamının sağladığı güven zinciri bundle'ını kullanmadı.
- **Denenen çözüm:** TLS doğrulamasını kapatmak yerine mevcut `SSL_CERT_FILE` değeri komut-scoped `GIT_SSL_CAINFO` olarak verildi.
- **Doğrulama:** `git ls-remote` ve `git clone` başarıyla tamamlandı; HEAD `f361c99` olarak doğrulandı.
- **Önleme:** `sslVerify=false` kullanma. Bu ortamda remote işlemlerinde güvenilir bundle'ı explicit geçir; farklı makinelerde normal Git trust store'u tercih et.

## 2026-10-24 — TypeScript `erasableSyntaxOnly` uyumsuzluğu

- **Bileşen:** Frontend API error sınıfı ve testi
- **Belirti:** `TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled` ve asymmetric matcher tip hatası.
- **Kök neden:** Constructor parameter property sözdizimi Vite'ın TypeScript ayarıyla uyumlu değildi; test generic'i tam `Error` şeklini bekliyordu.
- **Denenen çözüm:** Alanlar sınıfta explicit tanımlandı; matcher yalnızca gerekli `status` ve `code` alanlarını karşılaştıracak şekilde sadeleştirildi.
- **Doğrulama:** `npm run typecheck` ve 3 Vitest testi geçti.
- **Önleme:** Bu scaffold'da runtime TypeScript özelliği gerektiren parameter property/enum gibi sözdizimlerinden kaçın; erasable syntax kullan.

## 2026-10-24 — Root dev script argüman aktarımı

- **Bileşen:** Local frontend çalıştırma
- **Belirti:** Vite `CACError: Unused args: 4173` verdi.
- **Kök neden:** Root `npm run dev -- --host ...` argümanları nested workspace scriptine doğru `--` sınırıyla aktarılmadı.
- **Denenen çözüm:** `npm run dev --workspace @ghostguard/frontend -- --host 0.0.0.0 --port 4173` doğrudan workspace komutu kullanıldı.
- **Doğrulama:** Vite hazır oldu ve HTTP kontrolü 200 döndü.
- **Önleme:** Custom Vite argümanları gerektiğinde workspace scriptini doğrudan çağır.

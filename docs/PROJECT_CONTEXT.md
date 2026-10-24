# Proje Bağlamı

## Özet

GhostGuard, Monad Blitz Ankara (24 Ekim 2026) için geliştirilen bir güvenlik MVP'sidir. Amaç, ERC-20 `Transfer` biçimli logların ne anlama geldiğini işlem makbuzu ve log yayıcısı gibi doğrulanabilir zincir kanıtlarıyla açıklamaktır.

## Problem sınırı

Bir sözleşme, gerçek token sözleşmesinde bakiye değiştirmeden `Transfer(address,address,uint256)` imzasına sahip bir olay yayımlayabilir. Bu, native MON transferi sahteciliği değildir. GhostGuard başarılı işlemi gerçek token transferiyle eş anlamlı saymaz ve bilinmeyen token'ları otomatik olarak dolandırıcılık diye etiketlemez.

## MVP başarı ölçütü

1. Self-owned `DemoToken` gerçek bakiye değiştirir.
2. Self-owned `DemoEventOnly` yalnızca transfer biçimli olay üretir.
3. Analyzer iki işlemi gerçek log yayıcısı ve beklenen token adresiyle ayırır.
4. Frontend kanıtları ve sınıflandırmayı açık biçimde gösterir.
5. Testnet işlemleriyle çalışan akış herkese açık bir URL'de 90 saniyede gösterilebilir.

## Ekip

- **Developer A (Salik):** frontend, UX, API entegrasyonu, public web deployment ve sunum.
- **Developer B:** sözleşmeler, watcher/analyzer, backend, testler ve teknik doğrulama.
- **Ortak sözleşme:** `shared/types/index.ts` ve `docs/API_CONTRACT.md`.

## Kısıtlar

- Kod 24 Ekim 2026 hackathon sürecinde yeni yazılmalıdır.
- MonVault ayrı bir önceki projedir; kaynak kodu kopyalanmayacaktır.
- P0 tamamlanmadan P2 özelliklerine geçilmez.
- Public repo ve public çalışan demo gereklidir; organizer kurallarının ayrıntıları ayrıca doğrulanmalıdır.
- Private key veya recovery phrase uygulama, doküman ya da repoya alınmaz.

## Mevcut kaynak doğruluğu

Başlangıç remote'u yalnızca `# ghostguard` içeren tek commitli public repoydu. Bu branch üzerinde monorepo, dokümantasyon ve frontend temeli oluşturulmaktadır. Dağıtım veya zincir sonucu henüz yoktur.

# 90 Saniyelik Demo

> Monad Testnet deployment, iki kontrollü seed transaction ve public backend doğrulandı. Public frontend deployment son P0 hosting adımıdır.

## Hazırlık kontrolü

- [ ] Public frontend URL harici cihazdan açıldı.
- [ ] Backend `/health` cevap verdi.
- [x] DemoToken ve DemoEventOnly adresleri RPC'de contract bytecode ile doğrulandı.
- [x] İki transaction hash'i aynı chain'de doğrulandı.
- [x] Backend iki hash'i doğru sınıflandırıyor.
- [x] Dashboard iki gerçek hash'i live API veya açık etiketli recorded response ile gösterebiliyor.
- [ ] Backup ekran kaydı/screenshot gerçek sonuçlarla hazırlandı.

## Akış

**0–15 sn — Problem**  
“Bir transaction başarılı olabilir ve `Transfer` biçimli event üretebilir; ancak event'i beklediğiniz token sözleşmesi üretmemiş olabilir. Başarı receipt'i tek başına token ödemesi kanıtı değildir.”

**15–40 sn — Gerçek transfer**  
Gerçek DemoToken transaction hash'ini yapıştır. Receipt success, actual emitter = DemoToken, kontroller ve `VERIFIED_DEMO_TRANSFER` sonucunu göster.

**40–70 sn — Yanıltıcı event demonstrasyonu**  
DemoEventOnly transaction hash'ini yapıştır. Event içindeki from/to/amount benzer görünse de actual emitter'ın DemoToken olmadığını ve DemoToken bakiyesinin değişmediğini göster. Sonuç `SUSPICIOUS_EVENT` olmalı.

**70–90 sn — Değer ve sınır**  
“GhostGuard AI ile tahmin yürütmüyor; zincir kanıtını açıklıyor. Bilinmeyen her token'ı fraud ilan etmiyor; yetersiz kanıtı `NEEDS_REVIEW` bırakıyor.”

## Doğrulanacak kanıtlar

- Public app URL: `TBD`
- Backend URL: `https://ghostguard-backend-kmrj.onrender.com`
- Chain ID: `10143`
- DemoToken address: `0x21A48A0f107BaF3DC2eDA13e4aB6B7e624397639`
- DemoEventOnly address: `0xa7836d1245593d16929a3Eea3Aa34461EF08F474`
- Gerçek transfer tx: `0x22b9eb3a62f096515a44a319fc119ea4411c1fb3c2652915497ecd4df57f6d1f`
- Event-only tx: `0x321987f432eefd92503aadd386a18d4c7df518653046cdb9e37b54e8cbde07c4`

## RPC/API doğrulaması

- Dört deployment/seed receipt'i başarılıdır.
- Gerçek transfer recipient balance'ını `25 GGD` artırdı ve API `VERIFIED_DEMO_TRANSFER` döndürdü.
- Event-only işlem aynı Transfer biçimini farklı emitter'dan yayımladı; token balance değiştirmedi ve API `SUSPICIOUS_EVENT` döndürdü.
- Otomatik watcher, SQLite persistence, duplicate prevention ve Resend email transport uygulanmıştır.
- Dashboard geçmişi `GET /api/v1/findings`, yeni bulguları `WS /api/v1/events` üzerinden alır.

## Backup prosedürü

1. Public backend kesilirse önceden doğrulanmış explorer sayfalarını aç.
2. Gerçek transaction response fixture'ını yerel frontend'de yalnızca “recorded verified demo” etiketiyle göster.
3. Ekran kaydında URL, chain ID, hash ve emitter adresinin okunabildiğini doğrula.
4. Live sistem çalışmıyorsa bunu açıkça söyle; kayıtlı sonucu canlıymış gibi sunma.

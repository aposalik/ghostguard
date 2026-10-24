# 90 Saniyelik Demo

> Henüz deployment yapılmadı. Aşağıdaki alanlar gerçek testnet kanıtı olmadan doldurulmayacaktır.

## Hazırlık kontrolü

- [ ] Public frontend URL harici cihazdan açıldı.
- [ ] Backend `/health` cevap verdi.
- [ ] DemoToken ve DemoEventOnly adresleri explorer'da doğrulandı.
- [ ] İki transaction hash'i aynı chain'de doğrulandı.
- [ ] Dashboard iki hash'i önceden analiz edebiliyor.
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
- Backend URL: `TBD`
- Chain ID: `TBD`
- DemoToken address: `TBD`
- DemoEventOnly address: `TBD`
- Gerçek transfer tx: `TBD`
- Event-only tx: `TBD`

## Backup prosedürü

1. Public backend kesilirse önceden doğrulanmış explorer sayfalarını aç.
2. Gerçek transaction response fixture'ını yerel frontend'de yalnızca “recorded verified demo” etiketiyle göster.
3. Ekran kaydında URL, chain ID, hash ve emitter adresinin okunabildiğini doğrula.
4. Live sistem çalışmıyorsa bunu açıkça söyle; kayıtlı sonucu canlıymış gibi sunma.

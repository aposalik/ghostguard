# Güvenlik Modeli ve Sınırlar

## GhostGuard neyi tespit eder?

MVP, kontrollü demo bağlamında transfer biçimli logun hangi sözleşmeden geldiğini, transaction receipt durumunu ve beklenen DemoToken adresiyle eşleşmesini kontrol eder. Böylece gerçek DemoToken transferi ile event-only demonstrasyonu ayırır.

## Neyi tespit etmez?

- Her dolandırıcılık türü veya her kötü niyetli token.
- Native MON transferi sahteciliği.
- Bir projenin sosyal güvenilirliği veya ekonomik değeri.
- Sadece balance farkından evrensel transfer kanıtı.
- Proxy/upgrade, rebasing, fee-on-transfer veya standart dışı token davranışlarının tamamı.
- Mainnet üretim güvenliği.

## Allowlist sınırı

Trusted token allowlist bir güven kaynağı değil, doğrulanan deployment konfigürasyonudur. Yanlış konfigürasyon yanlış sınıflandırma doğurabilir. Adresler chain ID ile birlikte saklanmalı ve demo öncesi explorer/RPC üzerinden iki kişi tarafından kontrol edilmelidir.

## False positive / negative riskleri

- Aynı event imzasını kullanan meşru bilinmeyen kontratlar `NEEDS_REVIEW` kalmalıdır.
- Reorg veya gecikmiş RPC verisi geçici `PENDING`/eksik sonuç üretebilir.
- Token-state kontrolleri aynı blok bağlamında yapılmazsa yanlış yorumlanabilir.
- Event-only demo “suspicious” sınıfı, yalnızca beklenen DEMO token ödemesinin doğrulanmadığını söyler.

## Testnet ve anahtar kuralları

- Demo yalnızca Monad Testnet ve self-owned disposable cüzdanlarla yapılır.
- Uygulama private key, seed phrase veya cüzdan recovery verisi toplamaz.
- Deployment secret'ları CI/host secret store'da kalır; `.env.example` sadece isim taşır.
- Zincir işlemi göndermeden önce insan onayı alınır.

## Güvenilmeyen içerik

RPC cevapları, token metadata, revert reason ve kullanıcı girdisi güvenilmeyen veridir. Hash/address şema doğrulaması yapılır, loglar sınırlanır, UI metni HTML olarak inject edilmez ve backend hata cevaplarında stack/credential gösterilmez.

## Sorumlu demo dili

“Bu event beklenen DemoToken sözleşmesinden gelmedi; iddia edilen DEMO ödemesi doğrulanamadı” denir. Kanıt yokken “bu token kesin dolandırıcılıktır” denmez.

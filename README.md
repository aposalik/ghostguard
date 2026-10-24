# GhostGuard

GhostGuard, Monad üzerindeki ERC-20 `Transfer` olaylarını işlem makbuzu ve gerçek log yayıcısı ile karşılaştırarak yanıltıcı transfer iddialarını açıklayan bir güvenlik aracıdır.

> **Hackathon durumu:** Aktif MVP geliştirmesi. Henüz dağıtılmış sözleşme, doğrulanmış testnet işlemi veya herkese açık uygulama URL'si yoktur.

## Neyi çözüyor?

Bir sözleşme, beklenen token sözleşmesinde bakiye değiştirmeden `Transfer` biçimli bir olay yayımlayabilir. Başarılı işlem makbuzu tek başına, iddia edilen token transferinin gerçekleştiğini kanıtlamaz. GhostGuard şu kanıtları birlikte gösterir:

- işlem durumu,
- olayı gerçekten yayımlayan sözleşme,
- beklenen/güvenilen token adresiyle eşleşme,
- mevcut olduğunda ek token-durum kanıtı,
- kanıta dayalı sınıflandırma ve sade açıklama.

GhostGuard bilinmeyen her token'ı dolandırıcılık olarak etiketlemez; belirsiz sonuçlar `NEEDS_REVIEW` olarak kalır.

## Monorepo

```text
frontend/   React + Vite + TypeScript kullanıcı arayüzü (Developer A)
backend/    İzleyici, analiz motoru ve API alanı (Developer B)
contracts/  Eğitim amaçlı Solidity sözleşmeleri (Developer B)
shared/     Sürüm kontrollü API tipleri (ortak sahiplik)
docs/       Mimari, plan, durum, güvenlik ve devir belgeleri
```

## Başlangıç

Gereksinimler: Node.js 22+ ve npm 10+. Sözleşme geliştirme aşamasında Foundry ayrıca gerekecektir.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Frontend varsayılan olarak `http://localhost:5173` üzerinde açılır. Backend hazır değilse arayüz bunu açıkça belirtir; sahte analiz sonucu üretmez.

## Doğrulama

```bash
npm run check
```

Mevcut gerçek durum ve doğrulanan komutlar için [`docs/STATUS.md`](docs/STATUS.md), devam etmek için [`docs/HANDOFF.md`](docs/HANDOFF.md) dosyasını okuyun.

## Güvenlik

- Yalnızca kendi test sözleşmeleriniz ve tek kullanımlık testnet cüzdanlarıyla demo yapın.
- Private key, seed phrase veya API anahtarını repoya eklemeyin.
- Blockchain'den gelen ad, sembol ve metadataları güvenilmeyen veri kabul edin.
- Bu hackathon MVP'si üretim güvenlik garantisi vermez.

Sınırlar için [`docs/SECURITY.md`](docs/SECURITY.md) belgesine bakın.

## Lisans

Hackathon süresince proje ekibi tarafından belirlenecektir.

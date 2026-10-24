# GhostGuard Frontend

**Sahip: Fahad (@MFahadFaisal).** React, Vite ve strict TypeScript kullanır. Salik/backend çalışmaları bu dizini koordinasyonsuz değiştirmez.

## Komutlar

```bash
npm run dev --workspace @ghostguard/frontend
npm run lint --workspace @ghostguard/frontend
npm run typecheck --workspace @ghostguard/frontend
npm run test --workspace @ghostguard/frontend
npm run build --workspace @ghostguard/frontend
```

## Mimari

- `pages/`: route seviyesindeki ekran kompozisyonu
- `components/`: sunum ve etkileşim bileşenleri
- `hooks/`: async UI state yönetimi
- `services/`: HTTP/API adaptörleri
- `utils/`: saf yardımcı fonksiyonlar

Canonical response tipleri `@ghostguard/shared` paketinden gelir. Frontend güvenlik sınıflandırması üretmez; backend yanıtı olmadan yalnızca hata/boş durum gösterir.

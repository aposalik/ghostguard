# GhostGuard Frontend

Developer A çalışma alanı. React 19, Vite, Oxlint, Vitest ve strict TypeScript ile geliştirilmiştir. Monad Testnet üzerinde ERC-20 Transfer logları ile gerçek sözleşme emitter'larını karşılaştırır.

## Canlı Dağıtım (Public Web Deployment)

GhostGuard frontend'i Vercel, Netlify veya Cloudflare Pages üzerinde statik SPA olarak dağıtılmaya hazırdır.

### Vercel Dağıtımı
- **Framework Preset**: Vite
- **Root Directory**: `frontend` (veya monorepo kökünde `vercel.json` kullanarak)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: GhostGuard Fastify backend URL'si. Production build `frontend/.env.production` üzerinden public Render backend'ine, yerel geliştirme varsayılan olarak `http://localhost:3000` adresine bağlanır. Backend çevrimdışıyken yalnızca iki gerçek demo transaction'ından kaydedilmiş cevaplar açık `Recorded Demo Mode` etiketiyle kullanılabilir.

### Netlify Dağıtımı
Proje kökündeki `netlify.toml` otomatik olarak `frontend` dizinini derler ve SPA yönlendirmelerini (`/index.html`) yapılandırır.

---

## Yerel Geliştirme Komutları

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat (Vite localhost:5173)
npm run dev --workspace @ghostguard/frontend

# Kod kalitesi ve tip kontrolleri
npm run lint --workspace @ghostguard/frontend
npm run typecheck --workspace @ghostguard/frontend

# Birim testlerini çalıştır (12 test)
npm run test --workspace @ghostguard/frontend

# Üretim build'i al
npm run build --workspace @ghostguard/frontend

# Tüm doğrulamaları tek seferde çalıştır
npm run check
```

---

## 90 Saniyelik Hakem Demosu Akışı

1. **Senaryo A (Meşru Transfer)**: `Scenario A: Legitimate Transfer` butonuna tıklandığında doğrulanmış `DemoToken` transfer hash'i yüklenir ve yeşil kalkan rozeti (`VERIFIED_DEMO_TRANSFER`) görüntülenir.
2. **Senaryo B (Sahte Decoy Olayı)**: `Scenario B: Spoofed Decoy` butonuna tıklandığında `DemoEventOnly` işlem hash'i taranır ve **Emitter Mismatch** uyarı kutusu (`SUSPICIOUS_EVENT`) tetiklenir:
   > *"The Transfer-shaped log was emitted by the configured event-only demo contract rather than DemoToken."*
3. **Canlı İzleme Paneli (Live Monitor)**: Son taranan olaylar listelenir; herhangi bir işleme tıklandığında detaylı kanıt kartı `AnalysisPanel` üzerinde incelenir.
4. **Monad Explorer Bağlantıları**: Tüm adresler ve hash'ler `https://testnet.monadscan.com` doğrudan bağlantıları ve kopyalama butonları (`📋`) içerir.

---

## Responsive & Mobil Uyumluluk

- **375px (Kompakt Mobil)**: Tek sütun dikey kart yapısı, yatay taşmasız hash inputu, otomatik text-ellipsis ve adres kopyalama butonları.
- **500px (Geniş Mobil)**: Responsive grid, dokunmatik uyumlu butonlar ve amber simülasyon uyarı bandı.
- **Masaüstü (1200px+)**: İki sütunlu gösterge paneli, Monad resmi obsidian & electric violet teması ve interaktif 3D koruma prizması (`Monad3DScene`).

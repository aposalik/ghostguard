# GhostGuard Frontend

**Sahip: Fahad (@MFahadFaisal).** React 19, Vite, Oxlint, Vitest ve strict TypeScript ile geliştirilir.

## Deneyim yapısı

- **Home (`/`)**: Projeyi, tehdit modelini, kanıt akışını, canlı doğrulamaları, ekibi ve yol haritasını anlatan portfolio/landing page.
- **Try It (`/#/try-it`)**: Kullanıcının verdiği account adresini Agent Mode ile izleyen, kalıcı incoming/outgoing activity graph'ı ve stored transaction ledger'ı sunan canlı workbench.
- Hash routing kullanıldığı için unified Fastify/static deployment'ta ek server rewrite kuralı gerekmez.
- Home ve Try It aynı tasarım sistemi kullanır: acid lime, deep olive, orange, cream, violet/coral accent'ler; Anton + Instrument Serif + Manrope + IBM Plex Mono tipografi; reduced-motion fallback.

## Gerçek veri sınırı

Frontend verdict üretmez. Account watch toggle ve history için `/api/v1/monitoring/accounts/*`; transaction evidence için `POST /api/v1/transactions/analyze`; realtime için `WS /api/v1/events` cevaplarını sunar. Incoming yeşil, outgoing sarı; yalnızca backend'in `SUSPICIOUS` verdict'i kırmızıdır. `NEEDS_REVIEW` mor kalır. Backend erişilemiyorsa açık hata gösterir; recorded preset veya client-side fake event yoktur.

## Yerel geliştirme

```bash
npm install
npm run dev --workspace @ghostguard/frontend
```

Vite geliştirme sunucusu varsayılan olarak `http://localhost:5173`; API varsayılanı `http://localhost:3000` olur. Unified production build aynı origin altında `/api/v1/*` kullanır.

## Doğrulama

```bash
npm run lint --workspace @ghostguard/frontend
npm run typecheck --workspace @ghostguard/frontend
npm run test --workspace @ghostguard/frontend
npm run build --workspace @ghostguard/frontend
npm run check
```

Görsel kabul matrisi:

- 1440 px desktop: Home hero/sections, Try It workbench, result state ve live sidebar.
- 500 px mobile: tek sütun hero, search form, illustration ve analyzer kartları; yatay taşma olmamalı.
- `prefers-reduced-motion`: sürekli/scroll animasyonları kapatılmalı.

## Temel yollar

- `src/pages/HomePage.tsx`: portfolio homepage
- `src/pages/TryItPage.tsx`: account Agent Mode ve kanıt workbench'i
- `src/hooks/useAccountMonitor.ts`: watch toggle, persistent history, WebSocket/reconnect ve polling recovery
- `src/components/EvidenceGraphPanel.tsx`: animated Obsidian-style account graph
- `src/components/AccountActivityList.tsx`: kalıcı transaction/activity listesi
- `src/components/AppHeader.tsx`: Home/Try It navigation
- `src/components/GhostBloom.tsx`: özgün GhostGuard hero illustration
- `src/theme.css`: paylaşılan portfolio tasarım sistemi ve analyzer override'ları
- `src/index.css`: mevcut component layout/behavior temeli
- `src/services/api.ts`: HTTP/WebSocket adresleme ve API adapter'ları

# Backend çalışma alanı

**Sahip:** Developer B

Planlanan modüller:

- `src/config/`: doğrulanmış çalışma zamanı yapılandırması
- `src/watcher/`: canlı log izleme, reconnect ve missed-event recovery
- `src/analyzer/`: deterministik receipt/log doğrulama kuralları
- `src/database/`: idempotent bulgu saklama ve checkpoint
- `src/api/`: `docs/API_CONTRACT.md` ile uyumlu HTTP/WebSocket yüzeyi
- `src/agent/`: yalnızca bulgu verisine dayalı açıklama üretimi

Bu dizinde henüz backend implementasyonu veya doğrulanmış çalıştırma komutu yoktur.

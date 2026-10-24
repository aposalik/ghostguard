# Test Planı

## Katmanlar

- **Contracts:** Foundry unit tests.
- **Analyzer:** Fixture + RPC integration tests.
- **Watcher/DB:** idempotency, restart ve recovery integration tests.
- **Frontend:** component/service unit tests ve kritik demo browser testi.
- **E2E:** Monad Testnet'te iki self-owned demo transaction'ı.

## Zorunlu senaryolar

| # | Senaryo | Beklenen sonuç | Katman |
|---|---|---|---|
| 1 | Gerçek DemoToken transferi | Bakiye değişir, emitter DemoToken, `VERIFIED_DEMO_TRANSFER` | Contract + analyzer + E2E |
| 2 | DemoEventOnly transfer biçimli event | DemoToken bakiyesi değişmez, emitter farklı, `SUSPICIOUS_EVENT` | Contract + analyzer + E2E |
| 3 | Revert transaction | `FAILED_TRANSACTION`, transfer doğrulandı denmez | Analyzer |
| 4 | Bilinmeyen token | `NEEDS_REVIEW`, fraud iddiası yok | Analyzer |
| 5 | Aynı event iki kez ingest | Tek finding kaydı | DB integration |
| 6 | Watcher bağlantı kopması/restart | Backoff + yeniden bağlanma, checkpoint korunur | Watcher integration |
| 7 | Kaçırılan blok aralığı | Restart sonrası range backfill ile bulunur | Watcher integration |
| 8 | Eksik/yanlış tx hash | 400 veya güvenli 404; crash yok | API + frontend |
| 9 | API/RPC hatası | UI anlaşılır hata ve tekrar deneme sunar; sahte sonuç yok | Frontend |

## Kabul kanıtı

Her test için komut, tarih, commit ve sonucu `docs/STATUS.md` içinde kaydedilir. Testnet E2E için chain ID, contract adresleri, transaction hash'leri ve explorer linkleri `docs/DEMO.md` içine eklenir.

Küçük hackathon test seti “production secure” iddiası için yeterli değildir.

# GhostGuard AI Çalışma Kuralları

## Başlamadan önce

Sırasıyla `docs/PROJECT_CONTEXT.md`, `docs/HANDOFF.md`, `docs/STATUS.md`, `docs/PLAN.md`, `docs/API_CONTRACT.md` ve ilgili kodu okuyun. Ardından aktif branch, `git status`, son commitler ve remote durumunu kontrol edin.

## Hedef ve mimari

GhostGuard, Monad Testnet üzerindeki transfer biçimli olayları işlem makbuzu, gerçek log yayıcısı ve güvenilen demo token adresiyle karşılaştırır. Akış: Monad RPC → backend watcher → deterministik analyzer → kalıcı bulgular → HTTP/WebSocket → React dashboard. Açıklama katmanı yalnızca analyzer tarafından sağlanan gerçekleri ifade eder.

## Sahiplik

- **Developer A:** `frontend/`, kullanıcı deneyimi, API entegrasyonu, frontend dağıtımı ve demo akışı.
- **Developer B:** `backend/`, `contracts/`, testnet dağıtımları ve teknik doğrulama.
- **Ortak:** `shared/` ve `docs/API_CONTRACT.md`; değişiklik öncesinde ekipçe anlaşın.

Diğer geliştiricinin alanını açık koordinasyon olmadan değiştirmeyin. Ortak tiplerde kırıcı değişiklik yaparken API belgesini ve tüketicileri aynı PR'da güncelleyin.

## Kod standartları

- TypeScript'te `strict` modu ve açık domain tipleri kullanın; zincir miktarlarını JSON'da ondalık string olarak taşıyın.
- `chainId + transactionHash + logIndex` birleşimini olay kimliği olarak kullanın.
- Blockchain adreslerini karşılaştırmadan önce güvenli biçimde normalize edin; kullanıcıya gösterirken orijinal kanıtı koruyun.
- UI'da blockchain'den gelen metni güvenilmeyen içerik kabul edin; HTML olarak enjekte etmeyin.
- Başarılı receipt'i token transferinin tek başına kanıtı saymayın.
- Bilinmeyen token'ı otomatik olarak kötü niyetli ilan etmeyin.
- Karmaşık olmayan, bakımı kolay çözümleri tercih edin; P0 tamamlanmadan P2 eklemeyin.

## Git güvenliği

- Çalışmaya başlamadan önce fetch edin ve temiz durumu doğrulayın.
- `main` üzerinde doğrudan çalışmayın; `feature/frontend-dashboard` veya `feature/contracts-detector` gibi sahiplik branch'leri kullanın.
- Başka geliştiricinin commitini yeniden yazmayın, force-push yapmayın ve uncommitted değişikliklerini silmeyin.
- Push, deploy, zincir işlemi veya dış hesap bağlantısı için insan onayı alın.
- Commit öncesi diff'i sırlar, private key'ler, seed phrase'ler ve kişisel veriler için inceleyin.

## Test ve kanıt

İlgili lint, typecheck, unit/integration test ve build komutlarını çalıştırın. Çalıştırılmayan bir testi geçmiş göstermeyin. Zincir sonucu, sözleşme adresi, işlem hash'i, public URL veya ekran görüntüsü uydurmayın. Tamamlanan işi komut çıktısı, test veya gözlemlenebilir artefaktla destekleyin.

## Dokümantasyon

Anlamlı iş sonunda yalnızca etkilenen belgeleri güncelleyin:

- görev durumu: `docs/PLAN.md`
- çalışan/kırık durum ve doğrulamalar: `docs/STATUS.md`
- mimari/API değişikliği: ilgili mimari belgesi
- önemli tercih: `docs/DECISIONS.md`
- hata ve ders: `docs/MISTAKES.md` (geçmişi silmeyin)
- devam noktası: `docs/HANDOFF.md`

Agent'a özel veya özel bilgiyi public repoya yazmayın. Paylaşılabilir proje bağlamı `docs/PROJECT_CONTEXT.md` içinde kalır.

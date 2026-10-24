# API Sözleşmesi — v1

Kaynak TypeScript tipleri: `shared/types/index.ts`. Bu belge ve tipler ortak sahipliktedir; frontend/backend paralel çalışmadan önce değişiklikler koordine edilir.

## Temel kurallar

- Base URL frontend'de `VITE_API_BASE_URL` ile verilir.
- JSON cevapları UTF-8'dir.
- Adres ve hash alanları `0x` prefiksli hex stringdir.
- `uint256`, blok numarası ve kayıp riski taşıyan tüm zincir sayıları decimal stringdir.
- Event kimliği: `${chainId}:${transactionHash}:${logIndex}`.
- Tarihler ISO 8601 UTC stringidir.

## `GET /health`

```json
{
  "status": "ok",
  "chainId": 0,
  "latestIndexedBlock": "123456"
}
```

`chainId: 0` sadece degraded/örnek durumudur; gerçek chain ID RPC'den okunur. Sağlıklı cevap HTTP `200`, RPC'ye erişilemeyen degraded cevap aynı şemayla HTTP `503` döner.

Hosting liveness kontrolü RPC'den bağımsız `GET /health/live` üzerinden `{ "status": "ok" }` döner. `GET /` servis adını ve kullanılabilir endpoint yollarını listeler.

## `POST /api/v1/transactions/analyze`

İstek:

```json
{
  "transactionHash": "0x<64-hex-characters>",
  "expectedTokenAddress": "0x<40-hex-characters>"
}
```

`expectedTokenAddress` opsiyoneldir. Backend allowlist'i geçersiz kılmaz; yalnızca karşılaştırma bağlamıdır. `TRUSTED_DEMO_TOKEN_ADDRESS` configured ise bulgudaki beklenen token ve kesin `VERIFIED_DEMO_TRANSFER` kararı için bu server-side değer önceliklidir. Trusted adres configured değilse request adresi gösterilebilir fakat tek başına verified sınıfı üretemez.

Başarılı cevap:

```json
{
  "transaction": {
    "chainId": 0,
    "transactionHash": "0x<hash>",
    "receiptStatus": "SUCCESS",
    "blockNumber": "123456"
  },
  "findings": [
    {
      "id": "0:0x<hash>:2",
      "chainId": 0,
      "transactionHash": "0x<hash>",
      "logIndex": 2,
      "blockNumber": "123456",
      "classification": "NEEDS_REVIEW",
      "actualEmitterAddress": "0x<address>",
      "expectedTokenAddress": null,
      "claimedTransfer": null,
      "checks": [],
      "explanation": "Evidence is incomplete; review the emitting contract.",
      "analyzedAt": "2026-10-24T00:00:00.000Z"
    }
  ]
}
```

Sınıflandırmalar:

- `VERIFIED_DEMO_TRANSFER`: trusted DemoToken emitter ve gerekli kanıtlar tutarlı.
- `SUSPICIOUS_EVENT`: kontrollü demo kapsamında event, beklenen token dışındaki emitter'dan geldi ve iddia doğrulanamadı.
- `NEEDS_REVIEW`: bilinmeyen veya yetersiz kanıt.
- `FAILED_TRANSACTION`: receipt reverted.
- `PENDING`: transaction henüz kesin receipt'e sahip değil.

İlk backend diliminde reverted receipt, `transaction.receiptStatus = REVERTED` ve boş `findings` ile döner; başarılı transfer bulgusu uydurulmaz. Token balance-delta kontrolü henüz yoktur ve `TOKEN_STATE_SUPPORTS_CLAIM` check'i `UNKNOWN` kalır.

## `GET /api/v1/findings?limit=20&cursor=<opaque>`

```json
{
  "items": [],
  "nextCursor": null
}
```

Cursor opaque kabul edilir. Varsayılan sıralama `analyzedAt DESC, id DESC` olmalıdır.
`limit` varsayılan olarak `20`, en az `1`, en fazla `100` değerini alır. Geçersiz limit veya cursor canonical `400 INVALID_REQUEST` cevabı üretir. Watcher kapalıysa endpoint boş sayfa döndürür.

## `WS /api/v1/events`

Sunucudan istemciye mesaj:

```json
{
  "type": "finding.created",
  "data": { "...SecurityFinding": "shared type ile aynı" }
}
```

Endpoint watcher'ın SQLite'a yeni kaydettiği bulguları yayınlar. Frontend reconnect/backoff uygular; HTTP endpoint bağlantı kesintilerinde kurtarma ve geçmiş kaynağıdır. Browser `Origin` değeri HTTP CORS allowlist'iyle aynı listeden doğrulanır.

## Hata şekli

HTTP durumları: `400` geçersiz JSON/body/hash/address, `404` receipt bulunamayan işlem, `503` RPC erişim/sağlık sorunu, `500` beklenmeyen hata. Hata kodları: `INVALID_REQUEST`, `INVALID_TRANSACTION_HASH`, `TRANSACTION_NOT_FOUND`, `RPC_UNAVAILABLE`, `INTERNAL_ERROR`.

```json
{
  "error": {
    "code": "INVALID_TRANSACTION_HASH",
    "message": "Transaction hash must be 32 bytes.",
    "requestId": "opaque-request-id"
  }
}
```

Hata mesajı secret, RPC credential veya stack trace içermez.

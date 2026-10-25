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

Hosting liveness kontrolü RPC'den bağımsız `GET /health/live` üzerinden `{ "status": "ok" }` döner. Unified deployment'ta `GET /` React dashboard'u, `GET /api` servis adını ve kullanılabilir endpoint yollarını döndürür. Frontend build mevcut değilse backend-only çalıştırmada `GET /` de servis bilgisini döndürebilir.

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

## Account Agent Mode

### `GET /api/v1/monitoring/accounts`

SQLite'taki kalıcı watch kayıtlarını döndürür:

```json
[
  {
    "chainId": 10143,
    "address": "0x<40-hex-characters>",
    "enabled": true,
    "createdAt": "2026-10-25T00:00:00.000Z",
    "updatedAt": "2026-10-25T00:00:00.000Z"
  }
]
```

### `PUT /api/v1/monitoring/accounts/:address`

Idempotent Agent Mode toggle:

```json
{ "enabled": true }
```

`false` watch'ı durdurur fakat önceden kaydedilen activity satırlarını silmez. Adresler backend'de lowercase normalize edilir.

### `GET /api/v1/monitoring/accounts/:address/activities?limit=100&cursor=<opaque>`

```json
{
  "items": [
    {
      "id": "10143:0x<hash>:2:watch:0x<address>",
      "chainId": 10143,
      "watchedAddress": "0x<address>",
      "transactionHash": "0x<hash>",
      "blockNumber": "73787276",
      "direction": "OUTGOING",
      "kind": "TOKEN_TRANSFER",
      "verdict": "SUSPICIOUS",
      "counterpartyAddress": "0x<address>",
      "assetAddress": "0x<emitter>",
      "amount": "25000000000000000000",
      "finding": { "...SecurityFinding": "aynı shared type" },
      "observedAt": "2026-10-25T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Direction: `INCOMING`, `OUTGOING`, `SELF`. Kind: `NATIVE_TRANSFER`, `CONTRACT_CALL`, `TOKEN_TRANSFER`. Verdict: `CONFIRMED`, `SUSPICIOUS`, `NEEDS_REVIEW`, `REVERTED`. Direction ile güven verdict'i bağımsızdır; örneğin outgoing bir transfer hem sarı/confirmed hem kırmızı/suspicious olabilir ve kırmızı verdict önceliklidir.

Top-level transaction listener ilk aktivasyon anından itibaren ileriye doğru çalışır; `WATCH_START_BLOCK` yalnızca log finding backfill'i içindir. Internal transfers henüz trace edilmez.

## `WS /api/v1/events`

Sunucudan istemciye mesaj:

```json
{
  "type": "finding.created",
  "data": { "...SecurityFinding": "shared type ile aynı" }
}
```

Account activity frame'i:

```json
{
  "type": "activity.created",
  "data": { "...AccountActivity": "shared type ile aynı" }
}
```

Endpoint watcher'ın SQLite'a yeni kaydettiği bulguları ve account activity kayıtlarını yayınlar. Frontend reconnect/backoff uygular; HTTP endpoint bağlantı kesintilerinde kurtarma ve geçmiş kaynağıdır. Browser `Origin` değeri HTTP CORS allowlist'iyle aynı listeden doğrulanır.

## `GET /api/v1/agents/status`

İki otomasyon ajanının yalnızca operasyonel durumunu döndürür. Signer private key, RPC credential veya email credential hiçbir zaman bu cevaba eklenmez.

```json
{
  "producer": {
    "enabled": false,
    "state": "disabled",
    "ratePerSecond": 0,
    "maxTransactions": 0,
    "suspiciousEvery": 0,
    "submitted": 0,
    "normalSubmitted": 0,
    "suspiciousSubmitted": 0,
    "failed": 0,
    "lastTransactionHash": null,
    "lastActivityAt": null,
    "lastError": null
  },
  "detector": {
    "enabled": true,
    "state": "running",
    "emailNotificationsEnabled": true,
    "monitoredWalletCount": 2,
    "pollIntervalMs": 3000,
    "cyclesCompleted": 1,
    "logsObserved": 2,
    "findingsStored": 2,
    "alertsDelivered": 1,
    "lastActivityAt": "2026-10-24T12:00:00.000Z",
    "lastError": null
  }
}
```

`state`: `disabled`, `starting`, `running`, `stopped`, `error` veya `budget_exhausted`. Sayaçlar process restart'ında sıfırlanabilir; kalıcı finding/checkpoint verisi SQLite'tadır.

## Hata şekli

HTTP durumları: `400` geçersiz JSON/body/hash/address, `404` receipt bulunamayan işlem, `503` RPC erişim/sağlık sorunu, `500` beklenmeyen hata. Hata kodları: `INVALID_REQUEST`, `INVALID_ACCOUNT_ADDRESS`, `INVALID_TRANSACTION_HASH`, `TRANSACTION_NOT_FOUND`, `RPC_UNAVAILABLE`, `INTERNAL_ERROR`.

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

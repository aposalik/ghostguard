# Contracts çalışma alanı

**Sahip:** Salik (@aposalik, Developer B)

Burada iki yeni ve eğitim amaçlı testnet sözleşmesi geliştirilecektir:

- `DemoToken.sol`: gerçek bakiye değiştiren ERC-20 transferi.
- `DemoEventOnly.sol`: DemoToken bakiyesini değiştirmeden `Transfer` biçimli olay yayımlayan kontrollü örnek.

Kurallar:

- Yalnızca self-owned, disposable testnet cüzdanları kullanın.
- Gerçek projeleri taklit etmeyin veya üçüncü taraf cüzdanları hedeflemeyin.
- Dağıtım adresi ve işlem hash'i yalnızca zincirde doğrulandıktan sonra belgeleyin.
- Foundry 1.8.6 ile Solidity 0.8.28 derlemeleri doğrulanmıştır.
- `DemoEventOnly` yalnızca deploy eden owner'ın kontrollü demo event'i üretmesine izin verir.

Doğrulama:

```bash
forge fmt --check --root contracts
forge test --root contracts
```

Monad Testnet deployment hazırlığı:

```bash
cd contracts
forge script script/DeployAndSeed.s.sol:DeployAndSeed \
  --sig "run(address,uint256,uint256)" \
  <RECIPIENT_ADDRESS> 1000000000000000000000000 25000000000000000000 \
  --rpc-url monad_testnet --network monad --account <GHOSTGUARD_KEYSTORE> --broadcast
```

Private key'i komut satırına veya repoya koymayın. GhostGuard'a özel, disposable ve testnet MON ile fonlanmış şifreli bir Foundry keystore kullanın. Broadcast öncesinde chain ID'nin `10143` olduğunu tekrar doğrulayın.

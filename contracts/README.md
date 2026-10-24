# Contracts çalışma alanı

**Sahip:** Salik (@aposalik, Developer B)

Burada iki yeni ve eğitim amaçlı testnet sözleşmesi geliştirilecektir:

- `DemoToken.sol`: gerçek bakiye değiştiren ERC-20 transferi.
- `DemoEventOnly.sol`: DemoToken bakiyesini değiştirmeden `Transfer` biçimli olay yayımlayan kontrollü örnek.

Kurallar:

- Yalnızca self-owned, disposable testnet cüzdanları kullanın.
- Gerçek projeleri taklit etmeyin veya üçüncü taraf cüzdanları hedeflemeyin.
- Dağıtım adresi ve işlem hash'i yalnızca zincirde doğrulandıktan sonra belgeleyin.
- Foundry bu makinede henüz kurulu değildir; sözleşme scaffold'u veya testleri çalıştırılmış sayılmaz.

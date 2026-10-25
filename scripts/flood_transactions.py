#!/usr/bin/env python3
"""
GhostGuard Monad High-Speed Transaction Storm Generator
Generates multiple wallets and fires 100 mixed on-chain transactions concurrently
(Incoming MON, Outgoing MON, and Spoofed Decoy Transfer Events).
"""

import os
import sys
import time
import concurrent.futures
from web3 import Web3
from eth_account import Account

# ----------------- CONFIGURATION -----------------
RPC_URL = os.environ.get("MONAD_RPC_URL", "https://testnet-rpc.monad.xyz")
CHAIN_ID = int(os.environ.get("MONAD_CHAIN_ID", 10143))

# Funder Account (Deployer of the Spoofer Contract)
FUNDER_PK = os.environ.get("FUNDER_PK")

# Your Monitored Address on GhostGuard
TARGET_USER_ADDR = os.environ.get("TARGET_USER_ADDR", "0x351deba8041a4359399c5af0e11f8e66ed300492")

# Deployed Spoof Contract on Monad Testnet
SPOOFER_CONTRACT_ADDR = os.environ.get("SPOOFER_CONTRACT_ADDR", "0xE8c493C05C08ab458391af1D71e1B8939fd5a392")

# emitTransfer(address,address,uint256) function signature
EMIT_TRANSFER_SIG = Web3.keccak(text="emitTransfer(address,address,uint256)")[:4]

TOTAL_TRANSACTIONS = 100
WALLET_POOL_SIZE = 25
CONCURRENT_WORKERS = 25
# -------------------------------------------------

def encode_emit_transfer(from_addr: str, to_addr: str, amount_wei: int) -> bytes:
    """Encode calldata for emitTransfer(address from, address to, uint256 amount)."""
    p_from = bytes.fromhex(from_addr.lower().replace("0x", "")).rjust(32, b"\x00")
    p_to = bytes.fromhex(to_addr.lower().replace("0x", "")).rjust(32, b"\x00")
    p_amount = amount_wei.to_bytes(32, byteorder="big")
    return EMIT_TRANSFER_SIG + p_from + p_to + p_amount

def main():
    print("=" * 65)
    print("🚀 GHOSTGUARD MONAD TRANSACTION STORM GENERATOR (100 TXs)")
    print("=" * 65)

    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        print("❌ Error: Could not connect to Monad RPC.")
        sys.exit(1)

    if not FUNDER_PK:
        print("❌ Error: FUNDER_PK environment variable is required.")
        print("   Usage: export FUNDER_PK='0x...' && python3 scripts/flood_transactions.py")
        sys.exit(1)

    funder_account = Account.from_key(FUNDER_PK)
    funder_addr = funder_account.address
    funder_balance = w3.eth.get_balance(funder_addr)
    funder_balance_mon = w3.from_wei(funder_balance, "ether")

    print(f"📡 Connected to Monad Testnet (Chain ID: {CHAIN_ID})")
    print(f"🔑 Funder Wallet:  {funder_addr}")
    print(f"💰 Funder Balance: {funder_balance_mon:.4f} MON")
    print(f"🎯 Monitored User: {TARGET_USER_ADDR}")
    print(f"🎭 Spoofer Contract: {SPOOFER_CONTRACT_ADDR}")
    print("-" * 65)

    if funder_balance_mon < 0.05:
        print("❌ Error: Funder account has insufficient MON to broadcast 100 transactions.")
        sys.exit(1)

    # 1. Generate Wallet Pool
    print(f"📦 Generating pool of {WALLET_POOL_SIZE} random wallets...")
    wallet_pool = [Account.create() for _ in range(WALLET_POOL_SIZE)]
    print(f"✅ Generated {len(wallet_pool)} random wallets. Sample:")
    for i in range(min(3, len(wallet_pool))):
        print(f"   [{i+1}] {wallet_pool[i].address}")

    # 2. Get Starting Nonce and Gas Price
    start_nonce = w3.eth.get_transaction_count(funder_addr, "pending")
    gas_price = int(w3.eth.gas_price * 1.5)  # 1.5x gas price for instant inclusion
    print(f"📊 Starting Nonce: {start_nonce} | Gas Price: {gas_price // 10**9} Gwei")
    print("-" * 65)

    # 3. Build & Sign 100 Mixed Transactions in Memory
    print(f"⚡ Pre-signing {TOTAL_TRANSACTIONS} transactions in memory...")
    sign_start_time = time.time()
    signed_txs = []

    for i in range(TOTAL_TRANSACTIONS):
        nonce = start_nonce + i
        random_wallet = wallet_pool[i % WALLET_POOL_SIZE].address

        # Distribute into 3 distinct transaction flavors:
        # Flavor 1 (40%): Fake Spoofed Transfers (GhostGuard flags RED as SUSPICIOUS_EVENT)
        # Flavor 2 (30%): Incoming Native MON to target user
        # Flavor 3 (30%): Outgoing Native MON to random generated wallets
        category = i % 10

        if category < 4:
            # Fake Spoofed Transfer to Target User
            calldata = encode_emit_transfer(random_wallet, TARGET_USER_ADDR, 1000 * 10**18)
            tx = {
                "chainId": CHAIN_ID,
                "nonce": nonce,
                "to": Web3.to_checksum_address(SPOOFER_CONTRACT_ADDR),
                "value": 0,
                "gas": 40000,
                "gasPrice": gas_price,
                "data": calldata,
            }
            tx_type = "🔴 SPOOF_INCOMING"
        elif category < 7:
            # Real Incoming MON to Target User
            tx = {
                "chainId": CHAIN_ID,
                "nonce": nonce,
                "to": Web3.to_checksum_address(TARGET_USER_ADDR),
                "value": Web3.to_wei(0.00005, "ether"),
                "gas": 21000,
                "gasPrice": gas_price,
                "data": b"",
            }
            tx_type = "🟢 MON_INCOMING"
        else:
            # Real Outgoing MON to random wallet
            tx = {
                "chainId": CHAIN_ID,
                "nonce": nonce,
                "to": Web3.to_checksum_address(random_wallet),
                "value": Web3.to_wei(0.00005, "ether"),
                "gas": 21000,
                "gasPrice": gas_price,
                "data": b"",
            }
            tx_type = "🟡 MON_OUTGOING"

        signed = funder_account.sign_transaction(tx)
        signed_txs.append((i, tx_type, signed.raw_transaction))

    sign_elapsed = time.time() - sign_start_time
    print(f"✅ Signed all {TOTAL_TRANSACTIONS} transactions in {sign_elapsed:.3f}s!")
    print("-" * 65)

    # 4. Broadcast all 100 transactions concurrently in parallel
    print(f"🔥 Broadcasting {TOTAL_TRANSACTIONS} transactions in parallel ({CONCURRENT_WORKERS} threads)...")
    broadcast_start_time = time.time()

    def send_raw(item):
        idx, tx_type, raw_bytes = item
        try:
            tx_hash = w3.eth.send_raw_transaction(raw_bytes)
            return (idx, tx_type, tx_hash.hex(), True, None)
        except Exception as e:
            return (idx, tx_type, None, False, str(e))

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_WORKERS) as executor:
        futures = [executor.submit(send_raw, item) for item in signed_txs]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    broadcast_elapsed = time.time() - broadcast_start_time
    successful = [r for r in results if r[3]]
    failed = [r for r in results if not r[3]]

    results.sort(key=lambda x: x[0])

    print("=" * 65)
    print(f"🎉 TRANSACTION STORM COMPLETE IN {broadcast_elapsed:.3f} SECONDS!")
    print(f"✅ Successful broadcasts: {len(successful)} / {TOTAL_TRANSACTIONS}")
    if failed:
        print(f"⚠️ Failed broadcasts:     {len(failed)} (Reason: {failed[0][4]})")

    print("\n📋 Sample Broadcast Hashes:")
    for idx, tx_type, tx_hash, ok, _ in results[:10]:
        status_str = tx_hash if ok else "FAILED"
        print(f"  #{idx+1:02d} [{tx_type}]: {status_str}")

    if len(results) > 10:
        print(f"  ... and {len(results) - 10} more transactions broadcasted!")

    print("\n" + "=" * 65)
    print("👀 CHECK YOUR GHOSTGUARD DASHBOARD NOW:")
    print("👉 Live Workbench: http://127.0.0.1:4173/#/try-it")
    print("   Make sure Agent Mode is ON for 0x351deba8041a4359399c5af0e11f8e66ed300492")
    print("   Watch the live graph light up with incoming, outgoing, and red spoofed events!")
    print("=" * 65)

if __name__ == "__main__":
    main()


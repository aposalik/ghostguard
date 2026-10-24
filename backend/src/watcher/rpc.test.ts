import { describe, expect, it, vi } from 'vitest'
import type { TransactionHash } from '@ghostguard/shared'
import { JsonRpcClient, RpcUnavailableError } from './rpc.js'

const TX_HASH = `0x${'ab'.repeat(32)}` as TransactionHash

describe('JsonRpcClient', () => {
  it('parses the chain ID returned by JSON-RPC', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ jsonrpc: '2.0', id: 1, result: '0x2a' }))
    const client = new JsonRpcClient('https://rpc.example.test', 1_000, fetcher)

    await expect(client.getChainId()).resolves.toBe(42)
    expect(fetcher).toHaveBeenCalledWith('https://rpc.example.test', expect.objectContaining({ method: 'POST' }))
  })

  it('requests a receipt using the supplied hash', async () => {
    const receipt = { transactionHash: TX_HASH, blockNumber: '0x2a', status: '0x1', logs: [] }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ jsonrpc: '2.0', id: 1, result: receipt }))
    const client = new JsonRpcClient('https://rpc.example.test', 1_000, fetcher)

    await expect(client.getTransactionReceipt(TX_HASH)).resolves.toEqual(receipt)
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as { method: string; params: string[] }
    expect(request).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionReceipt',
      params: [TX_HASH],
    })
  })

  it('rejects malformed receipt payloads from the upstream RPC', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      jsonrpc: '2.0',
      id: 1,
      result: { transactionHash: TX_HASH, logs: 'not-an-array' },
    }))
    const client = new JsonRpcClient('https://rpc.example.test', 1_000, fetcher)

    await expect(client.getTransactionReceipt(TX_HASH)).rejects.toThrow(
      'Monad RPC returned an invalid transaction receipt.',
    )
  })

  it('maps transport and JSON-RPC errors to a safe domain error', async () => {
    const networkFailure = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('socket failure'))
    const rpcFailure = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32_000, message: 'upstream failed' },
    }))

    await expect(new JsonRpcClient('https://rpc.example.test', 1_000, networkFailure).getChainId())
      .rejects.toBeInstanceOf(RpcUnavailableError)
    await expect(new JsonRpcClient('https://rpc.example.test', 1_000, rpcFailure).getChainId())
      .rejects.toBeInstanceOf(RpcUnavailableError)
  })

  it('loads block height and range-filtered logs', async () => {
    const log = {
      address: `0x${'11'.repeat(20)}`,
      transactionHash: TX_HASH,
      blockNumber: '0x2a',
      logIndex: '0x1',
      topics: [`0x${'22'.repeat(32)}`],
      data: '0x',
    }
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 1, result: '0x2a' }))
      .mockResolvedValueOnce(jsonResponse({ jsonrpc: '2.0', id: 2, result: [log] }))
    const client = new JsonRpcClient('https://rpc.example.test', 1_000, fetcher)

    await expect(client.getBlockNumber()).resolves.toBe(42n)
    await expect(client.getLogs({ fromBlock: 40n, toBlock: 42n, topics: ['0xtopic', null] }))
      .resolves.toEqual([log])
    const request = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)) as { method: string; params: unknown[] }
    expect(request).toMatchObject({
      method: 'eth_getLogs',
      params: [{ fromBlock: '0x28', toBlock: '0x2a', topics: ['0xtopic', null] }],
    })
  })

  it('loads full block transactions for account direction indexing', async () => {
    const transaction = {
      hash: TX_HASH,
      from: `0x${'11'.repeat(20)}`,
      to: `0x${'22'.repeat(20)}`,
      value: '0x7',
      input: '0x',
      blockNumber: '0x2a',
    }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      jsonrpc: '2.0',
      id: 1,
      result: { number: '0x2a', timestamp: '0x671c2c20', transactions: [transaction] },
    }))
    const client = new JsonRpcClient('https://rpc.example.test', 1_000, fetcher)

    await expect(client.getBlockTransactions(42n)).resolves.toEqual([transaction])
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as { method: string; params: unknown[] }
    expect(request).toMatchObject({ method: 'eth_getBlockByNumber', params: ['0x2a', true] })
  })
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

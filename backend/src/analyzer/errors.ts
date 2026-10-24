export class TransactionNotFoundError extends Error {
  override readonly name = 'TransactionNotFoundError'

  constructor() {
    super('The transaction does not have an available receipt.')
  }
}

/**
 * Minima Blockchain Integration
 * Replaces Avalon blockchain for DADA AI Video Universe
 */

const MINIMA_RPC = process.env.MINIMA_RPC || 'https://127.0.0.1:9002'
const MINIMA_PASS = process.env.MINIMA_RPC_PASS || 'privseairpc'

export const Minima = {
  _connected: false,
  _address: null,

  async connect() {
    try {
      const res = await fetch(`${MINIMA_RPC}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'status',
          password: MINIMA_PASS
        })
      })
      const data = await res.json()
      this._connected = true
      return data
    } catch (e) {
      console.warn('Minima connection failed, using offline mode', e)
      return null
    }
  },

  async getAddress() {
    if (!this._address) {
      const res = await this._rpc({ command: 'newaddress' })
      this._address = res?.response?.address
    }
    return this._address
  },

  async getBalance(token = 'DADA') {
    const res = await this._rpc({ command: 'balance' })
    return res?.response?.balance || 0
  },

  async send(to, amount, token = 'DADA') {
    return this._rpc({
      command: 'send',
      params: { address: to, amount: String(amount), token }
    })
  },

  _rpc(params) {
    return fetch(`${MINIMA_RPC}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, password: MINIMA_PASS })
    }).then(r => r.json())
  }
}

// For DTube compatibility
export default Minima

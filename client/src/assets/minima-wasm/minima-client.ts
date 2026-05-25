/**
 * Minima Browser Light Node
 * Runs in the browser, connects to DADA Minima network
 */
export class MinimaBrowserNode {
  private ws: WebSocket | null = null
  private connected: boolean = false
  private nodeId: string
  private rewardAddress: string
  private onReward: ((amount: number) => void) | null = null

  constructor(rewardAddress: string) {
    this.nodeId = this.generateNodeId()
    this.rewardAddress = rewardAddress
  }

  private generateNodeId(): string {
    return 'dada_' + Math.random().toString(36).substr(2, 16)
  }

  /**
   * Connect to Minima network via WebSocket
   */
  async connect(minimaWsUrl: string = 'wss://110.minima.network:9002/'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(minimaWsUrl)
      
      this.ws.onopen = () => {
        this.connected = true
        console.log('[Minima] Node connected:', this.nodeId)
        this.sendCommand('newaddress')
        resolve()
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data))
      }

      this.ws.onerror = (err) => {
        console.error('[Minima] Connection error:', err)
        reject(err)
      }
    })
  }

  private sendCommand(command: string, params?: any) {
    if (!this.ws || !this.connected) return
    this.ws.send(JSON.stringify({
      command,
      params: params || {},
      id: this.nodeId
    }))
  }

  private handleMessage(msg: any) {
    if (msg.command === 'balance' && this.onReward) {
      this.onReward(parseInt(msg.response?.balance || '0'))
    }
  }

  /**
   * Get current DADA Coin balance
   */
  async getBalance(): Promise<number> {
    return new Promise((resolve) => {
      if (!this.connected) { resolve(0); return }
      
      const handler = (event: MessageEvent) => {
        const msg = JSON.parse(event.data)
        if (msg.command === 'balance') {
          this.ws?.removeEventListener('message', handler as any)
          resolve(parseInt(msg.response?.balance || '0'))
        }
      }
      
      this.ws!.addEventListener('message', handler as any)
      this.sendCommand('balance')
      
      setTimeout(() => resolve(0), 5000)
    })
  }

  /**
   * Record video watch for reward
   */
  recordView(videoId: string, duration: number) {
    this.sendCommand('txncreate', {
      to: this.rewardAddress,
      amount: Math.floor(duration * 0.01), // 0.01 DADA per second
      token: 'DADA'
    })
  }

  setRewardCallback(cb: (amount: number) => void) {
    this.onReward = cb
  }

  disconnect() {
    this.ws?.close()
    this.connected = false
  }
}

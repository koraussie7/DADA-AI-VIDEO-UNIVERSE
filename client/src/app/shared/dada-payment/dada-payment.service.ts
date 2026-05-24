import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../environments/environment'
import { VultisigWallet } from '../../../assets/minima-wasm/vultisig-wallet'

export interface DADAPaymentResult {
  success: boolean
  txHash: string
  planName: string
  amount: number
  duration: number
}

@Injectable()
export class DADAPaymentService {
  private wallet: VultisigWallet

  constructor(private http: HttpClient) {
    this.wallet = new VultisigWallet({
      rpcUrl: environment.apiUrl + '/minima-ws'
    })
  }

  /**
   * Pay for premium storage with DADA Coin
   */
  async payForStorage(plan: {
    name: string
    priceDADA: number
    duration: number
    planId: string
  }): Promise<DADAPaymentResult> {
    // 1. Connect Vultisig wallet
    const address = await this.wallet.connect()
    
    // 2. Prepare payment
    const payment = {
      from: address,
      amount: plan.priceDADA,
      token: 'DADA',
      memo: `Premium Storage: ${plan.name}`,
      metadata: {
        planId: plan.planId,
        duration: plan.duration
      }
    }

    // 3. Send to platform treasury
    const tx = await this.wallet.send(
      environment.platformTreasury || 'Mx...',
      plan.priceDADA
    )

    // 4. Confirm with server
    const result = await this.http.post<DADAPaymentResult>(
      `${environment.apiUrl}/api/v1/premium-storage/confirm-payment`,
      {
        txHash: tx.hash,
        planId: plan.planId
      }
    ).toPromise()

    return result!
  }

  /**
   * Get DADA Coin balance
   */
  async getBalance() {
    return this.wallet.getBalance()
  }
}

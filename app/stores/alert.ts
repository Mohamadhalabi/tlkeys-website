// stores/alert.ts
import { defineStore } from 'pinia'

export type AlertAction = { label: string; route?: string; onClick?: () => void }
export type Alert = {
  id: string
  type: 'success' | 'error' | 'info'
  title?: string
  message?: string
  image?: string
  sku?: string
  actions?: AlertAction[]
  timeout?: number // ms
}

export const useAlertStore = defineStore('alert', {
  state: () => ({
    items: [] as Alert[],
  }),
  actions: {
    showAlert(a: Omit<Alert, 'id'>) {
      const id = crypto?.randomUUID?.() || String(Date.now() + Math.random())
      const item: Alert = { timeout: 3500, ...a, id }
      this.items.unshift(item)
      if (item.timeout && item.timeout > 0) {
        setTimeout(() => this.dismiss(id), item.timeout)
      }
      return id
    },
    dismiss(id: string) {
      this.items = this.items.filter(x => x.id !== id)
    },
    clearAll() {
      this.items = []
    }
  }
})

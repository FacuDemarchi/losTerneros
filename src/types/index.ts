export type Store = {
  id: string
  name: string
  password?: string
}

export type UnitType = 'weight' | 'unit'

export type Product = {
  id: string
  name: string
  pricePerUnit: number
  unitType: UnitType
  disabled?: boolean
}

export type Category = {
  id: string
  label: string
  products: Product[]
  disabled?: boolean
}

export type TicketItem = {
  productId: string
  name: string
  quantity: number
  pricePerUnit: number
  unitType: UnitType
}

export type ClosedTicket = {
  id: string
  timestamp: number
  items: TicketItem[]
  total: number
  type: 'normal' | 'B' | 'A'
}

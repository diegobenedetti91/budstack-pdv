// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string
  password: string
  tenantSlug: string
}

export interface RegisterTenantDto {
  tenantName: string
  tenantSlug: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface JwtPayload {
  sub: string
  email: string
  tenantId: string
  role: UserRole
  iat?: number
  exp?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  WAITER = 'WAITER',
  KITCHEN = 'KITCHEN',
}

export enum Plan {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  INACTIVE = 'INACTIVE',
}

export enum OrderStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum OrderType {
  TABLE = 'TABLE',
  COUNTER = 'COUNTER',
  KIOSK = 'KIOSK',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PIX = 'PIX',
  VOUCHER = 'VOUCHER',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum TaxRegime {
  SIMPLES_NACIONAL = 'SIMPLES_NACIONAL',
  LUCRO_PRESUMIDO = 'LUCRO_PRESUMIDO',
  LUCRO_REAL = 'LUCRO_REAL',
  MEI = 'MEI',
}

export enum TefProvider {
  SITEF = 'SITEF',
  REDE = 'REDE',
  CIELO = 'CIELO',
  STONE = 'STONE',
  GETNET = 'GETNET',
}

export enum PrinterType {
  NETWORK = 'NETWORK',
  USB = 'USB',
  BLUETOOTH = 'BLUETOOTH',
}

export enum PrinterDestination {
  KITCHEN = 'KITCHEN',
  BAR = 'BAR',
  CASHIER = 'CASHIER',
  BOTH = 'BOTH',
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response types
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Entities
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantEntity {
  id: string
  name: string
  slug: string
  plan: Plan
  isActive: boolean
  createdAt: string
}

export interface UserEntity {
  id: string
  tenantId: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  avatarUrl?: string
  createdAt: string
}

export interface CompanyEntity {
  id: string
  tenantId: string
  tradeName: string
  companyName: string
  cnpj: string
  stateRegistration?: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  website?: string
  taxRegime: TaxRegime
  tefProvider?: TefProvider
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
}

export interface TableEntity {
  id: string
  tenantId: string
  number: number
  name?: string
  capacity: number
  status: TableStatus
  qrCode?: string
  section?: string
}

export interface CategoryEntity {
  id: string
  tenantId: string
  name: string
  icon?: string
  imageUrl?: string
  sortOrder: number
  isActive: boolean
}

export interface ProductEntity {
  id: string
  tenantId: string
  categoryId: string
  category?: CategoryEntity
  name: string
  description?: string
  price: number
  imageUrl?: string
  code?: string
  isActive: boolean
  isAvailable: boolean
  variations?: ProductVariationEntity[]
}

export interface ProductVariationEntity {
  id: string
  productId: string
  name: string
  price: number
  isActive: boolean
}

export interface OrderEntity {
  id: string
  tenantId: string
  tableId?: string
  table?: TableEntity
  userId?: string
  user?: UserEntity
  orderNumber: number
  type: OrderType
  status: OrderStatus
  customerName?: string
  customerCount?: number
  subtotal: number
  discount: number
  serviceCharge: number
  total: number
  notes?: string
  items: OrderItemEntity[]
  payments: PaymentEntity[]
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface OrderItemEntity {
  id: string
  orderId: string
  productId: string
  product?: ProductEntity
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string
  status: OrderItemStatus
  sentToKitchenAt?: string
  readyAt?: string
  createdAt: string
}

export interface PaymentEntity {
  id: string
  orderId: string
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  tefNsu?: string
  tefAuthCode?: string
  cashReceived?: number
  change?: number
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Events
// ─────────────────────────────────────────────────────────────────────────────

export enum WsEvent {
  // Pedidos
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_ITEM_STATUS = 'order:item:status',

  // Cozinha
  KITCHEN_NEW_ITEM = 'kitchen:new_item',
  KITCHEN_ITEM_READY = 'kitchen:item_ready',

  // Mesas
  TABLE_STATUS = 'table:status',

  // Conta (kiosk → garçom)
  BILL_REQUESTED = 'bill:requested',

  // Impressão
  PRINT_JOB = 'print:job',
  PRINT_OFFLINE = 'print:offline',
}

export interface WsOrderCreatedPayload {
  tenantId: string
  order: OrderEntity
}

export interface WsOrderItemStatusPayload {
  tenantId: string
  orderId: string
  itemId: string
  status: OrderItemStatus
}

export interface WsBillRequestedPayload {
  tenantId: string
  orderId: string
  orderNumber: number
  tableNumber: number | null
  tableId: string | null
}

export interface WsPrintJobPayload {
  tenantId: string
  printerId?: string
  destination: PrinterDestination
  content: string
  orderId?: string
  offline?: boolean
}

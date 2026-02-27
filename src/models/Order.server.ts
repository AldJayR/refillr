import { prop, modelOptions, Severity } from '@typegoose/typegoose'
import { getModelForClass } from '@typegoose/typegoose'
import { Types } from 'mongoose'

export type OrderStatus = 'pending' | 'accepted' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled'
export type TankBrand = 'Gasul' | 'Solane' | 'Petron' | 'other'
export type TankSize = '2.7kg' | '5kg' | '11kg' | '22kg' | '50kg'

@modelOptions({
  schemaOptions: { _id: false },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class DeliveryLocation {
  @prop({ required: true, type: () => String, enum: ['Point'] })
  public type!: 'Point'

  @prop({ required: true, type: () => [Number] })
  public coordinates!: [number, number]
}

@modelOptions({
  schemaOptions: {
    collection: 'orders',
    timestamps: true,
  },
})
export class Order {
  @prop({ required: true, type: () => String })
  public userId!: string

  @prop({ required: true, type: Types.ObjectId, ref: 'Merchant' })
  public merchantId!: Types.ObjectId

  @prop({ type: () => String })
  public riderId?: string

  @prop({ required: true, type: () => String, enum: ['Gasul', 'Solane', 'Petron', 'other'] })
  public tankBrand!: TankBrand

  @prop({ required: true, type: () => String, enum: ['2.7kg', '5kg', '11kg', '22kg', '50kg'] })
  public tankSize!: TankSize

  @prop({ default: 1, type: () => Number })
  public quantity!: number

  @prop({ required: true, type: () => Number })
  public totalPrice!: number

  @prop({ required: true, type: () => String, enum: ['pending', 'accepted', 'dispatched', 'in_transit', 'delivered', 'cancelled'], default: 'pending' })
  public status!: OrderStatus

  @prop({ required: true, type: () => DeliveryLocation })
  public deliveryLocation!: DeliveryLocation

  @prop({ required: true, type: () => String })
  public deliveryAddress!: string

  @prop({ type: () => String })
  public notes?: string

  @prop({ type: () => Date })
  public acceptedAt?: Date

  @prop({ type: () => Date })
  public dispatchedAt?: Date

  @prop({ type: () => Date })
  public deliveredAt?: Date

  @prop({ type: () => Date })
  public cancelledAt?: Date

  @prop({ type: () => String })
  public cancellationReason?: string

  // Managed by timestamps: true
  public createdAt!: Date
  public updatedAt!: Date
}

export const OrderModel = getModelForClass(Order)
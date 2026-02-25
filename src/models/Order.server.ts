import { prop, modelOptions, Severity } from '@typegoose/typegoose'
import { getModelForClass } from '@typegoose/typegoose'
import { Types } from 'mongoose'

export type OrderStatus = 'pending' | 'accepted' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled'
export type TankBrand = 'Gasul' | 'Solane' | 'Petron' | 'other'
export type TankSize = '2.7kg' | '5kg' | '11kg' | '22kg' | '50kg'

@modelOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class DeliveryLocation {
  @prop({ required: true, enum: ['Point'] })
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
  @prop({ required: true })
  public userId!: string

  @prop({ required: true, type: Types.ObjectId, ref: 'Merchant' })
  public merchantId!: Types.ObjectId

  @prop({ type: Types.ObjectId, ref: 'User' })
  public riderId?: Types.ObjectId

  @prop({ required: true, enum: ['Gasul', 'Solane', 'Petron', 'other'] })
  public tankBrand!: TankBrand

  @prop({ required: true, enum: ['2.7kg', '5kg', '11kg', '22kg', '50kg'] })
  public tankSize!: TankSize

  @prop({ default: 1 })
  public quantity!: number

  @prop({ required: true })
  public totalPrice!: number

  @prop({ required: true, enum: ['pending', 'accepted', 'dispatched', 'in_transit', 'delivered', 'cancelled'], default: 'pending' })
  public status!: OrderStatus

  @prop({ required: true, type: () => DeliveryLocation })
  public deliveryLocation!: DeliveryLocation

  @prop({ required: true })
  public deliveryAddress!: string

  @prop()
  public notes?: string

  @prop()
  public acceptedAt?: Date

  @prop()
  public dispatchedAt?: Date

  @prop()
  public deliveredAt?: Date

  @prop()
  public cancelledAt?: Date

  @prop()
  public cancellationReason?: string
}

export const OrderModel = getModelForClass(Order)
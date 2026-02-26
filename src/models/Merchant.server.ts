import { prop, modelOptions, Severity } from '@typegoose/typegoose'
import { getModelForClass } from '@typegoose/typegoose'

@modelOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class GeoPoint {
  @prop({ required: true, type: () => String, enum: ['Point'] })
  public type!: 'Point'

  @prop({ required: true, type: () => [Number] })
  public coordinates!: [number, number]
}

@modelOptions({
  schemaOptions: {
    collection: 'merchants',
    timestamps: true,
  },
})
export class Merchant {
  @prop({ required: true, unique: true, type: () => String })
  public ownerUserId!: string

  @prop({ required: true, type: () => String })
  public shopName!: string

  @prop({ required: true, unique: true, type: () => String })
  public doePermitNumber!: string

  @prop({ required: true, type: () => GeoPoint, index: '2dsphere' })
  public location!: GeoPoint

  @prop({ type: () => [String], default: [] })
  public brandsAccepted!: string[]

  @prop({ type: () => Object, default: {} })
  public pricing!: Record<string, number>

  @prop({ type: () => Object })
  public deliveryPolygon?: GeoJSON.Polygon

  @prop({ default: true, type: () => Boolean })
  public isOpen!: boolean

  @prop({ default: false, type: () => Boolean })
  public isVerified!: boolean

  @prop({ type: () => String })
  public phoneNumber?: string

  @prop({ type: () => String })
  public address?: string

  @prop({ type: () => String })
  public baranggay?: string

  @prop({ type: () => String })
  public city?: string

  @prop({ type: () => [String], default: [] })
  public tankSizes!: string[]

  @prop({ default: 5000, type: () => Number })
  public deliveryRadiusMeters!: number
}

export const MerchantModel = getModelForClass(Merchant)

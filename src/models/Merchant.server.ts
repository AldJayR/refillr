import { prop, modelOptions, Severity } from '@typegoose/typegoose'
import { getModelForClass } from '@typegoose/typegoose'

@modelOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class GeoPoint {
  @prop({ required: true, enum: ['Point'] })
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
  @prop({ required: true })
  public shopName!: string

  @prop({ required: true, unique: true })
  public doePermitNumber!: string

  @prop({ required: true, index: '2dsphere' })
  public location!: GeoPoint

  @prop({ type: () => [String], default: [] })
  public brandsAccepted!: string[]

  @prop({ type: () => Object, default: {} })
  public pricing!: Record<string, number>

  @prop()
  public deliveryPolygon?: GeoJSON.Polygon

  @prop({ default: true })
  public isOpen!: boolean

  @prop({ default: false })
  public isVerified!: boolean

  @prop()
  public phoneNumber?: string

  @prop()
  public address?: string

  @prop()
  public baranggay?: string

  @prop()
  public city?: string

  @prop({ type: () => [String], default: [] })
  public tankSizes!: string[]

  @prop({ default: 5000 })
  public deliveryRadiusMeters!: number
}

export const MerchantModel = getModelForClass(Merchant)

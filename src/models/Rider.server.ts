import { prop, modelOptions, Severity, getModelForClass } from '@typegoose/typegoose'

@modelOptions({
  schemaOptions: { _id: false },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
class RiderLocation {
  @prop({ required: true, type: () => String, enum: ['Point'] })
  public type!: 'Point'

  @prop({ required: true, type: () => [Number] })
  public coordinates!: [number, number]
}

@modelOptions({
  schemaOptions: {
    collection: 'riders',
    timestamps: true,
  },
})
export class Rider {
  @prop({ required: true, unique: true, type: () => String })
  public userId!: string

  @prop({ required: true, type: () => String })
  public firstName!: string

  @prop({ required: true, type: () => String })
  public lastName!: string

  @prop({ required: true, type: () => String })
  public phoneNumber!: string

  @prop({ required: true, type: () => String, enum: ['motorcycle', 'bicycle', 'sidecar'] })
  public vehicleType!: 'motorcycle' | 'bicycle' | 'sidecar'

  @prop({ type: () => String })
  public plateNumber?: string

  @prop({ type: () => String })
  public licenseNumber?: string

  @prop({ default: false, type: () => Boolean })
  public isOnline!: boolean

  @prop({ default: false, type: () => Boolean })
  public isVerified!: boolean

  @prop({ type: () => RiderLocation, index: '2dsphere' })
  public lastLocation?: RiderLocation

  @prop({ default: 0, type: () => Number })
  public totalDeliveries!: number

  @prop({ default: 0, type: () => Number })
  public totalEarnings!: number
}

export const RiderModel = getModelForClass(Rider)

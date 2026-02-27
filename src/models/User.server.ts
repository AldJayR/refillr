import { prop, modelOptions, Severity } from '@typegoose/typegoose'
import { getModelForClass } from '@typegoose/typegoose'
import { Types } from 'mongoose'

@modelOptions({
  schemaOptions: { _id: false },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class SavedAddress {
  @prop({ required: true, type: () => String, enum: ['home', 'office', 'other'], default: 'other' })
  public label!: 'home' | 'office' | 'other'

  @prop({ required: true, type: () => [Number] })
  public coordinates!: [number, number]

  @prop({ required: true, type: () => String })
  public address!: string

  @prop({ type: () => String })
  public baranggay?: string

  @prop({ type: () => String })
  public city?: string

  @prop({ default: false, type: () => Boolean })
  public isDefault!: boolean
}

@modelOptions({
  schemaOptions: {
    collection: 'users',
    timestamps: true,
  },
})
export class User {
  @prop({ required: true, unique: true, type: () => String })
  public clerkId!: string

  @prop({ required: true, type: () => String })
  public email!: string

  @prop({ type: () => String })
  public firstName?: string

  @prop({ type: () => String })
  public lastName?: string

  @prop({ type: () => String })
  public phoneNumber?: string

  @prop({ type: () => [SavedAddress], default: [] })
  public savedAddresses!: SavedAddress[]

  @prop({ type: () => [Types.ObjectId], ref: 'Merchant', default: [] })
  public favoriteMerchants!: Types.ObjectId[]

  @prop({ type: () => [String], default: [] })
  public favoriteBrands!: string[]

  @prop({ required: true, type: () => String, enum: ['customer', 'merchant', 'rider', 'admin'], default: 'customer' })
  public role!: 'customer' | 'merchant' | 'rider' | 'admin'
}

export const UserModel = getModelForClass(User)
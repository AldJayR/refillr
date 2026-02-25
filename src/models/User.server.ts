import { prop, modelOptions, Severity } from '@typegoose/typegoose'
import { getModelForClass } from '@typegoose/typegoose'
import { Types } from 'mongoose'

@modelOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class SavedAddress {
  @prop({ required: true, enum: ['home', 'office', 'other'], default: 'other' })
  public label!: 'home' | 'office' | 'other'

  @prop({ required: true, type: () => [Number] })
  public coordinates!: [number, number]

  @prop({ required: true })
  public address!: string

  @prop()
  public baranggay?: string

  @prop()
  public city?: string

  @prop({ default: false })
  public isDefault!: boolean
}

@modelOptions({
  schemaOptions: {
    collection: 'users',
    timestamps: true,
  },
})
export class User {
  @prop({ required: true, unique: true })
  public clerkId!: string

  @prop({ required: true })
  public email!: string

  @prop()
  public firstName?: string

  @prop()
  public lastName?: string

  @prop()
  public phoneNumber?: string

  @prop({ type: () => [SavedAddress], default: [] })
  public savedAddresses!: SavedAddress[]

  @prop({ type: () => [Types.ObjectId], ref: 'Merchant', default: [] })
  public favoriteMerchants!: Types.ObjectId[]

  @prop({ type: () => [String], default: [] })
  public favoriteBrands!: string[]

  @prop({ required: true, enum: ['customer', 'merchant', 'rider', 'admin'], default: 'customer' })
  public role!: 'customer' | 'merchant' | 'rider' | 'admin'
}

export const UserModel = getModelForClass(User)
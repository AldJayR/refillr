import { prop, modelOptions, Severity, getModelForClass } from '@typegoose/typegoose'

@modelOptions({
  schemaOptions: { _id: false },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class DOEPriceEntry {
  @prop({ required: true, type: () => String })
  public brand!: string

  @prop({ required: true, type: () => String })
  public size!: string

  @prop({ required: true, type: () => Number })
  public suggestedRetailPrice!: number

  @prop({ required: true, type: () => Number })
  public maxRetailPrice!: number
}

@modelOptions({
  schemaOptions: {
    collection: 'doe_config',
    timestamps: true,
  },
})
export class DOEConfig {
  @prop({ required: true, type: () => String })
  public weekLabel!: string

  @prop({ required: true, type: () => Date })
  public effectiveDate!: Date

  @prop({ required: true, type: () => [DOEPriceEntry] })
  public prices!: DOEPriceEntry[]

  @prop({ default: true, type: () => Boolean })
  public isActive!: boolean
}

export const DOEConfigModel = getModelForClass(DOEConfig)

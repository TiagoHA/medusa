import { Transform } from "class-transformer"
import { IsOptional, IsString, IsNumber, IsDate } from "class-validator"
import { Type } from "class-transformer"
import { IsType } from "../utils/is-type"

export type PartialPick<T, K extends keyof T> = {
  [P in K]?: T[P]
}

export interface FindConfig<Entity> {
  select?: (keyof Entity)[]
  skip?: number
  take?: number
  relations?: string[]
  order?: "ASC" | "DESC"
}

export type PaginatedResponse = { limit: number; offset: number; count: number }

export class DateComparisonOperator {
  @IsOptional()
  @IsDate()
  @Transform(({ value }) =>
    !isNaN(Date.parse(value)) ? new Date(value) : new Date(Number(value) * 1000)
  )
  lt?: Date

  @IsOptional()
  @IsDate()
  @Transform(({ value }) =>
    !isNaN(Date.parse(value)) ? new Date(value) : new Date(Number(value) * 1000)
  )
  gt?: Date

  @IsOptional()
  @IsDate()
  @Transform(({ value }) =>
    !isNaN(Date.parse(value)) ? new Date(value) : new Date(Number(value) * 1000)
  )
  gte?: Date

  @IsOptional()
  @IsDate()
  @Transform(({ value }) =>
    !isNaN(Date.parse(value)) ? new Date(value) : new Date(Number(value) * 1000)
  )
  lte?: Date
}

export class StringComparisonOperator {
  @IsString()
  @IsOptional()
  lt?: string

  @IsString()
  @IsOptional()
  gt?: string

  @IsString()
  @IsOptional()
  gte?: string

  @IsString()
  @IsOptional()
  lte?: string
}

export class NumericalComparisonOperator {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lt?: number

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  gt?: number

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  gte?: number

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lte?: number
}

export class AddressPayload {
  @IsOptional()
  @IsString()
  first_name: string

  @IsOptional()
  @IsString()
  last_name: string

  @IsOptional()
  @IsString()
  phone: string

  @IsOptional()
  metadata: object

  @IsOptional()
  @IsString()
  company: string

  @IsOptional()
  @IsString()
  address_1: string

  @IsOptional()
  @IsString()
  address_2: string

  @IsOptional()
  @IsString()
  city: string

  @IsOptional()
  @IsString()
  country_code: string

  @IsOptional()
  @IsString()
  province: string

  @IsOptional()
  @IsString()
  postal_code: string
}

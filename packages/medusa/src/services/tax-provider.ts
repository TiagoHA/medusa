import { MedusaError } from "medusa-core-utils"
import { AwilixContainer } from "awilix"
import { BaseService } from "medusa-interfaces"
import { EntityManager } from "typeorm"
import Redis from "ioredis"

import { UserRepository } from "../repositories/user"

import { TaxLineRepository } from "../repositories/tax-line"
import { TaxLine } from "../models/tax-line"
import { Region } from "../models/region"
import { Cart } from "../models/cart"
import { Order } from "../models/order"
import { ITaxService, TaxCalculationLine } from "../interfaces/tax-service"
import { TaxRate } from "../models/tax-rate"

import { TaxServiceRate } from "../types/tax-service"

import EventBusService from "./event-bus"
import ProductTaxRateService from "./product-tax-rate"

const CACHE_TIME = 30 // seconds

/**
 * Provides layer to manipulate users.
 * @extends BaseService
 */
class TaxProviderService extends BaseService {
  private container_: AwilixContainer
  private eventBus_: EventBusService
  private manager_: EntityManager
  private transactionManager_: EntityManager
  private productTaxRateService_: ProductTaxRateService
  private taxLineRepo_: typeof TaxLineRepository
  private redis_: Redis

  constructor(container: AwilixContainer) {
    super()

    this.container_ = container
    this.taxLineRepo_ = container["taxLineRepository"]
    this.productTaxRateService_ = container["productTaxRateService"]
    this.eventBus_ = container["eventBusService"]
    this.manager_ = container["manager"]
    this.redis_ = container["redisClient"]
  }

  withTransaction(transactionManager: EntityManager): TaxProviderService {
    if (!transactionManager) {
      return this
    }

    const cloned = new TaxProviderService(this.container_)

    cloned.transactionManager_ = transactionManager
    return cloned
  }

  getTaxProvider(region: Region): ITaxService {
    // TODO: Determine region tax calculator
    return this.container_["systemTaxService"] as ITaxService
  }

  async getTaxLines(order: Cart | Order): Promise<TaxLine[]> {
    const calculationLines: TaxCalculationLine[] = await Promise.all(
      order.items.map(async (l) => {
        return {
          item: l,
          rates: await this.getRegionRatesForProduct(
            l.variant.product_id,
            order.region
          ),
        }
      })
    )

    const taxProvider = this.getTaxProvider(order.region)
    const providerLines = await taxProvider.calculateLineItemTaxes(
      calculationLines,
      {
        shippingAddress: order.shipping_address,
        customer: order.customer,
        region: order.region,
      }
    )

    const taxLineRepo: TaxLineRepository = this.manager_.getCustomRepository(
      this.taxLineRepo_
    )

    return providerLines.map((pl) => {
      return taxLineRepo.create({
        item_id: pl.item_id,
        rate: pl.rate,
        name: pl.name,
        code: pl.code,
        metadata: pl.metadata,
      })
    })
  }

  async getRegionRatesForProduct(
    productId: string,
    region: Region
  ): Promise<TaxServiceRate[]> {
    const cacheHit = await this.getCacheHit(productId, region.id)
    if (cacheHit) {
      return cacheHit
    }

    let toReturn: TaxServiceRate[]
    if (region.tax_rates.length > 0) {
      const productRates = await this.productTaxRateService_.list({
        product_id: productId,
        rate_id: region.tax_rates.map((tr) => tr.id),
      })

      if (productRates.length > 0) {
        toReturn = productRates.map((pr) => {
          const rate = region.tax_rates.find((rr) => rr.id === pr.rate_id)
          if (!rate) {
            throw new MedusaError(
              MedusaError.Types.UNEXPECTED_STATE,
              "An error occured while calculating tax rates"
            )
          }

          return {
            rate: rate.rate,
            name: rate.name,
            code: rate.code,
          }
        })
      }
    }

    toReturn = [
      {
        rate: region.tax_rate,
        name: "default",
        code: "default",
      },
    ]

    await this.setCache(productId, region.id, toReturn)

    return toReturn
  }

  getCacheKey(productId: string, regionId: string): string {
    return `txrtcache:${productId}:${regionId}`
  }

  async setCache(
    productId: string,
    regionId: string,
    value: TaxServiceRate[]
  ): Promise<void> {
    const cacheKey = this.getCacheKey(productId, regionId)
    return await this.redis_.set(
      cacheKey,
      JSON.stringify(value),
      "EX",
      CACHE_TIME
    )
  }

  async getCacheHit(
    productId: string,
    regionId: string
  ): Promise<TaxServiceRate[] | false> {
    const cacheKey = this.getCacheKey(productId, regionId)

    try {
      const cacheHit = await this.redis_.get(cacheKey)
      if (cacheHit) {
        // TODO: Validate that cache has correct data
        const parsedResults = JSON.parse(cacheHit) as TaxServiceRate[]
        return parsedResults
      }
    } catch (_) {
      // noop - cache validation failed
      await this.redis_.del(cacheKey)
    }

    return false
  }
}

export default TaxProviderService

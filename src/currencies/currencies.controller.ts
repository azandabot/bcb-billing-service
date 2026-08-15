import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/filters/error-response.dto';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import {
  CurrencyResponseDto,
  toCurrencyResponse,
} from './dto/currency-response.dto';

@ApiTags('currencies')
@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a currency and its tariff',
    description:
      'Both fees are fixed at registration time. Omitting transactionFeeGbp applies the configured default.',
  })
  @ApiCreatedResponse({ type: CurrencyResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The currency is already registered',
  })
  async create(@Body() dto: CreateCurrencyDto): Promise<CurrencyResponseDto> {
    return toCurrencyResponse(await this.currenciesService.register(dto));
  }
}

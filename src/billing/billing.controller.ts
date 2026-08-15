import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/filters/error-response.dto';
import { BillingService } from './billing.service';
import { BillResponseDto, toBillResponse } from './dto/bill-response.dto';
import { CreateBillDto } from './dto/create-bill.dto';

@ApiTags('billing')
@Controller('accounts/:accountId')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('bill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate the bill for an account over a billing period',
    description:
      'The period is half-open: billingPeriodStart is included and billingPeriodEnd is excluded, so consecutive periods never bill the same day twice. Nothing is persisted.',
  })
  @ApiParam({ name: 'accountId', example: 'acc-001' })
  @ApiOkResponse({ type: BillResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'The account does not exist',
  })
  async bill(
    @Param('accountId') accountId: string,
    @Body() dto: CreateBillDto,
  ): Promise<BillResponseDto> {
    return toBillResponse(
      await this.billingService.billAccount(accountId, dto),
    );
  }
}

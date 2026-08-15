import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/filters/error-response.dto';
import { AccountsService } from './accounts.service';
import {
  AccountResponseDto,
  toAccountResponse,
} from './dto/account-response.dto';
import { CreateAccountDto } from './dto/create-account.dto';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({
    summary: 'Open a customer account',
    description:
      'The promotional window runs for discountDays from the UTC day the account is created.',
  })
  @ApiCreatedResponse({ type: AccountResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The accountId is already in use',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'The currency is not registered',
  })
  async create(@Body() dto: CreateAccountDto): Promise<AccountResponseDto> {
    return toAccountResponse(await this.accountsService.open(dto));
  }
}

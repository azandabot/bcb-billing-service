import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 422 })
  statusCode!: number;

  @ApiProperty({ example: 'CURRENCY_NOT_REGISTERED' })
  code!: string;

  @ApiProperty({ example: "Currency 'USDT' is not registered" })
  message!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['billingPeriodEnd must be after billingPeriodStart'],
    description: 'Present only when request validation failed.',
  })
  details?: string[];

  @ApiProperty({ example: '/accounts' })
  path!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp!: string;
}

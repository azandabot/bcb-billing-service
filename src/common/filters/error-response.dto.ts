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

  @ApiPropertyOptional({
    example: '3f8a1c2e-9b4d-4a71-8f2e-6c5d0b1a7e93',
    description: 'Correlation id, also returned in the x-request-id header.',
  })
  requestId?: string;

  @ApiProperty({ example: '/accounts' })
  path!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  timestamp!: string;
}

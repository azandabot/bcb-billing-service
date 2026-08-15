import { AppConfig } from './app-config.type';

export const DEFAULT_PORT = 3000;
export const DEFAULT_TRANSACTION_FEE_GBP = 0.3;

export const configuration = (): AppConfig => ({
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  transactionFeeGbp: Number(
    process.env.TRANSACTION_FEE_GBP ?? DEFAULT_TRANSACTION_FEE_GBP,
  ),
});

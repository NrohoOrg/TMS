import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type SmsSendResult = {
  success: boolean;
  code: string | null;
  messageId: string | null;
  providerResponse: string;
};

const ICOSNET_SUCCESS_CODE = '1701';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(destination: string, message: string, language: 'fr' | 'ar' = 'fr'): Promise<SmsSendResult> {
    const baseUrl = this.configService.get<string>('ICOSNET_SMS_BASE_URL');
    const username = this.configService.get<string>('ICOSNET_SMS_USERNAME');
    const password = this.configService.get<string>('ICOSNET_SMS_PASSWORD');
    const source = this.configService.get<string>('ICOSNET_SMS_SOURCE') ?? 'Nroho';
    const configuredType = this.configService.get<string>('ICOSNET_SMS_TYPE') ?? '0';
    const dlr = this.configService.get<string>('ICOSNET_SMS_DLR') ?? '1';

    if (!baseUrl || !username || !password) {
      this.logger.warn('SMS provider credentials missing — skipping send');
      return { success: false, code: null, messageId: null, providerResponse: 'missing_credentials' };
    }

    const normalizedDest = SmsService.normalizeDzPhone(destination);
    if (!normalizedDest) {
      this.logger.warn(`Invalid destination phone: ${destination}`);
      return { success: false, code: null, messageId: null, providerResponse: 'invalid_destination' };
    }

    const useUnicode = language === 'ar';
    const type = useUnicode ? '2' : configuredType;
    const payload = useUnicode ? SmsService.toUcs2Hex(message) : message;

    try {
      const response = await axios.get<string>(baseUrl, {
        params: {
          username,
          password,
          message: payload,
          source,
          destination: normalizedDest,
          type,
          dlr,
        },
        timeout: 10_000,
        responseType: 'text',
        transformResponse: [(data: unknown) => data],
      });

      const raw = String(response.data ?? '').trim();
      const [code, , messageId] = raw.split('|');
      const success = code === ICOSNET_SUCCESS_CODE;

      if (success) {
        this.logger.log(`SMS sent to ${normalizedDest} (id=${messageId ?? 'n/a'})`);
      } else {
        this.logger.warn(`SMS to ${normalizedDest} failed: ${raw}`);
      }

      return {
        success,
        code: code ?? null,
        messageId: messageId ?? null,
        providerResponse: raw,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';
      this.logger.error(`SMS request to ${normalizedDest} threw: ${reason}`);
      return { success: false, code: null, messageId: null, providerResponse: reason };
    }
  }

  static normalizeDzPhone(input: string): string | null {
    if (!input) return null;
    const cleaned = input.replace(/[\s.\-()]/g, '');
    let digits: string;
    if (cleaned.startsWith('+213')) {
      digits = cleaned.slice(4);
    } else if (cleaned.startsWith('00213')) {
      digits = cleaned.slice(5);
    } else if (cleaned.startsWith('213')) {
      digits = cleaned.slice(3);
    } else if (cleaned.startsWith('0')) {
      digits = cleaned.slice(1);
    } else {
      digits = cleaned;
    }
    if (!/^[5-7]\d{8}$/.test(digits)) return null;
    return `213${digits}`;
  }

  private static toUcs2Hex(message: string): string {
    let hex = '';
    for (const ch of message) {
      const code = ch.codePointAt(0) ?? 0;
      if (code > 0xffff) {
        const offset = code - 0x10000;
        const high = 0xd800 + (offset >> 10);
        const low = 0xdc00 + (offset & 0x3ff);
        hex += high.toString(16).padStart(4, '0');
        hex += low.toString(16).padStart(4, '0');
      } else {
        hex += code.toString(16).padStart(4, '0');
      }
    }
    return hex.toUpperCase();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export type SmsSendResult = {
  success: boolean;
  code: string | null;
  messageId: string | null;
  providerResponse: string;
};

const ICOSNET_SUCCESS_CODE = '1701';
const DEFAULT_DAILY_LIMIT = 50;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** Number of SMS sends already attempted today (UTC). */
  async sendsToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    return this.prisma.smsLog.count({
      where: { sentAt: { gte: startOfDay, lt: endOfDay } },
    });
  }

  /** Configured daily limit (admin-tunable on Config). Falls back to 50. */
  async dailyLimit(): Promise<number> {
    const cfg = await this.prisma.config.findUnique({
      where: { id: 1 },
      select: { smsDailyLimit: true },
    });
    return cfg?.smsDailyLimit ?? DEFAULT_DAILY_LIMIT;
  }

  /**
   * Returns the phone number to actually send to. When SMS_TEST_OVERRIDE_NUMBER
   * is set in env, every SMS is routed there for safety during testing. When
   * empty/missing, the real driver phone is used.
   */
  resolveDestination(driverPhone: string): string {
    const override = (this.configService.get<string>('SMS_TEST_OVERRIDE_NUMBER') ?? '').trim();
    return override.length > 0 ? override : driverPhone;
  }

  async send(destination: string, message: string, language: 'fr' | 'ar' = 'fr'): Promise<SmsSendResult> {
    const baseUrl = this.configService.get<string>('ICOSNET_SMS_BASE_URL');
    const username = this.configService.get<string>('ICOSNET_SMS_USERNAME');
    const password = this.configService.get<string>('ICOSNET_SMS_PASSWORD');
    const source = this.configService.get<string>('ICOSNET_SMS_SOURCE') ?? 'Nroho';
    const configuredType = this.configService.get<string>('ICOSNET_SMS_TYPE') ?? '0';
    const dlr = this.configService.get<string>('ICOSNET_SMS_DLR') ?? '1';

    // Master kill-switch (admin-tunable). Off during demos/tests so we don't
    // burn provider credits. Returns a no-op success=false without touching
    // the provider or recording an SmsLog row.
    const cfg = await this.prisma.config.findUnique({
      where: { id: 1 },
      select: { smsEnabled: true },
    });
    if (cfg && cfg.smsEnabled === false) {
      this.logger.log(`SMS disabled in config — skipping send to ${destination}`);
      return { success: false, code: null, messageId: null, providerResponse: 'sms_disabled' };
    }

    if (!baseUrl || !username || !password) {
      this.logger.warn('SMS provider credentials missing — skipping send');
      return { success: false, code: null, messageId: null, providerResponse: 'missing_credentials' };
    }

    const normalizedDest = SmsService.normalizeDzPhone(destination);
    if (!normalizedDest) {
      this.logger.warn(`Invalid destination phone: ${destination}`);
      return { success: false, code: null, messageId: null, providerResponse: 'invalid_destination' };
    }

    // Daily quota gate. Only counted for sends that get this far (a real
    // attempt to hit the provider). Misconfigured/invalid attempts above are
    // not counted against the quota.
    const limit = await this.dailyLimit();
    const sentToday = await this.sendsToday();
    if (sentToday >= limit) {
      this.logger.warn(
        `SMS daily limit reached (${sentToday}/${limit}) — skipping send to ${normalizedDest}`,
      );
      return {
        success: false,
        code: null,
        messageId: null,
        providerResponse: 'daily_limit_reached',
      };
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

      // Persist the attempt for daily-quota accounting + audit. Errors here
      // must not crash the caller — the SMS was either sent or not, the log
      // is just bookkeeping.
      await this.recordAttempt(normalizedDest, success, code ?? null, raw);

      return {
        success,
        code: code ?? null,
        messageId: messageId ?? null,
        providerResponse: raw,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';
      this.logger.error(`SMS request to ${normalizedDest} threw: ${reason}`);
      await this.recordAttempt(normalizedDest, false, null, reason);
      return { success: false, code: null, messageId: null, providerResponse: reason };
    }
  }

  private async recordAttempt(
    destination: string,
    success: boolean,
    providerCode: string | null,
    providerResponse: string,
  ): Promise<void> {
    try {
      await this.prisma.smsLog.create({
        data: { destination, success, providerCode, providerResponse },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write SmsLog row: ${err instanceof Error ? err.message : 'unknown_error'}`,
      );
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

# SMS Implementation Report — NrohoServer

## Provider
**Icosnet** (Algerian SMS provider) — direct HTTP GET API, no SDK required.
- Endpoint: `https://smsapi.icosnet.com:8443/bulksms/bulksms`
- Response format: `<code>|<destination>|<message_id>` — success code is `1701`

## Dependencies
No third-party SMS package. Uses Laravel's HTTP facade (Guzzle under the hood, already in [composer.json](composer.json#L14)).

## Credentials (env vars)
Defined in [.env](.env#L50-L55) and mapped via [config/services.php:60-71](config/services.php#L60-L71):

```ini
ICOSNET_SMS_BASE_URL=https://smsapi.icosnet.com:8443/bulksms/bulksms
ICOSNET_SMS_USERNAME=your_username
ICOSNET_SMS_PASSWORD=your_password
ICOSNET_SMS_SOURCE=Nroho        # sender ID, max 11 alphanumeric
ICOSNET_SMS_TYPE=0              # 0 = GSM-7, 2 = Unicode (UTF-16BE)
ICOSNET_SMS_DLR=1               # delivery report flag
```

## Core service
[app/Services/SmsService.php](app/Services/SmsService.php) — single static method `SmsService::send($destination, $message, $language)`:
- Auto-switches to Unicode (type=2) when `$language === 'ar'` and hex-encodes the message as UCS-2/UTF-16BE
- Sends GET with query params: `username, password, message, source, destination, type, dlr`
- Returns `['success' => bool, 'code' => string, 'message_id' => ?string, 'provider_response' => string]`
- 10 sec timeout, exception-safe

## Triggers
1. **OTP verification** — [app/Http/Controllers/Auth/AuthController.php:145-257](app/Http/Controllers/Auth/AuthController.php#L145-L257) (`sendSmsOtp`). FCM-first, SMS-fallback. Rate limited: 30 sec cooldown + 2/min sliding window.
2. **Bulk campaigns** — [app/Console/Commands/BulkSmsSendCommand.php](app/Console/Commands/BulkSmsSendCommand.php) — `php artisan sms:send-once [--dry-run] [--campaign=prices-up] [--only=+213…]`.

## Phone normalization
[AuthController.php:440-477](app/Http/Controllers/Auth/AuthController.php#L440-L477) — `normalizeDzPhone()` accepts `0XXX…`, `00213…`, `+213…` (with spaces/dashes/dots) and outputs E.164 `+213XXXXXXXXX`. Validation regex at line 118.

## To replicate in another project
1. Copy [SmsService.php](app/Services/SmsService.php) (Laravel) — or port the GET request + UCS-2 hex encoding logic to your stack.
2. Add the 6 env vars above and a `config/services.php` entry under key `icosnet_sms`.
3. Get credentials (`USERNAME`, `PASSWORD`, approved `SOURCE`/sender ID) from Icosnet account.
4. Reuse phone normalization if also targeting Algeria; otherwise adapt to local format.
5. Optionally port the rate-limiter (cache-based cooldown) and the Artisan bulk command pattern.

Note: there is no `.env.example` in the repo — credentials live only in `.env`. Pull the actual values from there when migrating.

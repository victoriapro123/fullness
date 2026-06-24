# Supabase Auth Email Templates

Plantillas HTML para los correos de Supabase Auth de Fullness Lab.

## Autenticacion

- `01-confirm-signup.html`: Confirm sign up
- `02-invite-user.html`: Invite user
- `03-magic-link-or-otp.html`: Magic link or OTP
- `04-change-email-address.html`: Change email address
- `05-reset-password.html`: Reset password
- `06-reauthentication.html`: Reauthentication

## Notificaciones De Seguridad

- `07-password-changed.html`: Password changed
- `08-email-address-changed.html`: Email address changed
- `09-phone-number-changed.html`: Phone number changed
- `10-sign-in-method-linked.html`: Sign-in method linked
- `11-sign-in-method-removed.html`: Sign-in method removed
- `12-mfa-method-added.html`: MFA / verification method added
- `13-mfa-method-removed.html`: MFA / verification method removed

Variables usadas segun Supabase: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .OldEmail }}`, `{{ .Phone }}`, `{{ .OldPhone }}`, `{{ .Provider }}` y `{{ .FactorType }}`.

Nota de compatibilidad: los templates no usan `<img>` ni logos remotos. El encabezado usa una marca Fullness Lab hecha con HTML/texto inline para evitar logos rotos o bloqueados por clientes de correo como Outlook.

const registrationError = (field, message) => Object.assign(new Error(message), {field});

export function normalizeMemberRegistration(input = {}) {
  const name = String(input.name || '').trim().replace(/\s+/g, ' ');
  const email = String(input.email || '').trim().toLowerCase();
  const phone = String(input.phone || '').trim().replace(/\s+/g, ' ');
  const password = typeof input.password === 'string' ? input.password : '';
  if (name.length < 2 || name.length > 120) throw registrationError('name', 'Ingresa tu nombre, entre 2 y 120 caracteres.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw registrationError('email', 'Ingresa un correo electrónico válido.');
  const digits = phone.replace(/\D/g, '');
  if (phone.length > 30 || digits.length < 8 || digits.length > 20 || !/^[+\d\s().-]+$/.test(phone)) throw registrationError('phone', 'Ingresa tu teléfono con código de país.');
  if (password.length < 8 || password.length > 128) throw registrationError('password', 'Elige una contraseña de 8 a 128 caracteres.');
  return {name, email, phone, password};
}

export async function registerMember(supabase, input, {redirectTo} = {}) {
  const data = normalizeMemberRegistration(input);
  if (!supabase?.auth?.signUp) throw new Error('No pudimos conectar. Inténtalo nuevamente en unos minutos.');
  const options = {data: {full_name: data.name, phone: data.phone}};
  if (redirectTo) {
    const url = new URL(redirectTo);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('No pudimos preparar el acceso. Inténtalo nuevamente.');
    options.emailRedirectTo = url.href;
  }
  // Profile trigger copies these descriptive fields; they never grant roles or Rewards.
  const result = await supabase.auth.signUp({email: data.email, password: data.password, options});
  if (result.error) {
    const status = Number(result.error.status || 0);
    throw new Error(status === 429
      ? 'Espera unos minutos antes de intentarlo nuevamente.'
      : 'No pudimos crear tu cuenta. Si ya tienes una, inicia sesión o recupera tu contraseña.');
  }
  return result.data;
}

import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_NAME_LENGTH = 80;
export const MAX_EMAIL_LENGTH = 254;

/**
 * Exige domínio com ponto (`nome@site.com`).
 *
 * O `Validators.email` do Angular aceita `nome@site`, que é válido na rede
 * interna de uma empresa mas quase sempre é erro de digitação aqui.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrength {
  readonly level: PasswordStrengthLevel;

  /** De 0 (vazia) a 4 (forte), para desenhar o medidor. */
  readonly score: number;
  readonly label: string;
}

const STRENGTH_BY_SCORE: readonly PasswordStrength[] = [
  { level: 'empty', score: 0, label: '' },
  { level: 'weak', score: 1, label: 'Fraca' },
  { level: 'fair', score: 2, label: 'Razoável' },
  { level: 'good', score: 3, label: 'Boa' },
  { level: 'strong', score: 4, label: 'Forte' },
];

export const emailAddressValidator: ValidatorFn = (control) => {
  const value = control.value as unknown;

  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  return EMAIL_PATTERN.test(value.trim()) ? null : { emailAddress: true };
};

/** Senha aceita: tamanho mínimo e ao menos uma letra e um número. */
export const passwordRulesValidator: ValidatorFn = (control) => {
  const value = control.value as unknown;

  if (typeof value !== 'string' || value === '') {
    return null;
  }

  const isLongEnough = value.length >= MIN_PASSWORD_LENGTH;
  const hasLetter = /\p{L}/u.test(value);
  const hasDigit = /\d/.test(value);

  return isLongEnough && hasLetter && hasDigit ? null : { passwordRules: true };
};

/**
 * Validador de grupo: o campo de confirmação precisa repetir o original.
 *
 * O erro vai para o grupo, e não para o campo, porque é uma relação entre
 * dois valores — a tela decide em qual deles mostrar a mensagem.
 */
export function matchingFieldsValidator(fieldName: string, confirmationName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const original = group.get(fieldName)?.value as unknown;
    const confirmation = group.get(confirmationName)?.value as unknown;

    if (!confirmation) {
      return null;
    }

    return original === confirmation ? null : { fieldsMismatch: true };
  };
}

/**
 * Nota de 0 a 4 para o medidor de força.
 *
 * É só um empurrão para uma senha melhor; quem decide se a senha é aceita é
 * `passwordRulesValidator`, e quem decide de verdade é o servidor.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (password === '') {
    return STRENGTH_BY_SCORE[0];
  }

  const criteria = [
    password.length >= MIN_PASSWORD_LENGTH,
    password.length >= 12,
    /\p{Ll}/u.test(password) && /\p{Lu}/u.test(password),
    /\d/.test(password),
    /[^\p{L}\d]/u.test(password),
  ];
  const metCriteria = criteria.filter(Boolean).length;

  // Curta demais é sempre fraca, por mais variada que seja.
  const score = password.length < MIN_PASSWORD_LENGTH ? 1 : Math.min(Math.max(metCriteria - 1, 1), 4);

  return STRENGTH_BY_SCORE[score];
}

/** O erro só aparece depois que a pessoa mexeu no campo ou tentou enviar. */
export function hasVisibleError(control: AbstractControl): boolean {
  return control.invalid && (control.touched || control.dirty);
}

/**
 * Erro visível do campo de confirmação, contando também a divergência — que
 * é erro do grupo (`matchingFieldsValidator`), e não do próprio campo.
 */
export function hasVisibleConfirmationError(group: AbstractControl, confirmationName: string): boolean {
  const confirmation = group.get(confirmationName);

  if (!confirmation) {
    return false;
  }

  const hasInteracted = confirmation.touched || confirmation.dirty;

  return hasVisibleError(confirmation) || (hasInteracted && group.hasError('fieldsMismatch'));
}

import { FormControl, FormGroup } from '@angular/forms';

import {
  emailAddressValidator,
  evaluatePasswordStrength,
  hasVisibleConfirmationError,
  matchingFieldsValidator,
  passwordRulesValidator,
} from './auth-form';

describe('emailAddressValidator', () => {
  const validate = (value: string) => emailAddressValidator(new FormControl(value));

  it('aceita e-mails completos', () => {
    expect(validate('ana@exemplo.com')).toBeNull();
    expect(validate('  ana.souza+site@exemplo.com.br  ')).toBeNull();
  });

  it('deixa o campo vazio para o Validators.required', () => {
    expect(validate('')).toBeNull();
  });

  it('recusa e-mails sem domínio completo', () => {
    expect(validate('ana')).toEqual({ emailAddress: true });
    expect(validate('ana@exemplo')).toEqual({ emailAddress: true });
    expect(validate('ana @exemplo.com')).toEqual({ emailAddress: true });
  });
});

describe('passwordRulesValidator', () => {
  const validate = (value: string) => passwordRulesValidator(new FormControl(value));

  it('aceita oito caracteres ou mais com letra e número', () => {
    expect(validate('pedro123')).toBeNull();
    expect(validate('ação2026')).toBeNull();
  });

  it('recusa senhas curtas, só de letras ou só de números', () => {
    expect(validate('abc123')).toEqual({ passwordRules: true });
    expect(validate('abcdefgh')).toEqual({ passwordRules: true });
    expect(validate('12345678')).toEqual({ passwordRules: true });
  });

  it('deixa o campo vazio para o Validators.required', () => {
    expect(validate('')).toBeNull();
  });
});

describe('evaluatePasswordStrength', () => {
  it('não avalia a senha vazia', () => {
    expect(evaluatePasswordStrength('').level).toBe('empty');
  });

  it('chama de fraca qualquer senha curta, por mais variada que seja', () => {
    expect(evaluatePasswordStrength('A1!b').level).toBe('weak');
  });

  it('sobe de nível conforme a senha fica mais variada e longa', () => {
    expect(evaluatePasswordStrength('pedro123').level).toBe('weak');
    expect(evaluatePasswordStrength('Pedro123').level).toBe('fair');
    expect(evaluatePasswordStrength('Pedro123!').level).toBe('good');
    expect(evaluatePasswordStrength('Pedro123!kart').level).toBe('strong');
  });
});

describe('confirmação de senha', () => {
  function buildForm(password: string, confirmation: string): FormGroup {
    return new FormGroup(
      {
        password: new FormControl(password),
        confirmPassword: new FormControl(confirmation),
      },
      { validators: matchingFieldsValidator('password', 'confirmPassword') },
    );
  }

  it('marca o grupo quando as senhas não batem', () => {
    expect(buildForm('pedro123', 'pedro124').hasError('fieldsMismatch')).toBeTrue();
    expect(buildForm('pedro123', 'pedro123').hasError('fieldsMismatch')).toBeFalse();
  });

  it('não reclama enquanto a confirmação está vazia', () => {
    expect(buildForm('pedro123', '').hasError('fieldsMismatch')).toBeFalse();
  });

  it('só mostra a divergência depois que a pessoa mexeu na confirmação', () => {
    const form = buildForm('pedro123', 'pedro124');

    expect(hasVisibleConfirmationError(form, 'confirmPassword')).toBeFalse();

    form.controls['confirmPassword'].markAsTouched();

    expect(hasVisibleConfirmationError(form, 'confirmPassword')).toBeTrue();
  });
});

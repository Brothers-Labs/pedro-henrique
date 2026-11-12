import { expect, test } from '@playwright/test';

test('the season pass asks for an adult before a real payment, and the plans keep their Pix checkout', async ({ page }) => {
  await page.goto('/pedro-aventura/passe');
  await page.getByRole('button', { name: /Pagar R\$\s*1,99/ }).click();

  const passDialog = page.getByRole('dialog', { name: 'Passe VIP' });

  await expect(passDialog.getByRole('heading', { name: 'Chame um adulto' })).toBeVisible();
  await expect(passDialog.getByRole('link', { name: 'Entrar na conta' })).toHaveAttribute('href', '/entrar');
  await passDialog.getByRole('button', { name: 'Fechar o pagamento' }).click();
  await expect(passDialog).toBeHidden();
  await expect(page.getByRole('button', { name: /Liberar por 199/ })).toBeVisible();

  await page.goto('/planos');
  await page.getByRole('button', { name: /Assinar o Completo/ }).click();

  const planDialog = page.getByRole('dialog', { name: 'Plano Completo' });

  await expect(planDialog.getByText('Valor a pagar')).toBeVisible();
  await expect(planDialog.getByText('por mês')).toBeVisible();
  // O rádio nativo fica escondido atrás do cartão do plano: o toque é no rótulo.
  await planDialog.locator('label', { hasText: 'Plano Premium' }).click();
  await expect(page.getByRole('dialog', { name: 'Plano Premium' })).toBeVisible();
});

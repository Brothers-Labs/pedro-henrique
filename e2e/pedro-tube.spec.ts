import { expect, test } from '@playwright/test';

test('PedroTube plays videos, creates a channel, an animated video, a custom effect and an uploaded video', async ({ page }) => {
  test.slow();
  await page.goto('/pedro-tube');
  await expect(page.getByRole('heading', { level: 1, name: 'PedroTube' })).toBeVisible();

  // Assistir um vídeo pronto: o player toca a animação com o efeito dele.
  await page.getByRole('link', { name: 'Como fazer vídeos', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Como fazer vídeos' })).toBeVisible();
  const player = page.locator('app-tube-player');
  await expect(player.locator('app-effect-stage')).toHaveAttribute('data-effect', 'neon');
  await expect(page.getByText('1 visualização •')).toBeVisible();

  const subscribe = page.getByRole('button', { name: 'Inscreva-se' });
  await subscribe.click();
  await expect(page.getByRole('button', { name: 'Inscrito' })).toHaveAttribute('aria-pressed', 'true');
  const love = page.getByRole('button', { name: 'AMO', exact: true });
  await love.click();
  await expect(love).toHaveAttribute('aria-pressed', 'true');

  // Experimentar outro efeito só muda o player; vídeo pronto não pode ser alterado.
  await page.getByRole('group', { name: 'Efeito do player' }).getByRole('button', { name: 'Gelo' }).click();
  await expect(player.locator('app-effect-stage')).toHaveAttribute('data-effect', 'gelo');
  await expect(page.getByRole('button', { name: /^Usar Gelo/ })).toHaveCount(0);

  // Criar canal.
  await page.getByRole('link', { name: 'Criar', exact: true }).click();
  await page.getByRole('tab', { name: 'Criar canal' }).click();
  await page.getByRole('textbox', { name: 'Nome do canal' }).fill('Canal do Dino');
  await page.getByRole('group', { name: 'Bolinha do canal' }).getByRole('button', { name: '🦖' }).click();
  await page.getByRole('group', { name: 'Cor do banner' }).getByRole('button', { name: 'Verde' }).click();
  await page.getByRole('button', { name: 'Criar canal' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Canal do Dino' })).toBeVisible();
  await expect(page.getByText('@canaldodino • 0 vídeos')).toBeVisible();

  // Criar um efeito.
  await page.getByRole('link', { name: 'Criar', exact: true }).click();
  await page.getByRole('tab', { name: 'Criar efeito' }).click();
  await page.getByRole('textbox', { name: 'Nome do efeito' }).fill('Dino Turbo');
  await page.getByRole('slider', { name: 'Foto antiga' }).fill('60');
  await page.getByRole('group', { name: 'Partículas' }).getByRole('button', { name: 'Corações' }).click();
  await page.getByRole('group', { name: 'Moldura' }).getByRole('button', { name: 'Ouro' }).click();
  const preview = page.getByRole('complementary', { name: 'Prévia do efeito' }).locator('app-effect-stage');
  await expect(preview).toHaveAttribute('data-frame', 'ouro');
  await expect(preview.locator('.stage__media')).toHaveCSS('filter', /sepia\(0\.6\)/);
  await page.getByRole('button', { name: 'Salvar efeito' }).click();
  await expect(page.getByText('Efeito Dino Turbo salvo!')).toBeVisible();

  // Criar um vídeo de animação no canal novo, com o efeito novo.
  await page.getByRole('link', { name: 'Usar' }).click();
  await expect(page.getByRole('tab', { name: 'Criar vídeo' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('combobox', { name: 'Canal' }).selectOption({ label: '🦖 Canal do Dino' });
  await page.getByRole('textbox', { name: 'Título do vídeo' }).fill('Meu dinossauro dançando');
  await page.getByRole('combobox', { name: 'Desenho da cena 1' }).selectOption('🦖');
  await page.getByRole('textbox', { name: 'Frase da cena 1' }).fill('Rawr! Olá!');
  await page.getByRole('button', { name: 'Adicionar cena' }).click();
  await page.getByRole('textbox', { name: 'Frase da cena 2' }).fill('Tchau!');
  await page.getByRole('combobox', { name: 'Tempo da cena 2' }).selectOption('2');
  await expect(page.getByRole('group', { name: 'Efeito do vídeo' }).getByRole('button', { name: 'Dino Turbo' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Publicar vídeo' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Meu dinossauro dançando' })).toBeVisible();
  await expect(player.locator('app-effect-stage')).toHaveAttribute('data-frame', 'ouro');
  await expect(player.getByText('0:05', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: /Canal do Dino/ }).first()).toBeVisible();

  // No próprio vídeo, dá para trocar o efeito de vez.
  await page.getByRole('group', { name: 'Efeito do player' }).getByRole('button', { name: 'Festa' }).click();
  await page.getByRole('button', { name: 'Usar Festa neste vídeo' }).click();
  await expect(page.getByText('Pronto! O vídeo agora usa o efeito Festa.')).toBeVisible();

  // Enviar um arquivo de vídeo: ele vai para o banco do navegador e toca na página do vídeo.
  await page.getByRole('link', { name: 'Criar', exact: true }).click();
  await page.getByRole('textbox', { name: 'Título do vídeo' }).fill('Vídeo do celular');
  await page.getByRole('group', { name: 'Como fazer o vídeo' }).getByRole('button', { name: 'Enviar vídeo' }).click();
  await page.getByLabel('Arquivo de vídeo').setInputFiles({ name: 'passeio.webm', mimeType: 'video/webm', buffer: Buffer.from('nao e um video de verdade') });
  await expect(page.getByText('✅ passeio.webm')).toBeVisible();
  await page.getByRole('button', { name: 'Publicar vídeo' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vídeo do celular' })).toBeVisible();
  await expect(page.locator('video.player__video')).toHaveAttribute('src', /^blob:/);

  // A busca encontra o vídeo novo e o pronto, sem ligar para acento.
  await page.getByRole('searchbox', { name: 'Buscar no PedroTube' }).fill('dinossauro');
  await page.getByRole('searchbox', { name: 'Buscar no PedroTube' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Resultados para “dinossauro”' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Meu dinossauro dançando', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'O dinossauro que foi para o gelo', exact: true })).toBeVisible();

  // Tudo continua lá depois de recarregar.
  await page.goto('/pedro-tube?canal=inscricoes');
  await expect(page.getByRole('link', { name: 'Como fazer vídeos', exact: true })).toBeVisible();
  await page.goto('/pedro-tube/estudio?aba=efeito');
  await expect(page.getByRole('button', { name: 'Apagar efeito Dino Turbo' })).toBeVisible();
  await page.goto('/pedro-tube');
  await page.getByRole('navigation', { name: 'Filtrar vídeos' }).getByRole('link', { name: 'Canal do Dino' }).click();
  await expect(page.getByRole('link', { name: 'Meu dinossauro dançando', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('pedro-tube.png'), fullPage: true });
});

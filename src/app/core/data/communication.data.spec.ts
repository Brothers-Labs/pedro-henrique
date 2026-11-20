import { COMMUNICATION_CARDS, COMMUNICATION_CATEGORIES } from './communication.data';

describe('COMMUNICATION_CARDS', () => {
  const categoryIds = COMMUNICATION_CATEGORIES.map((category) => category.id);

  function findCard(id: string) {
    return COMMUNICATION_CARDS.find((card) => card.id === id);
  }

  it('não repete o id de nenhum cartão', () => {
    const ids = COMMUNICATION_CARDS.map((card) => card.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('põe cada cartão em uma categoria que existe', () => {
    expect(COMMUNICATION_CARDS.every((card) => categoryIds.includes(card.categoryId))).toBeTrue();
  });

  it('tem rótulo nos dois idiomas em todos os cartões', () => {
    const missing = COMMUNICATION_CARDS.filter(
      (card) => !card.label['pt-BR'].trim() || !card.label['en-US'].trim(),
    );

    expect(missing.map((card) => card.id)).toEqual([]);
  });

  it('não repete a mesma palavra dentro de uma categoria', () => {
    const keys = COMMUNICATION_CARDS.map(
      (card) => `${card.categoryId}:${card.label['pt-BR'].toLocaleLowerCase('pt-BR')}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('traz as frases novas que o Pedro Henrique pediu', () => {
    expect(findCard('card-espera-um-pouquinho')).toEqual(
      jasmine.objectContaining({
        categoryId: 'respostas',
        label: { 'pt-BR': 'espera um pouquinho', 'en-US': 'wait just a little bit' },
      }),
    );
    expect(findCard('card-eu-estou-jogando')).toEqual(
      jasmine.objectContaining({
        categoryId: 'inicios',
        label: { 'pt-BR': 'Eu estou jogando', 'en-US': 'I am playing' },
      }),
    );
    expect(findCard('card-bola-objeto')).toEqual(
      jasmine.objectContaining({ categoryId: 'brincar', label: { 'pt-BR': 'bola', 'en-US': 'ball' } }),
    );
  });
});

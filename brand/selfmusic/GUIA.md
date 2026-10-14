# SelfMusic — guia rápido da marca

## Conceito

O “S” contínuo representa a sintonia pessoal entre quem ouve e a própria música. A forma foi desenhada para continuar reconhecível em uma cor e nos tamanhos pequenos do launcher Android.

## Arquivos principais

- `masters/symbol.svg`: símbolo vetorial principal.
- `masters/horizontal.svg`: símbolo e nome na horizontal.
- `masters/stacked.svg`: assinatura vertical.
- `masters/wordmark.svg`: nome em contornos vetoriais.
- `exports/`: variantes de cor, versões quadradas e ícone arredondado.
- `android/`: camadas separadas para ícone adaptativo do Android e suas prévias PNG.

## Cores

| Cor | HEX | RGB | CMYK aproximado |
|---|---|---|---|
| Violeta SelfMusic | `#6D5CE8` | 109, 92, 232 | 63, 70, 10, 9 |
| Tinta | `#17152A` | 23, 21, 42 | 45, 50, 0, 84 |
| Branco | `#FFFFFF` | 255, 255, 255 | 0, 0, 0, 0 |

CMYK é uma conversão aproximada para referência; confira a cor em prova física antes de imprimir.

## Uso

- Prefira a assinatura colorida em fundos brancos ou claros e a versão branca em fundos violeta ou escuros.
- Use a versão preta quando a reprodução tiver apenas uma tinta.
- Mantenha uma margem livre ao redor do logo de pelo menos 24 unidades para o símbolo (aproximadamente 10% do lado do quadro original).
- Para o launcher Android, use as três camadas em `android/`: primeiro plano branco, fundo violeta e desenho monocromático preto. O sistema aplica a máscara do dispositivo.
- Use o símbolo isolado como ícone. A assinatura horizontal funciona em cabeçalhos; a vertical, em capas quadradas.
- Não estique, gire, redesenhe ou aplique sombras, contornos e gradientes.

## Tipografia

O nome no logo foi convertido em contornos a partir de Noto Sans Bold, com espaçamento ajustado. Os SVGs não dependem de uma fonte instalada para exibir a marca. Para textos da interface, use a fonte de sistema Android/Roboto.

## Tamanhos mínimos sugeridos

- Símbolo: 16 px em tela; prefira `exports/selfmusic-favicon.svg` quando o espaço for reduzido.
- Assinatura horizontal: 120 px de largura em tela.
- Impressão: valide em prova; evite o símbolo abaixo de 6 mm.

## Acessibilidade e aplicação

Violeta em branco mantém contraste para a marca em tamanhos de logo, mas não use essa combinação automaticamente em texto pequeno da interface. Este kit contém as artes finais; a configuração de ícones do Expo permanece separada para aplicação consciente no projeto.

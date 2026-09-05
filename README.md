# NEON KICK

Projeto simples de teste das capacidades de codificação do GPT-6 Astra, da OpenAI. Como exercício, foi implementado um jogo de futebol de carros em 3D inspirado no gênero de Rocket League, com física, arena e IA dos bots gerados inteiramente por código, sem assets do jogo original.

Um único prompt no Codex com /goal gerou a versão jogável completa e depois dei mais 3 ou 4 prompts de acabamento que refinaram detalhes de polimento. A polida final, aliás, saiu no Claude Sonnet 5, pois o GPT-6 Astra tinha acabado de gastar até o último token hahahaha.

## Rodar

Requer Node.js 20.19+ ou 22.12+.

```sh
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite. Para produção: `npm run build`; para servir o resultado localmente: `npm run preview`. A pasta `dist` pode ser publicada em qualquer hospedagem estática. `npm test` verifica a física.

## Como jogar

- W/S ou setas para acelerar e dar ré; A/D ou setas para virar o volante.
- Shift usa turbo, que recarrega quando não está sendo usado.
- Espaço pula; E reduz a aderência para derrapar.
- Para dar um dash e chutar a bola, solte e aperte Espaço novamente no ar (até 0,65 s depois do salto). Use WASD para escolher a direção; sem direção, o dash vai para a frente. No celular, toque duas vezes no botão de pulo.
- Há um dash por salto, recarregado ao pousar. A arrancada dura 0,32 s, não consome turbo e dá força extra a um contato com a bola durante esse intervalo. Os limites de velocidade do turbo e da bola continuam valendo.
- Esc pausa. Botões na tela permitem jogar por toque.
- A câmera padrão fica atrás e acima do carro, em terceira pessoa. C ou o botão de câmera alterna entre seguir o carro e acompanhar a bola, sempre em terceira pessoa.
- O radar mostra os carros e a bola; a seta no alto aponta para a bola em relação à direção do carro.
- Você é o carro azul e ataca o gol laranja. Use o radar para localizar o rival e a bola.
- Partidas de dois minutos contra a IA. Mais gols vence; empate leva a gol de ouro. Após um gol, ambos voltam ao centro de sua metade.
- Dificuldade Casual reduz a aceleração do rival e desativa seu turbo.
- Som sintetizado opcional, tela cheia e revanche disponíveis na interface.

## Organização

- `src/main.js`: entrada, controles, IA, estados da partida, áudio e HUD.
- `src/physics.js`: movimento arcade, colisões e detecção de gols, independentes da renderização.
- `src/scene.js`: arena e modelos Three.js, câmera, iluminação, sombras e partículas.
- `src/car.js`: cupês GT procedurais, carroceria esculpida, rodas animadas, vidros e instrumentos do cockpit.
- `src/style.css`: interface adaptável a telas grandes e pequenas.
- `tests/physics.test.js`: testes de impulso, turbo, salto, gols e estabilidade.

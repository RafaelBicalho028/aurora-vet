# Arte e áudio: como substituir por recursos profissionais

Toda a arte do MVP é **gerada por código** (pixel art procedural original) em `src/art/`, e o áudio é sintetizado em `src/core/AudioManager.ts`. Isso mantém o jogo leve e 100% offline, e permite a troca gradual por arte profissional.

## Chaves de textura

| Chave | Formato | Origem |
|---|---|---|
| `player`, `npc_<id>` | folha 264×28, 12 quadros 22×28 (proporção chibi, origem embaixo no centro): baixo×3, esquerda×3, direita×3, cima×3 (parado, passo A, passo B) | `characters.ts` |
| `dog_caramelo`, `dog_campus` | 4 quadros 20×16 (parado, rabo, coçando, piscando) | `animals.ts` |
| `cat_laranja`, `cat_cinza` | 4 quadros 16×16 | `animals.ts` |
| `cow` | 2 quadros 32×24 (parado, pastando) | `animals.ts` |
| `sheep` | 2 quadros 20×16 | `animals.ts` |
| `obj_<tipo>_<variação>` | imagens de objetos (árvore, cerca, móveis...) | `objects.ts` |
| `bld_<mapa>_<prédio>` | fachada do prédio (largura×altura em tiles × 16) | `objects.ts` |
| `ground_<mapa>` | chão do mapa inteiro | `TextureFactory.ts` |

## Para trocar por arte desenhada

1. Coloque as imagens em `public/assets/`.
2. Em `src/scenes/BootScene.ts`, adicione `preload()` com `this.load.spritesheet('player', 'assets/player.png', { frameWidth: 16, frameHeight: 24 })` (mesma chave e layout).
3. Em `TextureFactory.registerCharacter/registerStatic`, pule a geração quando `scene.textures.exists(chave)` for verdadeiro.

Os mapas continuam definidos por dados (`src/world/maps/`), então tilesets profissionais podem ser introduzidos trocando `drawGroundTile` por um tileset carregado.

## Prévia rápida da arte

Com `npm run dev` ativo, abra `http://localhost:5173/dev/art-preview.html` para ver todos os personagens, retratos e animais gerados.

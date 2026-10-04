# 🌍 GeoChute

Um jogo de adivinhar lugares usando o **Street View do Google Maps**, para jogar com amigos no mesmo computador. Funciona como um userscript do Tampermonkey.

> 🤖 **Projeto feito com IA.** Este código foi escrito em conversa com o Claude (Anthropic), com direção e testes de Pedro Ferreira Magalhães. Pode ter bugs e não passou por revisão profissional.

> ⚠️ **Projeto independente e não oficial.** Não é afiliado, patrocinado ou aprovado pelo Google nem pelo GeoGuessr. "Google Maps" e "Street View" são marcas do Google; "GeoGuessr" é marca de seus respectivos donos.

## Instalar

1. Instale a extensão [Tampermonkey](https://www.tampermonkey.net/) no seu navegador.
2. Clique aqui para instalar o script: **[geochute.user.js](https://raw.githubusercontent.com/Sonhamene/geochute/main/geochute.user.js)**
3. Abra o [Google Maps](https://www.google.com/maps). O painel do jogo aparece no canto da tela.
4. Na primeira vez, o Tampermonkey pede permissão para acessar `nominatim.openstreetmap.org` (usado no bônus de país e na busca de áreas). Aceite.

## Como jogar

Você vê um Street View sorteado, clica no mapa do painel para chutar onde está e ganha pontos por proximidade. Quanto mais perto, mais pontos (até 5000 por rodada).

## Modos e recursos

- **Regiões:** mundo todo, Brasil, continentes, **🏎️ circuitos de F1** e **📍 cidade, estado ou país específico** (busca a fronteira real no OpenStreetMap).
- **Dificuldade dos locais:** fácil (centros das grandes cidades), médio (subúrbios e cidades menores) e difícil (interior e estradas).
- **Multiplayer no mesmo PC:** até 6 jogadores revezando, cada um com um local diferente por rodada.
- **⚔️ Modo duelo:** todos começam com 6000 ❤; quem faz menos pontos perde a diferença para o melhor.
- **Bônus de país (+1000)** e **bônus de rapidez**; **dicas** (continente/país) com custo em pontos.
- **Sem mover/zoom**, tempo por rodada e número de rodadas (5 a 24).
- **Ranking e estatísticas** por jogador, recordes por região e histórico.
- **Sem cobertura:** se cair em tela preta, sorteia outro local sem penalidade.

## Limitações conhecidas

- Depende do formato da URL do Google Maps. Se o Google mudar, recursos como cronômetro e "sem mover" podem quebrar.
- Nem todo local sorteado tem Street View (principalmente em áreas rurais e circuitos fechados). Use o botão "Sem cobertura".
- Os dados ficam só no seu navegador (Tampermonkey).

## Créditos e serviços de terceiros

- [Leaflet](https://leafletjs.com/) (BSD-2-Clause), carregado por CDN.
- Mapas: Esri World Street Map e OpenTopoMap (dados © colaboradores do OpenStreetMap).
- Busca e países: [Nominatim](https://nominatim.org/) / OpenStreetMap, sujeito à [política de uso](https://operations.osmfoundation.org/policies/nominatim/) deles.
- Feito com o auxílio do [Claude](https://www.anthropic.com/claude).

## Licença

[MIT](LICENSE)

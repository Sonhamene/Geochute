// ==UserScript==
// @name         GeoChute
// @namespace    geochute
// @version      0.7
// @license      MIT
// @description  Jogo de adivinhar lugares usando o Street View do Google Maps, para jogar com amigos (projeto independente, feito com IA)
// @match        https://www.google.com/maps*
// @match        https://www.google.com.br/maps*
// @match        https://maps.google.com/*
// @include      /^https:\/\/www\.google\.[a-z.]+\/maps.*$/
// @require      https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
// @resource     leafletCss https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @connect      nominatim.openstreetmap.org
// ==/UserScript==

(function () {
  'use strict';
  console.log('[GeoChute] script ativo em', location.href);

  const ROUNDS = 5;
  const DUEL_MAX = 10;                // rodadas máximas no duelo
  const DUEL_HP = 6000;               // vida inicial no duelo
  const COUNTRY_BONUS = 1000;         // bônus por acertar o país
  const MAX_PLAYERS = 6;
  const HINT_COST = [0, 500, 1500];
  const BONUS_MAX = 0.25;
  const NO_STREETVIEW_HINT_MS = 15000;
  const TIMER_FALLBACK_MS = 6000;
  const PLAYER_COLORS = ['#38bdf8', '#f87171', '#c084fc', '#fb923c', '#2dd4bf', '#facc15'];

  // [lat, lng, cidade, país, continente]
  const CITIES = [
    [-23.55, -46.63, 'São Paulo', 'Brasil', 'América do Sul'], [-22.91, -43.17, 'Rio de Janeiro', 'Brasil', 'América do Sul'],
    [-19.92, -43.94, 'Belo Horizonte', 'Brasil', 'América do Sul'], [-15.79, -47.88, 'Brasília', 'Brasil', 'América do Sul'],
    [-12.97, -38.50, 'Salvador', 'Brasil', 'América do Sul'], [-3.73, -38.52, 'Fortaleza', 'Brasil', 'América do Sul'],
    [-8.05, -34.88, 'Recife', 'Brasil', 'América do Sul'], [-30.03, -51.23, 'Porto Alegre', 'Brasil', 'América do Sul'],
    [-25.43, -49.27, 'Curitiba', 'Brasil', 'América do Sul'], [-3.12, -60.02, 'Manaus', 'Brasil', 'América do Sul'],
    [-1.46, -48.50, 'Belém', 'Brasil', 'América do Sul'], [-16.68, -49.25, 'Goiânia', 'Brasil', 'América do Sul'],
    [-27.59, -48.55, 'Florianópolis', 'Brasil', 'América do Sul'], [-22.91, -47.06, 'Campinas', 'Brasil', 'América do Sul'],
    [-22.41, -47.56, 'Rio Claro', 'Brasil', 'América do Sul'], [-5.79, -35.21, 'Natal', 'Brasil', 'América do Sul'],
    [-20.32, -40.34, 'Vitória', 'Brasil', 'América do Sul'], [-20.47, -54.62, 'Campo Grande', 'Brasil', 'América do Sul'],
    [-15.60, -56.10, 'Cuiabá', 'Brasil', 'América do Sul'], [-2.53, -44.30, 'São Luís', 'Brasil', 'América do Sul'],
    [-21.18, -47.81, 'Ribeirão Preto', 'Brasil', 'América do Sul'], [-23.31, -51.16, 'Londrina', 'Brasil', 'América do Sul'],
    [-34.60, -58.38, 'Buenos Aires', 'Argentina', 'América do Sul'], [-31.42, -64.18, 'Córdoba', 'Argentina', 'América do Sul'],
    [-32.89, -68.84, 'Mendoza', 'Argentina', 'América do Sul'], [-33.45, -70.66, 'Santiago', 'Chile', 'América do Sul'],
    [-33.05, -71.62, 'Valparaíso', 'Chile', 'América do Sul'], [-34.90, -56.16, 'Montevidéu', 'Uruguai', 'América do Sul'],
    [-25.26, -57.58, 'Assunção', 'Paraguai', 'América do Sul'], [-16.50, -68.15, 'La Paz', 'Bolívia', 'América do Sul'],
    [-17.78, -63.18, 'Santa Cruz de la Sierra', 'Bolívia', 'América do Sul'], [-12.04, -77.04, 'Lima', 'Peru', 'América do Sul'],
    [-13.53, -71.97, 'Cusco', 'Peru', 'América do Sul'], [-0.18, -78.47, 'Quito', 'Equador', 'América do Sul'],
    [4.71, -74.07, 'Bogotá', 'Colômbia', 'América do Sul'], [6.24, -75.58, 'Medellín', 'Colômbia', 'América do Sul'],
    [40.71, -74.00, 'Nova York', 'Estados Unidos', 'América do Norte'], [34.05, -118.24, 'Los Angeles', 'Estados Unidos', 'América do Norte'],
    [41.88, -87.63, 'Chicago', 'Estados Unidos', 'América do Norte'], [29.76, -95.37, 'Houston', 'Estados Unidos', 'América do Norte'],
    [25.76, -80.19, 'Miami', 'Estados Unidos', 'América do Norte'], [47.61, -122.33, 'Seattle', 'Estados Unidos', 'América do Norte'],
    [39.74, -104.99, 'Denver', 'Estados Unidos', 'América do Norte'], [61.22, -149.90, 'Anchorage', 'Estados Unidos', 'América do Norte'],
    [45.50, -73.57, 'Montreal', 'Canadá', 'América do Norte'], [49.28, -123.12, 'Vancouver', 'Canadá', 'América do Norte'],
    [43.65, -79.38, 'Toronto', 'Canadá', 'América do Norte'], [19.43, -99.13, 'Cidade do México', 'México', 'América do Norte'],
    [20.66, -103.35, 'Guadalajara', 'México', 'América do Norte'], [21.16, -86.85, 'Cancún', 'México', 'América do Norte'],
    [9.93, -84.08, 'San José', 'Costa Rica', 'América do Norte'], [8.98, -79.52, 'Cidade do Panamá', 'Panamá', 'América do Norte'],
    [14.63, -90.51, 'Cidade da Guatemala', 'Guatemala', 'América do Norte'],
    [51.50, -0.12, 'Londres', 'Reino Unido', 'Europa'], [55.95, -3.19, 'Edimburgo', 'Reino Unido', 'Europa'],
    [53.35, -6.26, 'Dublin', 'Irlanda', 'Europa'], [48.85, 2.35, 'Paris', 'França', 'Europa'],
    [52.52, 13.40, 'Berlim', 'Alemanha', 'Europa'], [40.42, -3.70, 'Madri', 'Espanha', 'Europa'],
    [41.39, 2.17, 'Barcelona', 'Espanha', 'Europa'], [38.72, -9.14, 'Lisboa', 'Portugal', 'Europa'],
    [41.15, -8.61, 'Porto', 'Portugal', 'Europa'], [41.90, 12.49, 'Roma', 'Itália', 'Europa'],
    [45.46, 9.19, 'Milão', 'Itália', 'Europa'], [52.37, 4.90, 'Amsterdã', 'Países Baixos', 'Europa'],
    [50.85, 4.35, 'Bruxelas', 'Bélgica', 'Europa'], [47.37, 8.54, 'Zurique', 'Suíça', 'Europa'],
    [48.21, 16.37, 'Viena', 'Áustria', 'Europa'], [50.08, 14.44, 'Praga', 'Tchéquia', 'Europa'],
    [52.23, 21.01, 'Varsóvia', 'Polônia', 'Europa'], [47.50, 19.04, 'Budapeste', 'Hungria', 'Europa'],
    [44.43, 26.10, 'Bucareste', 'Romênia', 'Europa'], [37.98, 23.73, 'Atenas', 'Grécia', 'Europa'],
    [59.33, 18.06, 'Estocolmo', 'Suécia', 'Europa'], [59.91, 10.75, 'Oslo', 'Noruega', 'Europa'],
    [60.17, 24.94, 'Helsinque', 'Finlândia', 'Europa'], [64.14, -21.94, 'Reykjavik', 'Islândia', 'Europa'],
    [55.75, 37.61, 'Moscou', 'Rússia', 'Europa'], [50.45, 30.52, 'Kiev', 'Ucrânia', 'Europa'],
    [35.68, 139.69, 'Tóquio', 'Japão', 'Ásia'], [34.69, 135.50, 'Osaka', 'Japão', 'Ásia'],
    [37.56, 126.97, 'Seul', 'Coreia do Sul', 'Ásia'], [22.32, 114.17, 'Hong Kong', 'Hong Kong', 'Ásia'],
    [25.03, 121.57, 'Taipé', 'Taiwan', 'Ásia'], [13.75, 100.50, 'Bangkok', 'Tailândia', 'Ásia'],
    [21.03, 105.85, 'Hanói', 'Vietnã', 'Ásia'], [1.35, 103.82, 'Singapura', 'Singapura', 'Ásia'],
    [3.14, 101.69, 'Kuala Lumpur', 'Malásia', 'Ásia'], [-6.20, 106.84, 'Jacarta', 'Indonésia', 'Ásia'],
    [14.59, 120.98, 'Manila', 'Filipinas', 'Ásia'], [28.61, 77.20, 'Nova Délhi', 'Índia', 'Ásia'],
    [19.08, 72.88, 'Mumbai', 'Índia', 'Ásia'], [12.97, 77.59, 'Bangalore', 'Índia', 'Ásia'],
    [27.72, 85.32, 'Katmandu', 'Nepal', 'Ásia'], [6.93, 79.86, 'Colombo', 'Sri Lanka', 'Ásia'],
    [25.27, 55.30, 'Dubai', 'Emirados Árabes Unidos', 'Ásia'], [32.09, 34.78, 'Tel Aviv', 'Israel', 'Ásia'],
    [31.95, 35.93, 'Amã', 'Jordânia', 'Ásia'], [47.89, 106.91, 'Ulan Bator', 'Mongólia', 'Ásia'],
    [43.24, 76.89, 'Almaty', 'Cazaquistão', 'Ásia'],
    [-33.92, 18.42, 'Cidade do Cabo', 'África do Sul', 'África'], [-26.20, 28.04, 'Joanesburgo', 'África do Sul', 'África'],
    [-29.86, 31.02, 'Durban', 'África do Sul', 'África'], [-1.29, 36.82, 'Nairóbi', 'Quênia', 'África'],
    [6.52, 3.37, 'Lagos', 'Nigéria', 'África'], [5.60, -0.19, 'Acra', 'Gana', 'África'],
    [14.72, -17.47, 'Dacar', 'Senegal', 'África'], [0.35, 32.58, 'Kampala', 'Uganda', 'África'],
    [-24.65, 25.91, 'Gaborone', 'Botsuana', 'África'], [-22.56, 17.08, 'Windhoek', 'Namíbia', 'África'],
    [36.81, 10.18, 'Túnis', 'Tunísia', 'África'],
    [-33.86, 151.20, 'Sydney', 'Austrália', 'Oceania'], [-37.81, 144.96, 'Melbourne', 'Austrália', 'Oceania'],
    [-27.47, 153.03, 'Brisbane', 'Austrália', 'Oceania'], [-31.95, 115.86, 'Perth', 'Austrália', 'Oceania'],
    [-34.93, 138.60, 'Adelaide', 'Austrália', 'Oceania'], [-36.84, 174.76, 'Auckland', 'Nova Zelândia', 'Oceania'],
    [-41.29, 174.78, 'Wellington', 'Nova Zelândia', 'Oceania'], [-43.53, 172.64, 'Christchurch', 'Nova Zelândia', 'Oceania'],
  ];


  // Cidades menores/médias: usadas nas dificuldades Média e Difícil
  const SMALL = [
    [-18.92, -48.28, 'Uberlândia', 'Brasil', 'América do Sul'], [-21.76, -43.35, 'Juiz de Fora', 'Brasil', 'América do Sul'],
    [-23.96, -46.33, 'Santos', 'Brasil', 'América do Sul'], [-23.50, -47.46, 'Sorocaba', 'Brasil', 'América do Sul'],
    [-23.22, -45.90, 'São José dos Campos', 'Brasil', 'América do Sul'], [-26.30, -48.85, 'Joinville', 'Brasil', 'América do Sul'],
    [-26.92, -49.07, 'Blumenau', 'Brasil', 'América do Sul'], [-29.17, -51.18, 'Caxias do Sul', 'Brasil', 'América do Sul'],
    [-31.77, -52.34, 'Pelotas', 'Brasil', 'América do Sul'], [-23.42, -51.94, 'Maringá', 'Brasil', 'América do Sul'],
    [-25.55, -54.59, 'Foz do Iguaçu', 'Brasil', 'América do Sul'], [-9.39, -40.50, 'Petrolina', 'Brasil', 'América do Sul'],
    [-7.23, -35.88, 'Campina Grande', 'Brasil', 'América do Sul'], [-9.67, -35.74, 'Maceió', 'Brasil', 'América do Sul'],
    [-10.91, -37.07, 'Aracaju', 'Brasil', 'América do Sul'], [-5.09, -42.80, 'Teresina', 'Brasil', 'América do Sul'],
    [-10.18, -48.33, 'Palmas', 'Brasil', 'América do Sul'], [-8.76, -63.90, 'Porto Velho', 'Brasil', 'América do Sul'],
    [-9.97, -67.81, 'Rio Branco', 'Brasil', 'América do Sul'], [2.82, -60.67, 'Boa Vista', 'Brasil', 'América do Sul'],
    [0.03, -51.07, 'Macapá', 'Brasil', 'América do Sul'], [-20.39, -43.50, 'Ouro Preto', 'Brasil', 'América do Sul'],
    [-21.13, -56.48, 'Bonito', 'Brasil', 'América do Sul'], [-29.38, -50.87, 'Gramado', 'Brasil', 'América do Sul'],
    [-24.78, -65.41, 'Salta', 'Argentina', 'América do Sul'], [-41.13, -71.31, 'Bariloche', 'Argentina', 'América do Sul'],
    [-54.80, -68.30, 'Ushuaia', 'Argentina', 'América do Sul'], [-53.16, -70.91, 'Punta Arenas', 'Chile', 'América do Sul'],
    [-16.41, -71.54, 'Arequipa', 'Peru', 'América do Sul'], [-2.17, -79.92, 'Guayaquil', 'Equador', 'América do Sul'],
    [10.39, -75.48, 'Cartagena', 'Colômbia', 'América do Sul'], [3.45, -76.53, 'Cali', 'Colômbia', 'América do Sul'],
    [30.27, -97.74, 'Austin', 'Estados Unidos', 'América do Norte'], [45.52, -122.68, 'Portland', 'Estados Unidos', 'América do Norte'],
    [33.45, -112.07, 'Phoenix', 'Estados Unidos', 'América do Norte'], [36.16, -86.78, 'Nashville', 'Estados Unidos', 'América do Norte'],
    [51.05, -114.07, 'Calgary', 'Canadá', 'América do Norte'], [44.65, -63.58, 'Halifax', 'Canadá', 'América do Norte'],
    [17.07, -96.73, 'Oaxaca', 'México', 'América do Norte'],
    [37.18, -3.60, 'Granada', 'Espanha', 'Europa'], [37.39, -5.98, 'Sevilha', 'Espanha', 'Europa'],
    [43.77, 11.26, 'Florença', 'Itália', 'Europa'], [40.85, 14.27, 'Nápoles', 'Itália', 'Europa'],
    [45.76, 4.84, 'Lyon', 'França', 'Europa'], [43.30, 5.37, 'Marselha', 'França', 'Europa'],
    [48.14, 11.58, 'Munique', 'Alemanha', 'Europa'], [53.55, 9.99, 'Hamburgo', 'Alemanha', 'Europa'],
    [50.06, 19.94, 'Cracóvia', 'Polônia', 'Europa'], [59.44, 24.75, 'Tallinn', 'Estônia', 'Europa'],
    [56.95, 24.11, 'Riga', 'Letônia', 'Europa'], [54.69, 25.28, 'Vilnius', 'Lituânia', 'Europa'],
    [44.79, 20.45, 'Belgrado', 'Sérvia', 'Europa'], [42.70, 23.32, 'Sófia', 'Bulgária', 'Europa'],
    [45.81, 15.98, 'Zagreb', 'Croácia', 'Europa'], [41.01, 28.98, 'Istambul', 'Turquia', 'Europa'],
    [35.01, 135.77, 'Quioto', 'Japão', 'Ásia'], [43.06, 141.35, 'Sapporo', 'Japão', 'Ásia'],
    [18.79, 98.98, 'Chiang Mai', 'Tailândia', 'Ásia'], [13.08, 80.27, 'Chennai', 'Índia', 'Ásia'],
    [10.32, 123.89, 'Cebu', 'Filipinas', 'Ásia'], [-8.65, 115.22, 'Denpasar', 'Indonésia', 'Ásia'],
    [-4.04, 39.67, 'Mombasa', 'Quênia', 'África'],
    [-42.88, 147.33, 'Hobart', 'Austrália', 'Oceania'], [-12.46, 130.84, 'Darwin', 'Austrália', 'Oceania'],
    [-16.92, 145.77, 'Cairns', 'Austrália', 'Oceania'], [-45.03, 168.66, 'Queenstown', 'Nova Zelândia', 'Oceania'],
  ];

  // Circuitos de F1: [lat, lng, circuito, país, continente]
  const CIRCUITS = [
    [-37.8497, 144.9680, 'Circuito de Albert Park (Melbourne)', 'Austrália', 'Oceania'],
    [31.3389, 121.2198, 'Circuito de Xangai', 'China', 'Ásia'],
    [34.8431, 136.5407, 'Circuito de Suzuka', 'Japão', 'Ásia'],
    [35.3717, 138.9269, 'Circuito de Fuji', 'Japão', 'Ásia'],
    [26.0325, 50.5106, 'Circuito de Sakhir', 'Bahrein', 'Ásia'],
    [21.6319, 39.1044, 'Circuito de Jeddah', 'Arábia Saudita', 'Ásia'],
    [25.4900, 51.4542, 'Circuito de Lusail', 'Catar', 'Ásia'],
    [24.4672, 54.6031, 'Circuito de Yas Marina (Abu Dhabi)', 'Emirados Árabes Unidos', 'Ásia'],
    [1.2914, 103.8640, 'Circuito de Marina Bay (Singapura)', 'Singapura', 'Ásia'],
    [40.3725, 49.8533, 'Circuito de Baku', 'Azerbaijão', 'Ásia'],
    [25.9581, -80.2389, 'Circuito de Miami', 'Estados Unidos', 'América do Norte'],
    [30.1328, -97.6411, 'Circuito das Américas (Austin)', 'Estados Unidos', 'América do Norte'],
    [36.1147, -115.1728, 'Circuito de Las Vegas', 'Estados Unidos', 'América do Norte'],
    [45.5000, -73.5228, 'Circuito Gilles Villeneuve (Montreal)', 'Canadá', 'América do Norte'],
    [19.4042, -99.0907, 'Autódromo Hermanos Rodríguez (Cidade do México)', 'México', 'América do Norte'],
    [-23.7036, -46.6997, 'Autódromo de Interlagos (São Paulo)', 'Brasil', 'América do Sul'],
    [-22.9753, -43.3950, 'Autódromo de Jacarepaguá (Rio de Janeiro)', 'Brasil', 'América do Sul'],
    [-34.6944, -58.4594, 'Autódromo Oscar Gálvez (Buenos Aires)', 'Argentina', 'América do Sul'],
    [43.7347, 7.4206, 'Circuito de Mônaco', 'Mônaco', 'Europa'],
    [44.3439, 11.7167, 'Autódromo de Ímola', 'Itália', 'Europa'],
    [45.6156, 9.2811, 'Autódromo de Monza', 'Itália', 'Europa'],
    [43.9975, 11.3719, 'Autódromo de Mugello', 'Itália', 'Europa'],
    [41.5700, 2.2611, 'Circuito da Catalunha (Barcelona)', 'Espanha', 'Europa'],
    [40.6170, -3.5851, 'Circuito do Jarama (Madri)', 'Espanha', 'Europa'],
    [37.2270, -8.6267, 'Autódromo de Portimão', 'Portugal', 'Europa'],
    [38.7506, -9.3946, 'Autódromo do Estoril', 'Portugal', 'Europa'],
    [47.2197, 14.7647, 'Red Bull Ring (Spielberg)', 'Áustria', 'Europa'],
    [52.0786, -1.0169, 'Circuito de Silverstone', 'Reino Unido', 'Europa'],
    [50.4372, 5.9714, 'Circuito de Spa-Francorchamps', 'Bélgica', 'Europa'],
    [52.3888, 4.5409, 'Circuito de Zandvoort', 'Países Baixos', 'Europa'],
    [47.5789, 19.2486, 'Hungaroring (Budapeste)', 'Hungria', 'Europa'],
    [50.3356, 6.9475, 'Nürburgring', 'Alemanha', 'Europa'],
    [49.3278, 8.5656, 'Hockenheimring', 'Alemanha', 'Europa'],
    [43.2506, 5.7919, 'Circuito Paul Ricard', 'França', 'Europa'],
    [40.9517, 29.4050, 'Istanbul Park', 'Turquia', 'Europa'],
    [43.4057, 39.9578, 'Autódromo de Sochi', 'Rússia', 'Europa'],
    [-25.9894, 28.0768, 'Circuito de Kyalami', 'África do Sul', 'África'],
  ];

  const REGIONS = [
    ['mundo', 'Mundo todo', () => true],
    ['brasil', 'Brasil', (c) => c[3] === 'Brasil'],
    ['america-sul', 'América do Sul', (c) => c[4] === 'América do Sul'],
    ['america-norte', 'América do Norte e Central', (c) => c[4] === 'América do Norte'],
    ['europa', 'Europa', (c) => c[4] === 'Europa'],
    ['asia', 'Ásia', (c) => c[4] === 'Ásia'],
    ['africa', 'África', (c) => c[4] === 'África'],
    ['oceania', 'Oceania', (c) => c[4] === 'Oceania'],
    ['f1', '🏎️ Circuitos de F1', () => true],
    ['area', '📍 Cidade, estado ou país específico', () => true],
  ];
  const ROUND_OPTS = [5, 10, 15, 20, 24];
  const regionLabel = (k) => (REGIONS.find((r) => r[0] === k) || REGIONS[0])[1];
  const TIMES = [[0, 'Sem limite'], [60, '1 min'], [120, '2 min'], [180, '3 min'], [300, '5 min']];
  const DIFFS = [['facil', 'Fácil · centros das grandes cidades'], ['medio', 'Médio · subúrbios e cidades menores'], ['dificil', 'Difícil · interior e estradas']];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  GM_addStyle(GM_getResourceText('leafletCss'));
  GM_addStyle(`
    #gc-panel { position: fixed; right: 14px; bottom: 24px; z-index: 99999;
      font: 14px/1.35 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(160deg, #1c2438 0%, #11151f 100%); color: #e8ecf4;
      border-radius: 16px; box-shadow: 0 12px 36px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.09);
      padding: 12px; width: 300px; box-sizing: border-box; transition: width .2s;
      max-height: calc(100vh - 48px); overflow-y: auto; }
    #gc-panel.game { width: 270px; }
    #gc-panel.game:hover, #gc-panel.game.big { width: 540px; }
    #gc-panel.final { width: 580px; }
    #gc-panel * { box-sizing: border-box; }
    #gc-map { height: 160px; transition: height .2s; border-radius: 10px; background: #1a2a3a; margin-top: 6px; }
    #gc-panel.game:hover #gc-map, #gc-panel.game.big #gc-map { height: 350px; }
    #gc-fmap { height: 370px; border-radius: 10px; background: #1a2a3a; margin: 8px 0; }
    #gc-panel button { width: 100%; margin-top: 7px; padding: 9px 10px; border: 0; border-radius: 10px;
      background: linear-gradient(135deg, #22c55e, #14b8a6); color: #04210f; font-weight: 700;
      font-size: 14px; cursor: pointer; transition: filter .15s, transform .05s; }
    #gc-panel button:hover:not(:disabled) { filter: brightness(1.1); }
    #gc-panel button:active:not(:disabled) { transform: scale(.98); }
    #gc-panel button:disabled { background: rgba(255,255,255,.08); color: #6b7488; cursor: default; }
    #gc-panel .gc-sec { background: rgba(255,255,255,.09); color: #dbe3f1; border: 1px solid rgba(255,255,255,.12); font-weight: 600; }
    #gc-panel .gc-danger { background: rgba(239,68,68,.14); color: #fca5a5; border: 1px solid rgba(239,68,68,.5); font-weight: 600; }
    #gc-panel .gc-row { display: flex; gap: 6px; }
    #gc-panel .gc-row button { font-size: 12px; padding: 7px 4px; }
    #gc-panel label { display: block; margin: 8px 0 0; font-size: 12px; color: #9aa6bd; font-weight: 600; letter-spacing: .02em; }
    #gc-panel label.gc-chk { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #dbe3f1; font-weight: 500; letter-spacing: 0; }
    #gc-panel select, #gc-panel input.gc-name { width: 100%; padding: 7px 8px; margin-top: 3px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,.14); background: #0e121a; color: #e8ecf4; font-size: 13px; }
    #gc-panel input[type=checkbox] { accent-color: #22c55e; width: 16px; height: 16px; margin: 0; }
    #gc-panel details { margin-top: 10px; font-size: 12px; color: #c5cee0; background: rgba(255,255,255,.04);
      border-radius: 10px; padding: 8px 10px; }
    #gc-panel summary { cursor: pointer; font-weight: 700; color: #e8ecf4; }
    #gc-title { font-size: 20px; font-weight: 800; letter-spacing: -.01em; margin-bottom: 4px;
      background: linear-gradient(90deg, #4ade80, #38bdf8); -webkit-background-clip: text; background-clip: text; color: transparent; }
    #gc-info { margin-bottom: 6px; font-weight: 700; }
    .gc-pill { display: inline-block; padding: 2px 9px; border-radius: 999px; background: rgba(255,255,255,.1);
      font-size: 12px; font-weight: 700; margin-right: 4px; }
    #gc-timer { float: right; font-variant-numeric: tabular-nums; font-weight: 800; }
    #gc-hint { font-size: 12px; margin: 4px 0; color: #fde68a; }
    #gc-warn { font-size: 12px; margin: 4px 0; color: #fca5a5; }
    #gc-warn.ok { color: #86efac; }
    .gc-chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 4px 0; }
    .gc-chip { display: inline-flex; flex-direction: column; gap: 3px; padding: 4px 8px; border-radius: 8px; font-size: 12px;
      background: rgba(255,255,255,.06); border-left: 4px solid var(--c); opacity: .75; }
    .gc-chip.on { opacity: 1; background: rgba(255,255,255,.14); }
    .gc-chip.dead { opacity: .35; text-decoration: line-through; }
    .gc-bar { display: block; height: 5px; width: 70px; border-radius: 3px; background: rgba(255,255,255,.12); overflow: hidden; }
    .gc-bar i { display: block; height: 100%; }
    .gc-pin { width: 22px; height: 22px; text-align: center; border-radius: 50%;
      background: #22c55e; color: #fff; font: bold 12px/22px sans-serif; border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.6); box-sizing: content-box; margin: -2px 0 0 -2px; }
    #gc-toast { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100002;
      background: #b91c1c; color: #fff; padding: 10px 16px; border-radius: 10px; font: 14px sans-serif; }
    #gc-hand { position: fixed; inset: 0; z-index: 100001; background: radial-gradient(circle at 50% 30%, #1c2438, #0a0d14);
      color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; font: 28px system-ui, sans-serif; text-align: center; }
    #gc-hand button { padding: 13px 34px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #22c55e, #14b8a6);
      color: #04210f; font: 800 16px system-ui, sans-serif; cursor: pointer; }
  `);

  const COVERS = [
    { top: 0, left: 0, w: 480, h: 280 },
    { bottom: 0, left: 0, w: 340, h: 240, block: true },
  ];
  const coverEls = [];
  COVERS.forEach((c) => {
    const d = document.createElement('div');
    Object.assign(d.style, {
      position: 'fixed', left: c.left + 'px', width: c.w + 'px', height: c.h + 'px',
      zIndex: 99998, background: '#0a0d14', color: '#556', font: '12px sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: c.block ? 'auto' : 'none',
    });
    if (c.top !== undefined) d.style.top = c.top + 'px'; else d.style.bottom = c.bottom + 'px';
    d.textContent = '🙈 escondido';
    document.body.appendChild(d);
    coverEls.push(d);
  });

  // ---------- estado ----------
  const fresh = () => ({
    round: 0, target: null, name: '', country: '', continent: '',
    targets: [], used: [], deadline: null, hint: 0, revealed: false, last: '', notice: '',
    cfg: null, startPano: null, startUrl: null, reverts: 0, validated: false,
    pi: 0, totals: [], logs: [], places: [], handoff: false, hp: [], roundPts: [],
  });
  const load = () => Object.assign(fresh(), GM_getValue('gc', {}));
  const save = (s) => GM_setValue('gc', s);
  const defaultNames = () => Array.from({ length: MAX_PLAYERS }, (_, i) => `Jogador ${i + 1}`);
  const getCfg = () => {
    const c = Object.assign({ region: 'mundo', time: 120, nmpz: false, np: 1, names: defaultNames(),
      diff: 'facil', country: true, duel: false, rounds: 5, areaId: '' }, GM_getValue('gcCfg', {}));
    c.names = defaultNames().map((d, i) => (c.names && c.names[i]) || d);
    return c;
  };

  // ---------- utilidades ----------
  const toRad = (d) => (d * Math.PI) / 180;
  function haversineKm(a, b) {
    const R = 6371;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const pointsFor = (km, scale = 1492.7) => Math.round(5000 * Math.exp(-km / scale));
  const placeStr = (n, c) => (c ? `${n}, ${c}` : n);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const recScore = (r) => (typeof r === 'number' ? r : (r && r.s) || 0);
  const maxRounds = (s) => (s.cfg && s.cfg.duel ? Math.max(DUEL_MAX, s.cfg.rounds || 0) : (s.cfg && s.cfg.rounds) || ROUNDS);
  const tDiff = (s) => (s.cfg.region === 'f1' ? 'circuito' : s.cfg.diff);
  const isAlive = (s, i) => !s.cfg.duel || s.hp[i] > 0;
  const nextAlive = (s, from) => { for (let i = from + 1; i < s.cfg.players.length; i++) if (isAlive(s, i)) return i; return -1; };

  function toast(msg) {
    const t = document.createElement('div');
    t.id = 'gc-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // ---------- áreas específicas (cidade/estado/país) ----------
  let areaCache = {};
  const getAreas = () => GM_getValue('gcAreas', []);
  const areaOf = (st) => {
    if (!st || !st.cfg || st.cfg.region !== 'area') return null;
    if (!areaCache[st.cfg.areaId]) areaCache[st.cfg.areaId] = getAreas().find((a) => a.id === st.cfg.areaId) || null;
    return areaCache[st.cfg.areaId];
  };
  function ringHas(ring, x, y) {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function inArea(area, lat, lng) {
    const polys = area.geo.type === 'Polygon' ? [area.geo.coordinates] : area.geo.coordinates;
    return polys.some((rings) => ringHas(rings[0], lng, lat) && !rings.slice(1).some((h) => ringHas(h, lng, lat)));
  }
  function areaPoint(area) {
    const [S, N, W, E] = area.bbox;
    for (let i = 0; i < 500; i++) {
      const lat = S + Math.random() * (N - S), lng = W + Math.random() * (E - W);
      if (inArea(area, lat, lng)) return { lat, lng };
    }
    return { lat: (S + N) / 2, lng: (W + E) / 2 };
  }
  const areaTarget = (area) => Object.assign(areaPoint(area), { name: area.label, country: area.country || '', continent: '' });
  // curva de pontos proporcional ao tamanho da área (no mundo todo = 1492.7 km, como no GeoGuessr)
  const scaleOf = (st) => {
    const a = areaOf(st);
    if (!a) return 1492.7;
    const [S, N, W, E] = a.bbox;
    return Math.max(2, haversineKm({ lat: S, lng: W }, { lat: N, lng: E }) * 0.083);
  };
  const KINDS = [['city', 'Cidade'], ['state', 'Estado'], ['country', 'País']];
  const roundCoords = (c) => (Array.isArray(c[0]) ? c.map(roundCoords) : [Math.round(c[0] * 1e4) / 1e4, Math.round(c[1] * 1e4) / 1e4]);
  function searchArea(q, kind) {
    return new Promise((res, rej) => {
      try {
        GM_xmlhttpRequest({
          method: 'GET', timeout: 25000, headers: { Accept: 'application/json' },
          url: `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&featuretype=${kind}&format=jsonv2&polygon_geojson=1&polygon_threshold=0.005&addressdetails=1&limit=5&accept-language=pt-BR`,
          onload: (r) => {
            try {
              const arr = JSON.parse(r.responseText);
              const hit = arr.find((x) => x.geojson && (x.geojson.type === 'Polygon' || x.geojson.type === 'MultiPolygon'));
              if (!hit) return rej('Não achei a fronteira. Tente outro nome ou "Cidade, País".');
              const b = hit.boundingbox.map(Number); // [sul, norte, oeste, leste]
              const kindLabel = (KINDS.find((k) => k[0] === kind) || KINDS[0])[1].toLowerCase();
              res({
                id: `${kind}:${hit.osm_type}${hit.osm_id}`,
                label: `${hit.name || q} (${kindLabel})`,
                country: (hit.address && hit.address.country) || '',
                bbox: b,
                geo: { type: hit.geojson.type, coordinates: roundCoords(hit.geojson.coordinates) },
              });
            } catch (e) { rej('Resposta inválida do serviço de mapas.'); }
          },
          onerror: () => rej('Falha de conexão (aceitou a permissão do Tampermonkey?).'),
          ontimeout: () => rej('Demorou demais, tente de novo.'),
        });
      } catch (e) { rej('Não foi possível consultar o serviço de mapas.'); }
    });
  }
  function makeTargets(s, n, exclude) {
    const ar = areaOf(s);
    if (ar) return Array.from({ length: n }, () => areaTarget(ar));
    return pickCities(s, n, exclude).map((c) => makeTarget(c, tDiff(s)));
  }

  // País do ponto via OpenStreetMap (Nominatim). Retorna o código do país ou null.
  function geoCountry(lat, lng) {
    return new Promise((res) => {
      try {
        GM_xmlhttpRequest({
          method: 'GET', timeout: 6000, headers: { Accept: 'application/json' },
          url: `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=3&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`,
          onload: (r) => { try { const j = JSON.parse(r.responseText); res((j.address && j.address.country_code) || null); } catch (e) { res(null); } },
          onerror: () => res(null), ontimeout: () => res(null),
        });
      } catch (e) { res(null); }
    });
  }
  async function sameCountry(a, b) {
    const ca = await geoCountry(a.lat, a.lng);
    const cb = await geoCountry(b.lat, b.lng);
    return !!ca && !!cb && ca === cb;
  }

  // Sorteia n cidades diferentes entre si. Fácil: só grandes. Médio/Difícil: grandes + menores.
  function pickCities(s, n, exclude) {
    const reg = REGIONS.find((r) => r[0] === s.cfg.region) || REGIONS[0];
    const diff = s.cfg.diff || 'facil';
    const base = s.cfg.region === 'f1' ? CIRCUITS : (diff === 'facil' ? CITIES : CITIES.concat(SMALL));
    const all = base.filter(reg[2]);
    const chosen = [];
    const taken = (c) => (exclude || []).includes(c[2]) || chosen.some((x) => x[2] === c[2]);
    for (let i = 0; i < n; i++) {
      let pool = all.filter((c) => !taken(c) && !s.used.includes(c[2]));
      if (!pool.length) pool = all.filter((c) => !taken(c));
      if (!pool.length) pool = all;
      chosen.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return chosen;
  }
  function makeTarget(city, diff) {
    const [lat, lng, name, country, continent] = city;
    let maxR;
    if (diff === 'circuito') maxR = 0.004 + Math.random() * 0.008;   // ~0,5 a 1,3 km da pista
    else if (diff === 'dificil') maxR = 0.6 + Math.random() * 1.4;      // até ~220 km do centro
    else if (diff === 'medio') maxR = 0.2 + Math.random() * 0.3;   // até ~55 km
    else maxR = Math.random() < 0.4 ? 0.12 : 0.04;                 // até ~13 km
    const r = maxR * Math.sqrt(Math.random()), t = Math.random() * 2 * Math.PI;
    return { lat: lat + r * Math.sin(t), lng: lng + (r * Math.cos(t)) / Math.cos(toRad(lat)), name, country, continent };
  }
  function applyTarget(s, t) {
    s.target = { lat: t.lat, lng: t.lng };
    s.name = t.name; s.country = t.country; s.continent = t.continent;
  }
  function resetTurn(s) {
    s.deadline = null; s.hint = 0; s.revealed = false; s.last = '';
    s.startPano = null; s.startUrl = null; s.reverts = 0; s.validated = false;
  }
  const goTarget = (s) => {
    const t = s.targets[s.pi] || s.target;
    location.href = `https://www.google.com/maps?layer=c&cbll=${t.lat},${t.lng}`;
  };

  // rodada nova: cada jogador recebe um local diferente
  function newRound(s) {
    const N = s.cfg.players.length;
    s.targets = makeTargets(s, N);
    s.targets.forEach((t) => s.used.push(t.name));
    s.round += 1;
    s.roundPts = [];
    s.pi = isAlive(s, 0) ? 0 : nextAlive(s, 0);
    resetTurn(s);
    applyTarget(s, s.targets[s.pi]);
    s.handoff = N > 1;
    save(s);
    goTarget(s);
  }

  // "Sem cobertura": troca só o local do jogador atual. Não mexe em rodada nem pontos.
  function rerollTarget(s) {
    const exclude = s.targets.map((t) => t.name);
    const t = makeTargets(s, 1, exclude)[0];
    s.targets[s.pi] = t;
    s.used.push(t.name);
    resetTurn(s);
    applyTarget(s, t);
    s.handoff = false;
    s.notice = '✔ Novo local sorteado. Sem cobertura não conta como erro.';
    save(s);
    goTarget(s);
  }

  function passTurn() {
    state.pi = nextAlive(state, state.pi);
    resetTurn(state);
    applyTarget(state, state.targets[state.pi]);
    state.handoff = true;
    save(state);
    goTarget(state);
  }

  // Duelo: o melhor da rodada não perde nada; os outros perdem a diferença × multiplicador (cresce 25% por rodada)
  function applyDuel(s) {
    const mult = 1 + 0.25 * (s.round - 1);
    const alive = s.cfg.players.map((_, i) => i).filter((i) => isAlive(s, i));
    const best = Math.max(...alive.map((i) => s.roundPts[i] || 0));
    const msgs = alive.map((i) => {
      const dmg = Math.round((best - (s.roundPts[i] || 0)) * mult);
      s.hp[i] = Math.max(0, s.hp[i] - dmg);
      return `${s.cfg.players[i]} ${dmg ? '−' + dmg : '🛡 0'}${s.hp[i] <= 0 ? ' ☠' : ''}`;
    });
    s.notice = `⚔️ Dano (x${mult.toFixed(2)}): ${msgs.join(' · ')}`;
    s.roundPts = [];
  }

  // ---------- interface ----------
  const panel = document.createElement('div');
  panel.id = 'gc-panel';
  document.body.appendChild(panel);
  setInterval(() => {
    [panel, ...coverEls].forEach((el) => { if (!el.isConnected) document.body.appendChild(el); });
  }, 1500);

  let state = load();
  if (state.target && (!state.cfg || !state.cfg.players || !state.targets.length)) { state = fresh(); save(state); }
  let timerId = null, covId = null;

  function addTiles(map, warnEl) {
    const SOURCES = [
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        opts: { maxZoom: 18, attribution: 'Tiles © Esri' } },
      { url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
        opts: { maxZoom: 17, attribution: '© OpenStreetMap, © OpenTopoMap' } },
    ];
    let idx = 0, errors = 0, layer = null;
    function use(i) {
      if (layer) map.removeLayer(layer);
      errors = 0;
      layer = L.tileLayer(SOURCES[i].url, SOURCES[i].opts).addTo(map);
      layer.on('tileerror', () => {
        if (++errors < 4) return;
        if (idx < SOURCES.length - 1) use(++idx);
        else if (errors === 4 && warnEl) warnEl.textContent = '⚠ Os tiles do mapa foram bloqueados (veja o console, F12)';
      });
    }
    use(0);
  }
  const pinIcon = (txt, color) => L.divIcon({ className: '', html: `<div class="gc-pin"${color ? ` style="background:${color}"` : ''}>${txt}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] });

  function showStart(msg) {
    clearInterval(timerId); clearInterval(covId);
    panel.className = '';
    const cfg = getCfg();
    const rec = GM_getValue('gcRec', {});
    const hist = GM_getValue('gcHist', []);
    const last = GM_getValue('gcLast', null);
    const stats = GM_getValue('gcStats', {});
    const recLine = (k) => {
      if (k === 'area') return '';
      const r = rec[k];
      return recScore(r) ? `🏆 Recorde (${regionLabel(k)}): <b>${recScore(r)}</b>${r.n ? ' (' + esc(r.n) + ')' : ''}` : 'Sem recorde nessa região ainda';
    };
    const histHtml = hist.slice(0, 8).map((h) => {
      const d = new Date(h.t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const who = h.players ? h.players.map((p) => `${esc(p.name)} <b>${p.total}</b>`).join(', ') : `<b>${h.total}</b>`;
      return `${d} · ${h.duel ? '⚔️ ' : ''}${esc(h.region === 'area' && h.areaLabel ? h.areaLabel : regionLabel(h.region))} · ${who}`;
    }).join('<br>');
    const statRows = Object.entries(stats).map(([n, s]) => ({ n, ...s }))
      .sort((a, b) => b.w - a.w || (b.pts / Math.max(1, b.r)) - (a.pts / Math.max(1, a.r)));
    const statsHtml = statRows.map((s, i) =>
      `${i + 1}. <b>${esc(s.n)}</b> · ${s.w} vit. em ${s.g} partidas<br>&nbsp;&nbsp;&nbsp;média ${Math.round(s.pts / Math.max(1, s.r))}/rodada · melhor partida ${s.best}<br>` +
      `&nbsp;&nbsp;&nbsp;km médio ${s.kmN ? Math.round(s.km / s.kmN) : '-'} · melhor palpite ${s.bestKm == null ? '-' : s.bestKm + ' km'} · 🌐 ${s.cty} países`).join('<br>');

    panel.innerHTML = `
      <div id="gc-title">🌍 GeoChute</div>
      <div id="gc-info">${msg && msg !== 'GeoChute 🌍' ? msg : ''}</div>
      <label>Região
        <select id="gc-region">${REGIONS.map((r) => `<option value="${r[0]}" ${cfg.region === r[0] ? 'selected' : ''}>${r[1]}</option>`).join('')}</select>
      </label>
      <div id="gc-areabox" style="display:none">
        <label>Áreas salvas <select id="gc-areasel"></select></label>
        <label>Buscar nova área
          <div class="gc-row"><select id="gc-areakind" style="width:40%">${KINDS.map((k) => `<option value="${k[0]}">${k[1]}</option>`).join('')}</select>
          <input class="gc-name" id="gc-areaq" maxlength="60" placeholder="Ex.: São Paulo" style="margin-top:3px"></div>
        </label>
        <button id="gc-areago" class="gc-sec">🔎 Buscar fronteira</button>
        <div id="gc-areast" style="font-size:12px;color:#9aa6bd;margin-top:4px"></div>
      </div>
      <label>Dificuldade dos locais
        <select id="gc-diff">${DIFFS.map((d) => `<option value="${d[0]}" ${cfg.diff === d[0] ? 'selected' : ''}>${d[1]}</option>`).join('')}</select>
      </label>
      <label>Rodadas
        <select id="gc-rounds">${ROUND_OPTS.map((n) => `<option value="${n}" ${cfg.rounds === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </label>
      <label>Tempo por rodada
        <select id="gc-time">${TIMES.map((t) => `<option value="${t[0]}" ${cfg.time === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select>
      </label>
      <label>Jogadores (revezando no mesmo PC, cada um com um local diferente)
        <select id="gc-np">${Array.from({ length: MAX_PLAYERS }, (_, i) => `<option value="${i + 1}" ${cfg.np === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>
      </label>
      <div id="gc-names"></div>
      <label class="gc-chk"><input type="checkbox" id="gc-nmpz" ${cfg.nmpz ? 'checked' : ''}> Sem mover/zoom (só olhar em volta)</label>
      <label class="gc-chk"><input type="checkbox" id="gc-country" ${cfg.country ? 'checked' : ''}> 🌐 Bônus de +${COUNTRY_BONUS} por acertar o país</label>
      <label class="gc-chk" id="gc-duelrow"><input type="checkbox" id="gc-duel" ${cfg.duel ? 'checked' : ''}> ⚔️ Modo duelo (2+ jogadores)</label>
      <div id="gc-duelinfo" style="font-size:11px;color:#9aa6bd;margin:2px 0 0 24px"></div>
      <div id="gc-rec" style="font-size:12px;margin-top:8px;color:#c5cee0">${recLine(cfg.region)}</div>
      <button id="gc-go">Começar</button>
      ${last && last.v === 2 ? '<button id="gc-last" class="gc-sec">Ver mapa da última partida</button>' : ''}
      ${statRows.length ? `<details><summary>🏅 Ranking e estatísticas (${statRows.length})</summary><div style="margin-top:6px">${statsHtml}</div></details>` : ''}
      ${hist.length ? `<details><summary>Histórico (${hist.length})</summary><div style="margin-top:6px">${histHtml}</div></details>` : ''}
      ${(hist.length || statRows.length) ? '<button id="gc-clr" class="gc-danger">Limpar histórico, recordes e ranking</button>' : ''}`;

    const names = cfg.names.slice();
    const npEl = panel.querySelector('#gc-np');
    const duelEl = panel.querySelector('#gc-duel');
    function renderNames() {
      const n = Number(npEl.value);
      const box = panel.querySelector('#gc-names');
      box.innerHTML = n > 1 ? Array.from({ length: n }, (_, i) =>
        `<input class="gc-name" data-i="${i}" maxlength="14" value="${esc(names[i])}" style="border-left:6px solid ${PLAYER_COLORS[i]}">`).join('') : '';
      box.querySelectorAll('input.gc-name').forEach((inp) => { inp.oninput = () => { names[Number(inp.dataset.i)] = inp.value; }; });
      duelEl.disabled = n < 2;
      panel.querySelector('#gc-duelrow').style.opacity = n < 2 ? '.5' : '1';
      panel.querySelector('#gc-duelinfo').textContent = n < 2 ? '' :
        `Todos começam com ${DUEL_HP} ❤. Quem faz menos pontos perde a diferença para o melhor (dano cresce a cada rodada). Até ${DUEL_MAX} rodadas ou sobrar um.`;
    }
    npEl.onchange = renderNames;
    renderNames();

    const readCfg = () => {
      const np = Number(npEl.value);
      const clean = names.map((n, i) => (n || '').trim() || `Jogador ${i + 1}`);
      return {
        region: panel.querySelector('#gc-region').value,
        diff: panel.querySelector('#gc-diff').value,
        rounds: Number(panel.querySelector('#gc-rounds').value),
        areaId: panel.querySelector('#gc-areasel').value,
        time: Number(panel.querySelector('#gc-time').value),
        nmpz: panel.querySelector('#gc-nmpz').checked,
        country: panel.querySelector('#gc-country').checked,
        duel: duelEl.checked && np > 1,
        np, names: clean,
      };
    };
    const areaSel = panel.querySelector('#gc-areasel');
    const fillAreas = (sel) => {
      const list = getAreas();
      areaSel.innerHTML = list.length
        ? list.map((a) => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.label)}</option>`).join('')
        : '<option value="">Nenhuma salva ainda</option>';
    };
    fillAreas(cfg.areaId);
    const syncRegion = () => {
      const r = panel.querySelector('#gc-region').value;
      panel.querySelector('#gc-areabox').style.display = r === 'area' ? 'block' : 'none';
      panel.querySelector('#gc-diff').disabled = r === 'f1' || r === 'area';
      panel.querySelector('#gc-country').disabled = r === 'area';
      panel.querySelector('#gc-go').disabled = r === 'area' && !areaSel.value;
      panel.querySelector('#gc-rec').innerHTML = recLine(r);
    };
    panel.querySelector('#gc-region').onchange = syncRegion;
    areaSel.onchange = syncRegion;
    const areaGo = panel.querySelector('#gc-areago');
    const areaSt = panel.querySelector('#gc-areast');
    areaGo.onclick = async () => {
      const q = panel.querySelector('#gc-areaq').value.trim();
      if (!q) { areaSt.textContent = 'Digite o nome de um lugar.'; return; }
      areaGo.disabled = true; areaSt.textContent = 'Buscando a fronteira…';
      try {
        const a = await searchArea(q, panel.querySelector('#gc-areakind').value);
        const list = getAreas().filter((x) => x.id !== a.id);
        list.unshift(a);
        GM_setValue('gcAreas', list.slice(0, 8));
        areaCache = {};
        fillAreas(a.id);
        areaSt.textContent = `✔ ${a.label} pronto para jogar`;
      } catch (e) { areaSt.textContent = '⚠ ' + e; }
      areaGo.disabled = false;
      syncRegion();
    };
    syncRegion();
    panel.querySelector('#gc-go').onclick = () => {
      const c = readCfg();
      GM_setValue('gcCfg', Object.assign({}, c, { duel: duelEl.checked }));
      state = fresh();
      state.cfg = { region: c.region, diff: c.diff, rounds: c.rounds, time: c.time, nmpz: c.nmpz, country: c.country && c.region !== 'area', areaId: c.areaId, duel: c.duel, players: c.names.slice(0, c.np) };
      state.totals = state.cfg.players.map(() => 0);
      state.logs = state.cfg.players.map(() => []);
      state.hp = state.cfg.players.map(() => DUEL_HP);
      newRound(state);
    };
    const lastBtn = panel.querySelector('#gc-last');
    if (lastBtn) lastBtn.onclick = () => showFinal(last, '');
    const clr = panel.querySelector('#gc-clr');
    if (clr) clr.onclick = () => {
      if (!confirm('Apagar histórico, recordes e ranking?')) return;
      GM_setValue('gcHist', []);
      GM_setValue('gcRec', {});
      GM_setValue('gcLast', null);
      GM_setValue('gcStats', {});
      showStart('');
    };
  }

  function showGame() {
    clearInterval(timerId); clearInterval(covId);
    panel.className = 'game';
    const N = state.cfg.players.length;
    const duel = !!state.cfg.duel;
    const pName = state.cfg.players[state.pi];
    const pColor = PLAYER_COLORS[state.pi % PLAYER_COLORS.length];
    const MR = maxRounds(state);

    const resetGame = () => {
      if (!confirm('Reiniciar? A partida atual será perdida.')) return;
      state = fresh();
      save(state);
      showStart('');
    };
    const advLabel = () => {
      const nx = nextAlive(state, state.pi);
      if (nx !== -1) return `Passar para ${state.cfg.players[nx]}`;
      if (duel) return 'Aplicar dano ⚔️';
      return state.round >= MR ? 'Ver resultado final' : 'Próxima rodada';
    };
    const advance = () => {
      if (nextAlive(state, state.pi) !== -1) { passTurn(); return; }
      if (duel) {
        applyDuel(state);
        const alive = state.cfg.players.filter((_, i) => isAlive(state, i)).length;
        if (alive <= 1 || state.round >= MR) { endGame(); return; }
        newRound(state);
        return;
      }
      if (state.round >= MR) endGame();
      else newRound(state);
    };

    if (state.revealed) {
      panel.innerHTML = `<div id="gc-info">${esc(state.last)}</div>
        <button id="gc-ok">${esc(advLabel())}</button>
        <button id="gc-reset" class="gc-danger">Reiniciar</button>`;
      panel.querySelector('#gc-ok').onclick = advance;
      panel.querySelector('#gc-reset').onclick = resetGame;
      return;
    }

    const chips = N > 1 ? state.cfg.players.map((n, i) => {
      const c = PLAYER_COLORS[i % PLAYER_COLORS.length];
      const dead = duel && state.hp[i] <= 0;
      const val = duel ? `❤ ${state.hp[i]}` : state.totals[i];
      const bar = duel ? `<span class="gc-bar"><i style="width:${Math.max(0, Math.min(100, state.hp[i] / DUEL_HP * 100))}%;background:${c}"></i></span>` : '';
      return `<span class="gc-chip${i === state.pi ? ' on' : ''}${dead ? ' dead' : ''}" style="--c:${c}"><span>${esc(n)} <b>${val}</b></span>${bar}</span>`;
    }).join('') : '';
    panel.innerHTML = `
      <div id="gc-info"><span class="gc-pill">${duel ? '⚔️ ' : ''}Rodada ${state.round}/${MR}</span>${N > 1 ? `<span style="color:${pColor}">${esc(pName)}</span>` : `${state.totals[state.pi]} pts`}
        <span id="gc-timer">${state.cfg.time > 0 ? '⏱ …' : ''}</span></div>
      <div class="gc-chips">${chips}</div>
      <div id="gc-hint"></div>
      <div id="gc-warn"></div>
      <div id="gc-map"></div>
      <button id="gc-ok" disabled>Clique no mapa para chutar</button>
      <div class="gc-row">
        <button id="gc-hintbtn" class="gc-sec"></button>
        <button id="gc-home" class="gc-sec">↩ Início</button>
      </div>
      <div class="gc-row">
        <button id="gc-skip" class="gc-sec" title="Sorteia outro local sem penalidade">🚫 Sem cobertura</button>
        <button id="gc-reset" class="gc-danger">Reiniciar</button>
      </div>`;

    const warn = panel.querySelector('#gc-warn');
    if (state.notice) { warn.textContent = state.notice; warn.className = 'ok'; state.notice = ''; save(state); }

    const map = L.map('gc-map', { worldCopyJump: true }).setView([20, 0], 1);
    addTiles(map, warn);
    const gArea = areaOf(state);
    const fitArea = () => { if (gArea) map.fitBounds([[gArea.bbox[0], gArea.bbox[2]], [gArea.bbox[1], gArea.bbox[3]]]); };
    fitArea();
    setTimeout(() => { map.invalidateSize(); if (!guess && !done) fitArea(); }, 300);
    panel.ontransitionend = () => map.invalidateSize();

    let guess = null, marker = null, done = false, timerStarted = false;
    const ok = panel.querySelector('#gc-ok');
    const hintBtn = panel.querySelector('#gc-hintbtn');
    const homeBtn = panel.querySelector('#gc-home');
    const skipBtn = panel.querySelector('#gc-skip');

    function refreshOk() {
      if (done) return;
      ok.disabled = !guess;
      ok.textContent = !guess ? 'Clique no mapa para chutar' : 'Confirmar palpite';
    }
    function updateHintUI() {
      if (areaOf(state)) { hintBtn.textContent = '💡 Sem dicas nesta área'; hintBtn.disabled = true; return; }
      panel.querySelector('#gc-hint').textContent = state.hint === 0 ? '' :
        state.hint === 1 ? `💡 Continente: ${state.continent}` : `💡 ${state.country} · ${state.continent}`;
      hintBtn.textContent = state.hint === 0 ? '💡 Continente −500' :
        state.hint === 1 ? '💡 País −1000' : '💡 Sem mais dicas';
      hintBtn.disabled = done || state.hint >= 2;
    }
    hintBtn.onclick = () => { if (done || state.hint >= 2) return; state.hint += 1; save(state); updateHintUI(); };
    homeBtn.onclick = () => {
      location.href = state.startUrl ||
        `https://www.google.com/maps?layer=c&cbll=${state.target.lat},${state.target.lng}`;
    };
    updateHintUI();
    refreshOk();

    map.on('click', (e) => {
      if (done) return;
      guess = e.latlng;
      if (marker) marker.setLatLng(guess);
      else marker = L.circleMarker(guess, { radius: 8, color: '#fff', weight: 2, fillColor: pColor, fillOpacity: 1 }).addTo(map);
      refreshOk();
    });

    skipBtn.onclick = () => {
      if (done) return;
      clearInterval(timerId); clearInterval(covId);
      rerollTarget(state);
    };
    panel.querySelector('#gc-reset').onclick = resetGame;

    function doReveal() {
      if (done) return;
      done = true;
      clearInterval(timerId); clearInterval(covId);
      panel.classList.add('big');
      if (!state.validated) {
        const p = location.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+),3a/);
        if (p) state.target = { lat: Number(p[1]), lng: Number(p[2]) };
      }
      const pi = state.pi, T = state.target;
      const revealAt = Date.now();
      hintBtn.disabled = true; homeBtn.disabled = true; skipBtn.disabled = true;
      if (state.cfg.country && guess) {
        ok.disabled = true; ok.textContent = '🌐 Conferindo o país…';
        sameCountry({ lat: guess.lat, lng: guess.lng }, T).then((hit) => finish(hit));
      } else finish(false);

      function finish(countryHit) {
        let km = null, base = 0;
        if (guess) { km = haversineKm({ lat: guess.lat, lng: guess.lng }, T); base = pointsFor(km, scaleOf(state)); }
        const pen = HINT_COST[state.hint];
        let pts = Math.max(0, base - pen);
        let bonus = 0;
        if (guess && pts > 0 && state.cfg.time > 0 && state.deadline) {
          const left = Math.max(0, (state.deadline - revealAt) / 1000);
          bonus = Math.round(pts * BONUS_MAX * Math.min(1, left / state.cfg.time));
        }
        pts += bonus;
        const cb = countryHit ? COUNTRY_BONUS : 0;
        pts += cb;
        state.totals[pi] += pts;
        state.roundPts[pi] = pts;
        state.logs[pi].push({ name: state.name, country: state.country, km: km === null ? null : Math.round(km), pts, hint: state.hint, bonus, cb });
        state.places.push({ r: state.round, pi, name: state.name, country: state.country, lat: T.lat, lng: T.lng,
          guess: guess ? { lat: guess.lat, lng: guess.lng } : null });
        state.revealed = true;
        state.last = km === null
          ? `⏱ Tempo esgotado! Era perto de ${placeStr(state.name, state.country)}. +0 pts (total ${state.totals[pi]})`
          : `${Math.round(km)} km · +${pts} pts${pen ? ` (dica −${pen})` : ''}${bonus ? ` · ⚡+${bonus}` : ''}${cb ? ` · 🌐+${cb}` : ''} · total ${state.totals[pi]}`;
        save(state);

        L.marker([T.lat, T.lng], { icon: pinIcon('★') }).addTo(map)
          .bindPopup(`Era perto de ${esc(placeStr(state.name, state.country))}`).openPopup();
        if (guess) {
          L.polyline([guess, [T.lat, T.lng]], { color: pColor, dashArray: '6' }).addTo(map);
          map.fitBounds(L.latLngBounds([guess, [T.lat, T.lng]]).pad(0.3));
        } else {
          map.setView([T.lat, T.lng], 5);
        }
        panel.querySelector('#gc-info').textContent = state.last;
        panel.querySelector('.gc-chips').textContent = '';
        ok.disabled = false;
        ok.textContent = advLabel();
        ok.onclick = advance;
      }
    }
    ok.onclick = () => { if (!done) doReveal(); };

    function maybeStartTimer() {
      if (timerStarted || done || state.handoff || !ready || state.cfg.time <= 0) return;
      timerStarted = true;
      if (!state.deadline) { state.deadline = Date.now() + state.cfg.time * 1000; save(state); }
      const tEl = panel.querySelector('#gc-timer');
      const tick = () => {
        const left = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
        tEl.textContent = '⏱ ' + fmt(left);
        tEl.style.color = left <= 15 ? '#f87171' : '';
        if (left <= 0) doReveal();
      };
      tick();
      if (!done) timerId = setInterval(tick, 250);
    }

    let ready = !!state.validated;
    function markReady() { ready = true; refreshOk(); maybeStartTimer(); }
    if (!state.validated) {
      const loadStart = Date.now();
      covId = setInterval(() => {
        if (done) { clearInterval(covId); return; }
        const href = location.href;
        const pos = href.match(/@(-?\d+\.\d+),(-?\d+\.\d+),3a/);
        const elapsed = Date.now() - loadStart;
        if (pos) {
          const idm = href.match(/!1s([^!]+)!2e/);
          state.target = { lat: Number(pos[1]), lng: Number(pos[2]) };
          state.startPano = idm ? idm[1] : null;
          state.startUrl = href;
          state.validated = true;
          save(state);
          clearInterval(covId);
          if (warn.textContent.startsWith('Não detectei')) warn.textContent = '';
          markReady();
          return;
        }
        if (elapsed > TIMER_FALLBACK_MS && !ready) markReady();
        if (elapsed > NO_STREETVIEW_HINT_MS && !warn.textContent) {
          warn.className = '';
          warn.textContent = 'Não detectei o Street View. Se estiver tela preta, use "Sem cobertura".';
        }
      }, 500);
    } else {
      markReady();
    }

    if (state.handoff && N > 1) {
      const ov = document.createElement('div');
      ov.id = 'gc-hand';
      ov.innerHTML = `<div>Vez de <b style="color:${pColor}">${esc(pName)}</b></div>
        <div style="font-size:14px;opacity:.7">Rodada ${state.round}/${MR}${duel ? ` · ❤ ${state.hp[state.pi]}` : ''}</div>
        <button id="gc-ready">Estou pronto</button>`;
      document.body.appendChild(ov);
      ov.querySelector('#gc-ready').onclick = () => {
        ov.remove();
        state.handoff = false;
        save(state);
        maybeStartTimer();
      };
    }
  }

  function showFinal(data, badge) {
    clearInterval(timerId); clearInterval(covId);
    panel.className = 'final';
    const many = data.players.length > 1;
    const duel = !!data.duel;
    const medals = ['🥇', '🥈', '🥉'];
    const sorted = data.players.map((p, i) => ({ ...p, i }))
      .sort((a, b) => duel ? (b.hp - a.hp) || (b.total - a.total) : b.total - a.total);
    const rank = sorted.map((p, k) =>
      `${many ? (medals[k] || '▫️') + ' ' : ''}<span style="color:${PLAYER_COLORS[p.i]}">●</span> <b>${esc(p.name)}</b> — ${p.total} pts${duel ? ` · ❤ ${p.hp}` : ''}`).join('<br>');
    const detail = data.players.map((p, i) =>
      `<b style="color:${PLAYER_COLORS[i]}">${esc(p.name)}</b><br>` +
      p.log.map((e, r) => `&nbsp;&nbsp;${r + 1}. ${esc(placeStr(e.name, e.country))}: ${e.km === null ? 'sem palpite' : e.km + ' km'} (${e.pts} pts${e.hint ? ' · dica' : ''}${e.bonus ? ' · ⚡' + e.bonus : ''}${e.cb ? ' · 🌐' + e.cb : ''})`).join('<br>')
    ).join('<br>');
    const legend = (many ? data.players.map((p, i) => `<span style="color:${PLAYER_COLORS[i]}">●</span> ${esc(p.name)}`).join(' &nbsp; ') + ' &nbsp; ' : '') + 'número = lugar real (rodada)';

    panel.innerHTML = `
      <div id="gc-title">${duel ? '⚔️ Fim do duelo!' : 'Fim da partida!'}</div>
      <div id="gc-info">${esc(data.region === 'area' && data.areaLabel ? data.areaLabel : regionLabel(data.region))}</div>
      <div style="margin-bottom:4px">${rank}</div>
      ${badge ? `<div style="margin-bottom:4px">${badge}</div>` : ''}
      <div id="gc-fmap"></div>
      <div style="font-size:12px;color:#c5cee0">${legend}</div>
      <details><summary>Detalhes por jogador</summary><div style="margin-top:6px">${detail}</div></details>
      <button id="gc-new">Nova partida</button>`;
    panel.querySelector('#gc-new').onclick = () => showStart('');

    const map = L.map('gc-fmap', { worldCopyJump: true }).setView([20, 0], 1);
    addTiles(map, null);
    const pts = [];
    data.places.forEach((pl) => {
      const col = PLAYER_COLORS[pl.pi % PLAYER_COLORS.length];
      const real = [pl.lat, pl.lng];
      pts.push(real);
      L.marker(real, { icon: pinIcon(String(pl.r), col) }).addTo(map)
        .bindTooltip(`${data.players[pl.pi].name} · rodada ${pl.r}: ${placeStr(pl.name, pl.country)}`);
      if (pl.guess) {
        pts.push([pl.guess.lat, pl.guess.lng]);
        L.polyline([[pl.guess.lat, pl.guess.lng], real], { color: col, weight: 2, dashArray: '4' }).addTo(map);
        L.circleMarker([pl.guess.lat, pl.guess.lng], { radius: 6, color: '#fff', weight: 2, fillColor: col, fillOpacity: 1 }).addTo(map)
          .bindTooltip(`Palpite de ${data.players[pl.pi].name} · rodada ${pl.r}`);
      }
    });
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.15));
    setTimeout(() => { map.invalidateSize(); if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.15)); }, 300);
  }

  function endGame() {
    const cfg = state.cfg;
    const data = {
      v: 2, t: Date.now(), region: cfg.region, areaLabel: (areaOf(state) || {}).label || '', nmpz: cfg.nmpz, time: cfg.time, duel: !!cfg.duel,
      players: cfg.players.map((n, i) => ({ name: n, total: state.totals[i], hp: state.hp[i], log: state.logs[i] })),
      places: state.places,
    };
    const hist = GM_getValue('gcHist', []);
    hist.unshift({ t: data.t, region: data.region, areaLabel: data.areaLabel, nmpz: data.nmpz, time: data.time, duel: data.duel,
      players: data.players.map((p) => ({ name: p.name, total: p.total })) });
    GM_setValue('gcHist', hist.slice(0, 30));
    GM_setValue('gcLast', data);

    // estatísticas por jogador
    const stats = GM_getValue('gcStats', {});
    const key = (p) => (data.duel ? p.hp * 100000 + p.total : p.total);
    const topKey = Math.max(...data.players.map(key));
    data.players.forEach((p) => {
      const s = stats[p.name] || { g: 0, w: 0, pts: 0, best: 0, r: 0, km: 0, kmN: 0, bestKm: null, cty: 0 };
      s.g += 1;
      if (data.players.length > 1 && key(p) === topKey) s.w += 1;
      s.pts += p.total; s.best = Math.max(s.best, p.total);
      p.log.forEach((e) => {
        s.r += 1;
        if (e.km !== null) { s.km += e.km; s.kmN += 1; s.bestKm = s.bestKm === null ? e.km : Math.min(s.bestKm, e.km); }
        if (e.cb) s.cty += 1;
      });
      stats[p.name] = s;
    });
    GM_setValue('gcStats', stats);

    let badge = '';
    if (!data.duel && data.region !== 'area') {
      const rec = GM_getValue('gcRec', {});
      let best = recScore(rec[data.region]);
      const winners = [];
      data.players.forEach((p) => {
        if (p.total > best) { best = p.total; rec[data.region] = { s: p.total, n: p.name }; winners.push(p.name); }
      });
      if (winners.length) {
        GM_setValue('gcRec', rec);
        badge = `🏆 Novo recorde de ${esc(winners[winners.length - 1])}!`;
      }
    }
    state = fresh();
    save(state);
    showFinal(data, badge);
  }

  // ---------- modo "sem mover/zoom" (melhor esforço) ----------
  const nmpzOn = () => state.target && state.cfg && state.cfg.nmpz && !state.revealed && state.round > 0;

  ['wheel', 'dblclick'].forEach((ev) => window.addEventListener(ev, (e) => {
    if (!nmpzOn() || panel.contains(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, { capture: true, passive: false }));
  window.addEventListener('keydown', (e) => {
    if (!nmpzOn() || panel.contains(e.target)) return;
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', '+', '=', '-', '_'].includes(e.key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  setInterval(() => {
    if (!nmpzOn() || !state.validated || !state.startPano || !/,3a,/.test(location.href)) return;
    const m = location.href.match(/!1s([^!]+)!2e/);
    if (!m || m[1] === state.startPano) return;
    state.reverts += 1;
    if (state.reverts > 5) {
      state.cfg.nmpz = false;
      save(state);
      toast('Não consegui travar o movimento nessa rodada');
      return;
    }
    save(state);
    toast('🚫 Modo sem mover: voltando ao ponto inicial');
    location.href = state.startUrl;
  }, 600);

  // ---------- início ----------
  if (state.target && state.round > 0) showGame();
  else showStart('');
})();

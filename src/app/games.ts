// Juegos incrustados (spec 09, D-099): se cargan desde su propio sitio, así que necesitan conexión.
export interface Game {
  id: string;
  name: string;
  url: string;
}

export const GAMES: readonly Game[] = [{ id: 'combinados', name: 'CombinaDos', url: 'https://velvety-pasca-9a2e5c.netlify.app/' }];

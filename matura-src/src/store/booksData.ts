// Wszystkie lektury i pytania do ustnego w jednym module: import('./booksData') daje jeden osobny plik.
import type { BooksRaw } from './books';

const lektury = import.meta.glob('../../data/lektury/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const ustny = import.meta.glob('../../data/ustny/pytania-jawne.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const zad2 = import.meta.glob('../../data/ustny/zadanie2.json', { eager: true, import: 'default' }) as Record<string, unknown>;

const data: BooksRaw = { lektury, ustny: Object.values(ustny)[0], zad2: Object.values(zad2)[0] };
export default data;

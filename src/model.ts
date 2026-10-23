import products from './data/products.json';
export { products };
export type ProductId = string;
export const DAY_SECONDS = 120;
export function generateOrder(served: number, random: () => number = Math.random): ProductId[] {
  const count = served < 2 ? 1 : served < 6 ? 2 : 3;
  return Array.from({ length: count }, () => products[Math.min(products.length - 1, Math.max(0, Math.floor(random() * products.length)))].id);
}
export function sameOrder(a: ProductId[], b: ProductId[]): boolean {
  return a.length === b.length && [...a].sort().every((id, i) => id === [...b].sort()[i]);
}
export class Shift {
  remaining = DAY_SECONDS; coins = 0; combo = 0; bestCombo = 0; served = 0; mistakes = 0;
  closed = false; basket: ProductId[] = []; order: ProductId[];
  constructor(private random: () => number = Math.random) { this.order = generateOrder(0, random); }
  select(id: ProductId) { if (!this.closed && this.basket.length < 3 && products.some(p => p.id === id)) this.basket.push(id); }
  undo() { if (!this.closed) this.basket.pop(); }
  clear() { if (!this.closed) this.basket = []; }
  tick(seconds: number) { if (this.closed || seconds <= 0) return; this.remaining = Math.max(0, this.remaining - seconds); if (this.remaining === 0) this.closed = true; }
  checkout(): { correct: boolean; reward: number } | null {
    if (this.closed || !this.basket.length) return null;
    if (!sameOrder(this.order, this.basket)) {
      this.combo = 0; this.mistakes++; this.tick(3); return { correct: false, reward: 0 };
    }
    this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
    const base = this.order.reduce((sum, id) => sum + products.find(p => p.id === id)!.price, 0);
    const reward = base + Math.min(this.combo - 1, 5) * 2;
    this.coins += reward; this.served++; this.basket = []; this.order = generateOrder(this.served, this.random);
    return { correct: true, reward };
  }
}

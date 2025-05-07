export default function randomPick<T>(arr: T[]): number {
  return Math.floor(Math.random() * arr.length);
}

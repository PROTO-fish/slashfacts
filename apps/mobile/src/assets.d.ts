// Metro resolves a font/image require() to a numeric asset id at runtime; TypeScript has
// no built-in ambient type for that, so declare the one extension this app requires.
declare module '*.ttf' {
  const asset: number;
  export default asset;
}

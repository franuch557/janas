declare module 'virtual:cke-manifest' {
  /** Pakiety obrazów obecne w public/cke/ w chwili budowania (null = nieznane). */
  const manifest: string[] | null;
  export default manifest;
}

declare module 'aos' {
  const AOS: {
    init: (options?: Record<string, unknown>) => void;
    refreshHard: () => void;
  };

  export default AOS;
}

// Zaślepka @huggingface/transformers w wersji jednoplikowej (artefakt): ocenę sensu odpowiedzi
// robi tam Claude, a silnik modelu zawiera wywołania niedozwolone w artefakcie.
export function pipeline(): never {
  throw new Error('Model oceny jest niedostępny w artefakcie');
}

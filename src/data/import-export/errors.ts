export type ImportErrorCode =
  | 'empty'
  | 'invalidJson'
  | 'unsupportedFormat'
  | 'unsupportedVersion'
  | 'isBackup'
  | 'notBackup'
  | 'tooFewColumns';

/** Erreur d'import identifiée par un code, traduit dans l'interface. */
export class ImportError extends Error {
  readonly code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string = code) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
  }
}

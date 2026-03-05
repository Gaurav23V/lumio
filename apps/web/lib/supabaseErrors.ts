export function isMissingBookForeignKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("progress_book_id_fkey") ||
    (message.includes("foreign key") && message.includes("books"))
  );
}

export function languageFromPath(path: string | null): string {
  const extension = path?.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "css":
      return "css";
    case "html":
      return "html";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "py":
      return "python";
    case "ts":
    case "tsx":
      return "typescript";
    case "yml":
    case "yaml":
      return "yaml";
    default:
      return "plaintext";
  }
}
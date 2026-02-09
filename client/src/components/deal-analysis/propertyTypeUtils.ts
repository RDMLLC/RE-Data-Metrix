export function normalizePropertyTypeToEnum(apiValue: string | undefined): string {
  if (!apiValue) return "";
  const lower = apiValue.toLowerCase().trim();
  if (lower.includes("single") && lower.includes("family")) return "SINGLE_FAMILY";
  if (lower.includes("multi") && lower.includes("family")) return "MULTI_FAMILY";
  if (lower.includes("condo") || lower.includes("co-op") || lower.includes("coop")) return "CONDO";
  if (lower.includes("townhouse") || lower.includes("townhome") || lower.includes("town house")) return "TOWNHOUSE";
  if (lower.includes("lot") || lower.includes("land")) return "LOT";
  if (lower.includes("manufactured") || lower.includes("mobile")) return "MANUFACTURED";
  if (lower.includes("apartment")) return "APARTMENT";
  const upperSnake = apiValue.toUpperCase().replace(/[\s-]+/g, "_");
  if (["SINGLE_FAMILY", "MULTI_FAMILY", "CONDO", "TOWNHOUSE", "LOT", "MANUFACTURED", "APARTMENT"].includes(upperSnake)) {
    return upperSnake;
  }
  return "";
}

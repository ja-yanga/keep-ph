import ipaddr from "ipaddr.js";

export function resolveClientIp(
  headers: Headers,
  fallbackIp?: string | null,
): string | null {
  let resolvedIp = fallbackIp ?? null;
  const forwardedFor = headers.get("x-forwarded-for");

  if (!resolvedIp && forwardedFor) {
    resolvedIp = forwardedFor.split(",")[0]?.trim() || null;
  }

  if (!resolvedIp || resolvedIp === "::1" || resolvedIp === "127.0.0.1") {
    const altIp =
      headers.get("x-real-ip") ||
      headers.get("cf-connecting-ip") ||
      headers.get("x-client-ip");
    if (altIp) resolvedIp = altIp;
  }

  return resolvedIp ?? null;
}

export function normalizeCidr(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("IP or CIDR is required.");
  }

  if (trimmed.includes("/")) {
    const [addr, prefix] = ipaddr.parseCIDR(trimmed);
    return `${addr.toNormalizedString()}/${prefix}`;
  }

  const addr = ipaddr.parse(trimmed);
  const prefix = addr.kind() === "ipv6" ? 128 : 32;
  return `${addr.toNormalizedString()}/${prefix}`;
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const normalizedIp = ipaddr.process(ip);
  let cidrValue: [ipaddr.IPv4 | ipaddr.IPv6, number];
  if (cidr.includes("/")) {
    cidrValue = ipaddr.parseCIDR(cidr);
  } else {
    const addr = ipaddr.parse(cidr);
    cidrValue = [addr, addr.kind() === "ipv6" ? 128 : 32];
  }
  const [cidrAddr, cidrBits] = cidrValue;
  if (
    normalizedIp.kind() !== cidrAddr.kind() &&
    cidrAddr.kind() === "ipv6" &&
    (cidrAddr as ipaddr.IPv6).isIPv4MappedAddress()
  ) {
    const mappedV4 = (cidrAddr as ipaddr.IPv6).toIPv4Address();
    return normalizedIp.match([mappedV4, 32]);
  }
  if (
    normalizedIp.kind() !== cidrAddr.kind() &&
    normalizedIp.kind() === "ipv6" &&
    (normalizedIp as ipaddr.IPv6).isIPv4MappedAddress()
  ) {
    const mappedV4 = (normalizedIp as ipaddr.IPv6).toIPv4Address();
    if (cidrAddr.kind() === "ipv4") {
      return mappedV4.match([cidrAddr as ipaddr.IPv4, cidrBits]);
    }
  }
  return normalizedIp.match(cidrValue);
}

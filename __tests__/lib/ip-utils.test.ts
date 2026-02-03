import { resolveClientIp, normalizeCidr, isIpInCidr } from "@/lib/ip-utils";

describe("lib/ip-utils", () => {
  describe("resolveClientIp", () => {
    it("returns first IP from x-forwarded-for", () => {
      const headers = new Headers({
        "x-forwarded-for": "203.0.113.50, 10.0.0.1",
      });
      expect(resolveClientIp(headers, null)).toBe("203.0.113.50");
    });

    it("uses fallback when no forwarding headers", () => {
      const headers = new Headers();
      expect(resolveClientIp(headers, "192.168.1.1")).toBe("192.168.1.1");
    });

    it("returns null when no headers and no fallback", () => {
      const headers = new Headers();
      expect(resolveClientIp(headers, null)).toBe(null);
    });

    it("prefers x-real-ip when resolved is localhost", () => {
      const headers = new Headers({
        "x-forwarded-for": "127.0.0.1",
        "x-real-ip": "203.0.113.10",
      });
      expect(resolveClientIp(headers, null)).toBe("203.0.113.10");
    });

    it("prefers cf-connecting-ip when resolved is ::1", () => {
      const headers = new Headers({
        "x-forwarded-for": "::1",
        "cf-connecting-ip": "2001:db8::1",
      });
      expect(resolveClientIp(headers, null)).toBe("2001:db8::1");
    });
  });

  describe("normalizeCidr", () => {
    it("normalizes IPv4 single address to /32", () => {
      expect(normalizeCidr("203.0.113.10")).toBe("203.0.113.10/32");
    });

    it("normalizes IPv6 single address to /128", () => {
      const result = normalizeCidr("2001:db8::1");
      expect(result).toContain("2001:db8");
      expect(result).toBe("2001:db8:0:0:0:0:0:1/128");
    });

    it("keeps CIDR as-is (normalized form)", () => {
      expect(normalizeCidr("203.0.113.0/24")).toBe("203.0.113.0/24");
    });

    it("trims whitespace", () => {
      expect(normalizeCidr("  203.0.113.10  ")).toBe("203.0.113.10/32");
    });

    it("throws on empty input", () => {
      expect(() => normalizeCidr("")).toThrow("IP or CIDR is required");
      expect(() => normalizeCidr("   ")).toThrow("IP or CIDR is required");
    });

    it("throws on invalid IP", () => {
      expect(() => normalizeCidr("not-an-ip")).toThrow();
      expect(() => normalizeCidr("256.1.1.1")).toThrow();
    });
  });

  describe("isIpInCidr", () => {
    it("returns true when IP is in IPv4 range", () => {
      expect(isIpInCidr("203.0.113.10", "203.0.113.0/24")).toBe(true);
      expect(isIpInCidr("203.0.113.255", "203.0.113.0/24")).toBe(true);
    });

    it("returns false when IP is outside IPv4 range", () => {
      expect(isIpInCidr("203.0.114.1", "203.0.113.0/24")).toBe(false);
      expect(isIpInCidr("192.168.1.1", "10.0.0.0/8")).toBe(false);
    });

    it("returns true for exact single-IP CIDR", () => {
      expect(isIpInCidr("203.0.113.10", "203.0.113.10/32")).toBe(true);
    });

    it("returns true when IP matches IPv6 range", () => {
      expect(isIpInCidr("2001:db8::1", "2001:db8::/32")).toBe(true);
    });

    it("handles IPv4-mapped IPv6", () => {
      expect(isIpInCidr("::ffff:203.0.113.10", "203.0.113.10/32")).toBe(true);
    });
  });
});

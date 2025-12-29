import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const propertyId = process.env.GA_PROPERTY_ID;
    const email = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!propertyId || !email || !privateKey) {
      return NextResponse.json(
        { error: "Missing Google Analytics credentials" },
        { status: 500 },
      );
    }

    const url = new URL(req.url);
    const range = url.searchParams.get("range") ?? "7d";
    const rangeMap: Record<string, { startDate: string; endDate: string }> = {
      "1d": { startDate: "1daysAgo", endDate: "today" },
      "7d": { startDate: "7daysAgo", endDate: "today" },
      "30d": { startDate: "30daysAgo", endDate: "today" },
      "90d": { startDate: "90daysAgo", endDate: "today" },
      "180d": { startDate: "180daysAgo", endDate: "today" },
      "365d": { startDate: "365daysAgo", endDate: "today" },
    };
    const dateRange = rangeMap[range] ?? rangeMap["7d"];

    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
    });

    // realtime active users (always fetch)
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: "activeUsers" }],
    });
    const activeNow = Number(
      realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || 0,
    );

    // Trend Data using selected range
    const [trendResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: dateRange.startDate, endDate: dateRange.endDate },
      ],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      limit: 10000,
      orderBys: [
        {
          dimension: { orderType: "ALPHANUMERIC", dimensionName: "date" },
          desc: false,
        },
      ],
    });

    // Device Data using selected range
    const [deviceResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: dateRange.startDate, endDate: dateRange.endDate },
      ],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
    });

    // Top Pages using selected range
    const [pagesResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: dateRange.startDate, endDate: dateRange.endDate },
      ],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              notExpression: {
                filter: {
                  fieldName: "pagePath",
                  stringFilter: {
                    matchType: "BEGINS_WITH",
                    value: "/admin",
                  },
                },
              },
            },
            {
              notExpression: {
                filter: {
                  fieldName: "pagePath",
                  stringFilter: {
                    matchType: "BEGINS_WITH",
                    value: "/api",
                  },
                },
              },
            },
          ],
        },
      },
      limit: 5,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    });

    // --- Process Data for Frontend ---
    const visitorData =
      trendResponse.rows?.map((row) => {
        const dateStr = row.dimensionValues?.[0].value || "";
        const formattedDate =
          dateStr.length === 8
            ? `${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`
            : dateStr;
        return {
          date: formattedDate,
          visitors: Number(row.metricValues?.[0].value || 0),
          pageviews: Number(row.metricValues?.[1].value || 0),
        };
      }) || [];

    const deviceColors: Record<string, string> = {
      desktop: "#228BE6",
      mobile: "#12B886",
      tablet: "#7950f2",
    };
    const deviceData =
      deviceResponse.rows?.map((row) => {
        const name = (
          row.dimensionValues?.[0].value || "unknown"
        ).toLowerCase();
        return {
          name,
          value: Number(row.metricValues?.[0].value || 0),
          color: deviceColors[name] || "#868e96",
        };
      }) || [];
    const topPages =
      pagesResponse.rows?.map((row) => ({
        name: row.dimensionValues?.[0].value || "/",
        views: Number(row.metricValues?.[0].value || 0),
      })) || [];

    const totalVisitors = visitorData.reduce(
      (acc, curr) => acc + curr.visitors,
      0,
    );
    const totalPageViews = visitorData.reduce(
      (acc, curr) => acc + curr.pageviews,
      0,
    );

    return NextResponse.json({
      visitorData,
      deviceData,
      topPages,
      stats: { activeNow, totalVisitors, totalPageViews },
    });
  } catch (error: unknown) {
    console.error("Analytics API Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch analytics";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

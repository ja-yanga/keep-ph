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
        { status: 500 }
      );
    }

    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
    });

    // 1. Fetch Trend Data (Visitors & Pageviews) - Last 7 Days
    const [trendResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      orderBys: [
        { dimension: { orderType: "ALPHANUMERIC", dimensionName: "date" } },
      ],
    });

    // 2. Fetch Device Data - Last 30 Days
    const [deviceResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
    });

    // 3. Fetch Top Pages - Last 30 Days (Filtered)
    const [pagesResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
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

    // Map Trend
    // GA returns date as YYYYMMDD, let's format it simply
    const visitorData =
      trendResponse.rows?.map((row) => {
        const dateStr = row.dimensionValues?.[0].value || "";
        // Format YYYYMMDD to readable (e.g., MM/DD)
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

    // Map Devices
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
          name: name,
          value: Number(row.metricValues?.[0].value || 0),
          color: deviceColors[name] || "#868e96",
        };
      }) || [];

    // Map Pages
    const topPages =
      pagesResponse.rows?.map((row) => ({
        name: row.dimensionValues?.[0].value || "/",
        views: Number(row.metricValues?.[0].value || 0),
      })) || [];

    // Calculate Totals from the trend data
    const totalVisitors = visitorData.reduce(
      (acc, curr) => acc + curr.visitors,
      0
    );
    const totalPageViews = visitorData.reduce(
      (acc, curr) => acc + curr.pageviews,
      0
    );

    return NextResponse.json({
      visitorData,
      deviceData,
      topPages,
      stats: {
        totalVisitors,
        totalPageViews,
      },
    });
  } catch (error: any) {
    console.error("Analytics API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

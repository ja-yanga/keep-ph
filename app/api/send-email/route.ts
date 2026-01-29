import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";

export async function POST(req: Request) {
  try {
    const { to, template, data } = await req.json();

    if (!to || !template) {
      return NextResponse.json(
        { error: "Missing required fields: to, template" },
        { status: 400 },
      );
    }

    const isDev = process.env.NODE_ENV !== "production";
    const appUrl = isDev
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_BASE_URL;

    let subject = "";
    let contentHtml = "";

    // Design helper for a modern Indigo theme
    const getEmailLayout = (
      title: string,
      body: string,
      cta?: { label: string; href: string },
    ) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; color: #111827; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { background: #4f46e5; padding: 32px 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
            .content { padding: 40px 32px; line-height: 1.6; }
            .content h2 { color: #111827; margin-top: 0; font-size: 20px; font-weight: 600; }
            .content p { margin: 16px 0; color: #4b5563; font-size: 16px; }
            .card { background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e5e7eb; }
            .card p { margin: 8px 0; font-size: 15px; color: #374151; }
            .card strong { color: #111827; }
            .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.2s; margin-top: 8px; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { margin: 0; color: #9ca3af; font-size: 14px; }
            @media (max-width: 600px) { .container { margin: 0; border-radius: 0; } .content { padding: 32px 20px; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Keep PH</h1>
            </div>
            <div class="content">
              <h2>${title}</h2>
              ${body}
              ${cta ? `<div style="margin-top: 32px; text-align: center;"><a href="${cta.href}" class="btn">${cta.label}</a></div>` : ""}
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Keep PH. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    switch (template) {
      case "PACKAGE_ARRIVAL":
        subject = "New Package Arrival - Keep PH";
        contentHtml = getEmailLayout(
          "New Package Arrived!",
          `
          <p>Hi ${data.recipientName || "Recipient"},</p>
          <p>A new package has arrived for you at our facility and is ready for your attention.</p>
          <div class="card">
            <p><strong>Package Name:</strong> ${data.packageName}</p>
            <p><strong>Locker Code:</strong> ${data.lockerCode || "N/A"}</p>
          </div>
          <p>Log in to your dashboard to manage your package or request a scan.</p>
          `,
          { label: "View in Dashboard", href: `${appUrl}/dashboard` },
        );
        break;

      case "PACKAGE_DISPOSED":
        subject = "Package Disposed - Keep PH";
        contentHtml = getEmailLayout(
          "Package Disposed",
          `
          <p>Hi ${data.recipientName || "Recipient"},</p>
          <p>This is a formal notification that the following package has been marked as disposed per instructions or policy.</p>
          <div class="card">
            <p><strong>Package Name:</strong> ${data.packageName}</p>
          </div>
          <p>If you have any questions regarding this action, please reach out to our support team.</p>
          `,
        );
        break;

      case "PACKAGE_SCANNED":
        subject = "Package Document Scanned - Keep PH";
        contentHtml = getEmailLayout(
          "Document Scanned",
          `
          <p>Hi ${data.recipientName || "Recipient"},</p>
          <p>Great news! A document from your package has been scanned and is now available for viewing digitally.</p>
          <div class="card">
            <p><strong>Package Name:</strong> ${data.packageName}</p>
          </div>
          <p>You can access your digital copies directly from your Storage section.</p>
          `,
          { label: "View Scans", href: `${appUrl}/dashboard/mailroom` },
        );
        break;

      case "PACKAGE_RELEASED":
        subject = "Package Released - Keep PH";
        contentHtml = getEmailLayout(
          "Package Released",
          `
          <p>Hi ${data.recipientName || "Recipient"},</p>
          <p>Your package has been officially released and collected from our facility.</p>
          <div class="card">
            <p><strong>Package Name:</strong> ${data.packageName}</p>
          </div>
          <p>Thank you for choosing Keep PH. We value your business!</p>
          `,
        );
        break;

      case "KYC_VERIFIED":
        subject = "KYC Verification Successful - Keep PH";
        contentHtml = getEmailLayout(
          "KYC Verified!",
          `
          <p>Hi ${data.recipientName || "User"},</p>
          <p>Congratulations! Your KYC (Know Your Customer) verification has been successfully approved by our team.</p>
          <p>Your account now has full access to all premium features, including package receiving and document management.</p>
          `,
          { label: "Go to Dashboard", href: `${appUrl}/dashboard` },
        );
        break;

      case "KYC_REJECTED":
        subject = "KYC Verification Update - Keep PH";
        contentHtml = getEmailLayout(
          "KYC Verification Update",
          `
          <p>Hi ${data.recipientName || "User"},</p>
          <p>We've reviewed your KYC submission and unfortunately, it could not be approved at this time.</p>
          <div class="card" style="border-left: 4px solid #ef4444; background: #fef2f2;">
            <p><strong>Reason for Rejection:</strong></p>
            <p style="color: #b91c1c;">${data.reason || "The provided documents were unclear or expired."}</p>
          </div>
          <p>Please log in to re-submit valid documents or contact support for more details.</p>
          `,
          { label: "Resubmit Documents", href: `${appUrl}/dashboard/kyc` },
        );
        break;

      case "REWARD_PAID":
        subject = "Reward Claim Paid - Keep PH";
        contentHtml = getEmailLayout(
          "Reward Payment Sent!",
          `
          <p>Hi ${data.recipientName || "User"},</p>
          <p>Great news! Your reward claim has been processed and your payment has been sent.</p>
          <div class="card">
            <p><strong>Amount:</strong> PHP ${data.amount}</p>
            <p><strong>Method:</strong> ${data.paymentMethod}</p>
          </div>
          <p>You can view the proof of payment in your rewards dashboard.</p>
          `,
          { label: "View Rewards", href: `${appUrl}/dashboard/rewards` },
        );
        break;

      case "SUBSCRIPTION_RENEWAL_REMINDER":
        subject = "Subscription Renewal Reminder - Keep PH";
        contentHtml = getEmailLayout(
          "Your Subscription Renews Soon",
          `
          <p>Hi ${data.recipientName || "User"},</p>
          <p>This is a friendly reminder that your mailroom subscription will renew automatically in ${data.daysUntilRenewal || "a few"} days.</p>
          <div class="card">
            <p><strong>Plan:</strong> ${data.planName || "Mailroom Plan"}</p>
            <p><strong>Amount:</strong> PHP ${data.amount || "0.00"}</p>
            <p><strong>Renewal Date:</strong> ${data.renewalDate || "N/A"}</p>
          </div>
          <p>No action is required if you want to continue your subscription. Your payment method on file will be charged automatically.</p>
          <p>If you need to update your payment method or cancel your subscription, please visit your dashboard.</p>
          `,
          { label: "Manage Subscription", href: `${appUrl}/dashboard` },
        );
        break;

      case "SUBSCRIPTION_PAYMENT_FAILED":
        subject = "Subscription Payment Failed - Keep PH";
        contentHtml = getEmailLayout(
          "Payment Failed - Action Required",
          `
          <p>Hi ${data.recipientName || "User"},</p>
          <p>We were unable to process your subscription payment. Your subscription may be paused until payment is received.</p>
          <div class="card" style="border-left: 4px solid #ef4444; background: #fef2f2;">
            <p><strong>Plan:</strong> ${data.planName || "Mailroom Plan"}</p>
            <p><strong>Amount:</strong> PHP ${data.amount || "0.00"}</p>
            <p><strong>Reason:</strong> ${data.reason || "Payment method declined or expired"}</p>
          </div>
          <p>Please update your payment method to continue your subscription service without interruption.</p>
          `,
          { label: "Update Payment Method", href: `${appUrl}/dashboard` },
        );
        break;

      case "SUBSCRIPTION_ACTIVATED":
        subject = "Subscription Activated - Keep PH";
        contentHtml = getEmailLayout(
          "Welcome to Keep PH Mailroom!",
          `
          <p>Hi ${data.recipientName || "User"},</p>
          <p>Great news! Your mailroom subscription has been successfully activated.</p>
          <div class="card" style="border-left: 4px solid #10b981; background: #f0fdf4;">
            <p><strong>Plan:</strong> ${data.planName || "Mailroom Plan"}</p>
            <p><strong>Billing Cycle:</strong> ${data.billingCycle || "Monthly"}</p>
            <p><strong>Next Billing Date:</strong> ${data.nextBillingDate || "N/A"}</p>
          </div>
          <p>You can now start using all the features of your mailroom subscription. Access your dashboard to manage packages and view your subscription details.</p>
          `,
          { label: "Go to Dashboard", href: `${appUrl}/dashboard` },
        );
        break;

      case "SUBSCRIPTION_CANCELLED":
        subject = "Subscription Cancelled - Keep PH";
        contentHtml = getEmailLayout(
          "Subscription Cancelled",
          `
          <p>Hi ${data.recipientName || "User"},</p>
          <p>Your mailroom subscription has been cancelled as requested.</p>
          <div class="card">
            <p><strong>Plan:</strong> ${data.planName || "Mailroom Plan"}</p>
            <p><strong>Cancellation Date:</strong> ${data.cancellationDate || "N/A"}</p>
            <p><strong>Access Until:</strong> ${data.accessUntil || "End of current billing period"}</p>
          </div>
          <p>You will continue to have access to your mailroom services until the end of your current billing period.</p>
          <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime.</p>
          `,
          {
            label: "Reactivate Subscription",
            href: `${appUrl}/mailroom/register`,
          },
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unknown template: ${template}` },
          { status: 400 },
        );
    }

    const fromAddress = isDev
      ? "onboarding@resend.dev"
      : (process.env.RESEND_DOMAIN ?? "onboarding@resend.dev");

    const { data: resendData, error } = await resend.emails.send({
      from: `Keep PH <${fromAddress}>`,
      to: [to],
      subject,
      html: contentHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: resendData?.id });
  } catch (err: unknown) {
    console.error("Email API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

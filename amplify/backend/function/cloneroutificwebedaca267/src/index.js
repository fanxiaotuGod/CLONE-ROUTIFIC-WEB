const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const sesClient = new SESClient({ region: process.env.REGION });

// A trivial comment to force redeployment
const EMAIL_TEMPLATE = `Dear {CUSTOMER_NAME},

We hope you're having a great day!

This is a confirmation for your upcoming delivery scheduled on **{DELIVERY_DATE}**.
Your estimated time of arrival (ETA) is **{ETA}**.

Here is a quick summary of your delivery:
{SUMMARY}

If you have any questions or need to update your delivery preferences, feel free to contact us at support@demo-routific.com or reply to this email.

Thank you for choosing Demo-Routific!

Warm regards,
Haocheng Fan
Demo-Routific, Vancouver BC`;

/**
 * @type {import('@types/aws-lambda').AppSyncResolverHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const { to, customerName, eta, summary } = event.arguments;
  const fromEmail = 'hfan05@student.ubc.ca'; // Must be a verified SES identity

  // --- TEST EMAIL ---
  // First, always send a test email to confirm the Lambda and SES are working.
  try {
    const testParams = {
      Source: fromEmail,
      Destination: { ToAddresses: ['fhc991115@gmail.com'] }, // Must be a verified SES identity
      Message: {
        Body: { Text: { Data: `This is a test email from the Routific clone application to confirm SES is working. A real email was triggered for ${customerName} to ${to}.` } },
        Subject: { Data: 'Routific App - SES Test' },
      },
    };
    await sesClient.send(new SendEmailCommand(testParams));
    console.log("Test email sent successfully.");
  } catch (error) {
    console.error("CRITICAL: Failed to send test email.", error);
    // We don't return here, so we still attempt the main email.
  }
  // --- END TEST ---


  if (!to || !customerName || !eta || !summary) {
    console.error("Validation Error: Missing required fields.");
    // Returning a string message as the GraphQL schema expects a String.
    return "Error: Missing required fields.";
  }

  // Prevent sending to placeholder emails
  if (to.includes('example.com')) {
    const skipMessage = `Skipping example.com email for ${customerName}`;
    console.log(skipMessage);
    return skipMessage;
  }

  const deliveryDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const body = EMAIL_TEMPLATE.replace('{CUSTOMER_NAME}', customerName)
                           .replace('{DELIVERY_DATE}', deliveryDate)
                           .replace('{ETA}', eta)
                           .replace('{SUMMARY}', summary);

  const subject = `Your Upcoming Delivery Details for ${summary}`;

  const params = {
    Source: fromEmail,
    Destination: { ToAddresses: [to] },
    Message: {
      Body: { Text: { Data: body } },
      Subject: { Data: subject },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    const successMessage = `Email sent successfully to ${to}`;
    console.log(successMessage);
    return successMessage;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    // Return a descriptive error message to the client.
    return `Error sending email: ${error.message}`;
  }
};

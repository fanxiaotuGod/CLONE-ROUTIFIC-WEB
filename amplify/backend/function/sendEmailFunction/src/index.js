const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const sesClient = new SESClient({ region: process.env.REGION });

const EMAIL_TEMPLATE = `Dear {CUSTOMER_NAME},

This is a confirmation for your upcoming delivery scheduled on **{DELIVERY_DATE}**.
Your estimated time of arrival (ETA) is **{ETA}**.

Here is a quick summary of your delivery:
{SUMMARY}

Thank you for choosing Demo-Routific!

Warm regards,
Haocheng Fan`;

/**
 * @type {import('@types/aws-lambda').AppSyncResolverHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const { to, customerName, eta, summary } = event.arguments;
  // NOTE: This "From" address MUST be a verified identity in your AWS SES account.
  const fromEmail = 'hfan05@student.ubc.ca'; 

  if (!to || !customerName || !eta || !summary) {
    console.error("Validation Error: Missing required fields.");
    return "Error: Missing required fields.";
  }
  
  // NOTE: The "To" address must also be verified while your SES account is in sandbox mode.
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
    return `Error sending email: ${error.message}`;
  }
};
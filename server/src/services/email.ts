import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'FleetTracker <noreply@fleettracker.com>',
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error('Failed to send email', { error: error instanceof Error ? error.message : String(error) });
  }
};

export const sendCheckoutNotification = async (email: string, vehicle: string, destination: string) => {
  const subject = 'Vehicle Checked Out - FleetTracker';
  const html = `
    <h2>Vehicle Checked Out</h2>
    <p>A vehicle has been checked out from the fleet:</p>
    <ul>
      <li><strong>Vehicle:</strong> ${vehicle}</li>
      <li><strong>Destination:</strong> ${destination}</li>
      <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
    </ul>
  `;
  await sendEmail(email, subject, html);
};

export const sendServiceReminder = async (email: string, vehicle: string, milesUntil: number) => {
  const subject = 'Service Reminder - FleetTracker';
  const html = `
    <h2>Service Reminder</h2>
    <p>Vehicle <strong>${vehicle}</strong> is due for service in approximately <strong>${milesUntil} miles</strong>.</p>
    <p>Please schedule service soon to maintain the vehicle.</p>
  `;
  await sendEmail(email, subject, html);
};

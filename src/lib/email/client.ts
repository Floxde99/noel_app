import nodemailer from 'nodemailer'

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null

export function getEmailTransporter() {
  // Skip if email not configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    console.warn('⚠️ Email not configured - skipping email sending')
    return null
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  return transporter
}

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = getEmailTransporter()
  
  if (!transporter) {
    return false // Email not configured
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      ...options,
    })
    return true
  } catch (error) {
    console.error('❌ Email send error:', error)
    return false
  }
}

import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

const otpStore = new Map<string, { code: string; expiresAt: number }>();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env["GMAIL_USER"],
    pass: process.env["GMAIL_APP_PASSWORD"],
  },
});

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/otp/send", async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "E-posta gereklidir." });
    return;
  }

  const code = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 dakika

  otpStore.set(email.toLowerCase(), { code, expiresAt });

  try {
    await transporter.sendMail({
      from: `"Braw" <${process.env["GMAIL_USER"]}>`,
      to: email,
      subject: "Braw - Doğrulama Kodun",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8f9fa; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="background: #2563eb; width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span style="color: white; font-size: 28px; font-weight: 800;">B</span>
            </div>
            <h1 style="color: #0f0f0f; font-size: 24px; margin: 0;">Braw</h1>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px; text-align: center;">
            <p style="color: #64748b; font-size: 15px; margin: 0 0 24px;">E-posta doğrulama kodun:</p>
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #2563eb;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Bu kod 10 dakika geçerlidir. Kimseyle paylaşma.</p>
          </div>
        </div>
      `,
    });

    req.log.info({ email }, "OTP sent");
    res.json({ success: true, message: "OTP gönderildi." });
  } catch (err) {
    req.log.error({ err }, "Failed to send OTP email");
    res.status(500).json({ error: "E-posta gönderilemedi." });
  }
});

router.post("/otp/verify", (req, res) => {
  const { email, code } = req.body as { email?: string; code?: string };

  if (!email || !code) {
    res.status(400).json({ error: "E-posta ve kod gereklidir." });
    return;
  }

  const stored = otpStore.get(email.toLowerCase());

  if (!stored) {
    res.status(400).json({ error: "OTP bulunamadı. Tekrar gönder." });
    return;
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    res.status(400).json({ error: "OTP süresi dolmuş. Tekrar gönder." });
    return;
  }

  if (stored.code !== code.trim()) {
    res.status(400).json({ error: "Kod yanlış." });
    return;
  }

  otpStore.delete(email.toLowerCase());
  req.log.info({ email }, "OTP verified");
  res.json({ success: true, message: "Doğrulama başarılı." });
});

export default router;

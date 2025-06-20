import { sendEmail } from '../services/emailSender.js'; 
import { CommunicationLog } from '../models/CommunicationLog.js';

export const simulateCampaignDelivery = async (req, res) => {
  try {
    const { campaignId, customers, baseMessage, userId } = req.body;

    const logs = [];

    for (const customer of customers) {
      const htmlMessage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Campaign Message</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.7;
              color: #1a202c;
              margin: 0;
              padding: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            
            .email-wrapper {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              min-height: 100vh;
            }
            
            .email-container {
              max-width: 650px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 20px;
              box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
              overflow: hidden;
              position: relative;
            }
            
            .email-container::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 6px;
              background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7);
              background-size: 300% 300%;
              animation: gradientShift 6s ease infinite;
            }
            
            @keyframes gradientShift {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
            
            .header {
              background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
              color: white;
              padding: 50px 40px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              animation: pulse 4s ease-in-out infinite;
            }
            
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
            
            .header-icon {
              width: 80px;
              height: 80px;
              margin: 0 auto 20px;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 36px;
              position: relative;
              z-index: 1;
            }
            
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: -0.5px;
              position: relative;
              z-index: 1;
            }
            
            .header-subtitle {
              margin-top: 10px;
              font-size: 16px;
              opacity: 0.9;
              font-weight: 300;
              position: relative;
              z-index: 1;
            }
            
            .content {
              padding: 50px 40px;
              background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            }
            
            .greeting {
              font-size: 24px;
              color: #2d3748;
              margin-bottom: 25px;
              font-weight: 600;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            
            .intro-text {
              font-size: 18px;
              color: #4a5568;
              margin-bottom: 30px;
              font-weight: 400;
              line-height: 1.8;
            }
            
            .main-message {
              background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
              border: 2px solid #e2e8f0;
              border-left: 6px solid #667eea;
              border-radius: 15px;
              padding: 30px;
              margin: 35px 0;
              font-size: 17px;
              line-height: 1.8;
              color: #2d3748;
              position: relative;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }
            
            .main-message::before {
              content: '💫';
              position: absolute;
              top: -10px;
              right: 20px;
              background: white;
              padding: 0 10px;
              font-size: 20px;
            }
            
            .cta-section {
              text-align: center;
              margin: 45px 0;
              padding: 30px;
              background: linear-gradient(135deg, #edf2f7 0%, #ffffff 100%);
              border-radius: 20px;
              border: 1px solid #e2e8f0;
            }
            
            .cta-text {
              font-size: 18px;
              color: #e53e3e;
              font-weight: 600;
              margin-bottom: 25px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 18px 40px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: 1px;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
              position: relative;
              overflow: hidden;
            }
            
            .cta-button::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
              transition: left 0.5s;
            }
            
            .cta-button:hover::before {
              left: 100%;
            }
            
            .cta-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
            }
            
            .features-section {
              display: flex;
              gap: 20px;
              margin: 40px 0;
              flex-wrap: wrap;
            }
            
            .feature-card {
              flex: 1;
              min-width: 150px;
              padding: 20px;
              background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
              border-radius: 15px;
              text-align: center;
              border: 1px solid #e2e8f0;
              transition: transform 0.3s ease;
            }
            
            .feature-card:hover {
              transform: translateY(-5px);
            }
            
            .feature-icon {
              font-size: 30px;
              margin-bottom: 10px;
            }
            
            .feature-title {
              font-size: 14px;
              font-weight: 600;
              color: #2d3748;
            }
            
            .closing {
              margin-top: 40px;
              font-size: 17px;
              color: #4a5568;
              line-height: 1.8;
              padding: 25px;
              background: linear-gradient(135deg, #f0fff4 0%, #f7fafc 100%);
              border-radius: 15px;
              border-left: 4px solid #48bb78;
            }
            
            .signature {
              margin-top: 35px;
              padding: 30px 0;
              border-top: 2px solid #e2e8f0;
              color: #4a5568;
              text-align: center;
            }
            
            .signature-title {
              font-size: 18px;
              font-weight: 600;
              color: #2d3748;
              margin-bottom: 10px;
            }
            
            .company-name {
              font-weight: 700;
              font-size: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-top: 10px;
            }
            
            .footer {
              background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
              color: #e2e8f0;
              padding: 40px;
              text-align: center;
            }
            
            .footer-content {
              max-width: 400px;
              margin: 0 auto;
            }
            
            .footer p {
              margin: 8px 0;
              font-size: 14px;
              line-height: 1.6;
            }
            
            .social-links {
              margin-top: 25px;
              padding-top: 25px;
              border-top: 1px solid #4a5568;
            }
            
            .social-links a {
              color: #a0aec0;
              text-decoration: none;
              margin: 0 15px;
              font-size: 14px;
              font-weight: 500;
              transition: color 0.3s ease;
            }
            
            .social-links a:hover {
              color: #667eea;
            }
            
            .divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
              margin: 30px 0;
            }
            
            @media only screen and (max-width: 650px) {
              .email-wrapper {
                padding: 20px 10px;
              }
              
              .email-container {
                border-radius: 15px;
                margin: 0;
              }
              
              .content, .header {
                padding: 30px 25px;
              }
              
              .header h1 {
                font-size: 26px;
              }
              
              .greeting {
                font-size: 20px;
              }
              
              .intro-text {
                font-size: 16px;
              }
              
              .main-message {
                padding: 20px;
                font-size: 16px;
              }
              
              .cta-button {
                padding: 15px 30px;
                font-size: 14px;
              }
              
              .features-section {
                flex-direction: column;
              }
              
              .feature-card {
                min-width: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header">
                <div class="header-icon">🎯</div>
                <h1>Exclusive Campaign</h1>
                <div class="header-subtitle">Something amazing awaits you</div>
              </div>
              
              <div class="content">
                <div class="greeting">
                  Hello ${customer.name}! 👋
                </div>
                
                <div class="intro-text">
                  We're thrilled to share something extraordinary with you. As one of our valued community members, you deserve to be the first to know about this exciting opportunity.
                </div>
                
                <div class="main-message">
                  ${baseMessage}
                </div>
                
                <div class="features-section">
                  <div class="feature-card">
                    <div class="feature-icon">⚡</div>
                    <div class="feature-title">Fast & Secure</div>
                  </div>
                  <div class="feature-card">
                    <div class="feature-icon">🎁</div>
                    <div class="feature-title">Exclusive Offer</div>
                  </div>
                  <div class="feature-card">
                    <div class="feature-icon">🛡️</div>
                    <div class="feature-title">Trusted Platform</div>
                  </div>
                </div>
                
                <div class="cta-section">
                  <div class="cta-text">
                    🔥 Limited Time - Don't Miss Out!
                  </div>
                  <a href="#" class="cta-button">Get Started Now</a>
                </div>
                
                <div class="divider"></div>
                
                <div class="closing">
                  <strong>Thank you for being an incredible part of our journey!</strong> Your support and engagement mean the world to us. We're committed to bringing you the best experiences and opportunities, and this is just the beginning of what we have in store for you.
                </div>
                
                <div class="signature">
                  <div class="signature-title">With warm regards,</div>
                  <p>The Innovation Team</p>
                  <div class="company-name">Your Company Name</div>
                </div>
              </div>
              
              <div class="footer">
                <div class="footer-content">
                  <p><strong>&copy; 2025 Mini CRM</strong></p>
                  <p>Transforming ideas into reality, one innovation at a time.</p>
                  <p>You're receiving this because you're part of our exclusive community.</p>
                  
                  <div class="social-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Update Preferences</a>
                    <a href="#">Unsubscribe</a>
                    <a href="#">Contact Support</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send HTML email
      const result = await sendEmail(customer.email, '🎯 Exclusive Campaign - Don\'t Miss Out!', htmlMessage, true);

      const log = new CommunicationLog({
        campaignId,
        customerId: customer._id,
        userId: userId,
        message: htmlMessage,
        status: result.success ? 'SENT' : 'FAILED',
        vendorResponse: result.success
          ? `Message ID: ${result.messageId}`
          : `Error: ${result.error}`,
      });

      await log.save();
      logs.push(log);
    }

    res.status(200).json({ message: 'Enhanced HTML emails processed successfully.', logs });
  } catch (error) {
    console.error('simulateCampaignDelivery error:', error);
    res.status(500).json({ error: error.message });
  }
};


export const updateDeliveryReceipt = async (req, res) => {
  try {
    const { logId, status, vendorResponse } = req.body;

    await CommunicationLog.findByIdAndUpdate(logId, {
      status,
      vendorResponse,
    });

    res.status(200).json({ message: 'Delivery status updated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLogsByCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const logs = await CommunicationLog.find({ campaignId }).populate('customerId');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

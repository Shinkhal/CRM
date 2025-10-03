import Business from '../models/business.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../services/emailSender.js';


export const inviteMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const business = await Business.findById(req.user.businessId);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Only admins can invite
    const inviter = business.users.find(
      u => u.user.toString() === req.user.id && u.role === "admin"
    );
    if (!inviter) {
      return res
        .status(403)
        .json({ message: "Only admins can invite team members" });
    }

    // Check if a user with this email exists
    const existingUser = await User.findOne({ email });

    // If user exists, make sure they’re not already part of this business
    const alreadyMember =
      existingUser &&
      business.users.some(
        u => u.user.toString() === existingUser._id.toString()
      );

    const alreadyInvited = business.pendingInvites.some(
      inv => inv.email === email
    );

    if (alreadyMember || alreadyInvited) {
      return res
        .status(400)
        .json({ message: "User already exists or is already invited" });
    }

    // Generate invite token
    const token = jwt.sign(
      { email, businessId: business._id, role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Save invite
    business.pendingInvites.push({ email, role, token });
    await business.save();

    // Send invitation email
    const inviteLink = `${process.env.SERVER_URL}/auth/google?inviteToken=${token}`;

    const emailSubject = `You're invited to join ${business.name}!`;
    const emailBody = generateInviteEmailHTML({
      businessName: business.name,
      role,
      inviteLink,
      email,
    });

    const emailResult = await sendEmail(email, emailSubject, emailBody, true);
    if (!emailResult.success) {
      console.error("Failed to send invite email:", emailResult.error);
      return res
        .status(500)
        .json({ message: "Failed to send invitation email" });
    }

    res.json({ message: `Invite sent to ${email}` });
  } catch (err) {
    console.error("inviteMember error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export const acceptInvite = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { email, businessId, role } = decoded;

    // Ensure the logged-in user email matches invite
    if (req.user.email !== email) {
      return res.status(403).json({ message: 'Invite not valid for this account' });
    }

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    // 🚨 Check if user already belongs to a business
    const alreadyInBusiness = await Business.findOne({ "users.user": req.user.id });
    if (alreadyInBusiness) {
      return res.status(400).json({ message: "User already belongs to another business" });
    }

    // Add user to business users
    business.users.push({ user: req.user.id, role });

    // Remove from pending invites
    business.pendingInvites = business.pendingInvites.filter(inv => inv.email !== email);

    await business.save();

    // Send welcome email
    const welcomeSubject = `Welcome to ${business.name}!`;
    const welcomeEmailBody = generateWelcomeEmailHTML({
      businessName: business.name,
      userName: req.user.name,
      role
    });

    const welcomeEmailResult = await sendEmail(
      req.user.email,
      welcomeSubject,
      welcomeEmailBody,
      true
    );

    if (!welcomeEmailResult.success) {
      console.error("Failed to send welcome email:", welcomeEmailResult.error);
      // Continue even if welcome email fails
    }

    res.json({ message: "Joined business successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid or expired token" });
  }
};


export const getTeam = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId)
      .populate("users.user", "name email"); // ✅ only pull from User schema

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    res.json({
      users: business.users, // each will have { user: {name, email}, role }
      pendingInvites: business.pendingInvites
    });
  } catch (err) {
    console.error("getTeam error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const updateMemberRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["admin", "manager", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    // Check if user exists and belongs to the same business
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.business.toString() !== req.user.businessId.toString()) {
      return res.status(403).json({ message: "User not in your business" });
    }

    // Update role
    user.role = role;
    await user.save();

    // Fetch updated business users with populated user info
    const business = await Business.findById(req.user.businessId).populate({
      path: "users",
      select: "_id name email role",
    });

    const usersWithRole = business.users.map((u) => ({ user: u, role: u.role }));

    res.json({
      message: "Role updated successfully",
      users: usersWithRole,
      pendingInvites: business.pendingInvites,
    });
  } catch (err) {
    console.error("updateMemberRole error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const removeMember = async (req, res) => {
  try {
    const { userId } = req.body;

    const business = await Business.findById(req.user.businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // ✅ Only admins can remove members
    const requestingUser = business.users.find(u => u.user.toString() === req.user.id);
    if (!requestingUser || requestingUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    // ✅ Check if target user exists in the business
    const targetUser = business.users.find(u => u.user.toString() === userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found in team" });
    }

    // ✅ Prevent removing the only admin
    if (targetUser.role === "admin") {
      const adminCount = business.users.filter(u => u.role === "admin").length;
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot remove the only admin" });
      }
    }

    // ✅ Remove member
    business.users = business.users.filter(u => u.user.toString() !== userId);
    await business.save();

    // ✅ Return updated populated list
    const updatedBusiness = await Business.findById(req.user.businessId)
      .populate("users.user", "name email");

    res.json({
      message: "User removed from team",
      users: updatedBusiness.users,
    });
  } catch (err) {
    console.error("removeMember error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// --------------------
// Generate HTML email template for invitation
// --------------------
const generateInviteEmailHTML = ({ businessName,  role, inviteLink, email }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 0;
                background-color: #f4f4f4;
            }
            .email-container {
                background-color: #ffffff;
                margin: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .business-name {
                color: #667eea;
                font-weight: 600;
                font-size: 18px;
            }
            .role-badge {
                display: inline-block;
                background-color: #e8f2ff;
                color: #2563eb;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
                margin: 10px 0;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: 600;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .cta-button:hover {
                transform: translateY(-2px);
            }
            .info-box {
                background-color: #f8fafc;
                border-left: 4px solid #667eea;
                padding: 20px;
                margin: 20px 0;
                border-radius: 0 5px 5px 0;
            }
            .footer {
                background-color: #f8fafc;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e2e8f0;
            }
            .expires-note {
                color: #e53e3e;
                font-size: 14px;
                margin-top: 20px;
            }
            @media only screen and (max-width: 600px) {
                .email-container {
                    margin: 10px;
                }
                .content {
                    padding: 20px;
                }
                .header {
                    padding: 20px;
                }
                .header h1 {
                    font-size: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🎉 You're Invited!</h1>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                
                <p>You have been invited to join the team at <span class="business-name">${businessName}</span>.</p>
                
                <div class="info-box">
                    <h3 style="margin-top: 0; color: #2d3748;">Invitation Details</h3>
                    <p><strong>Business:</strong> ${businessName}</p>
                    <p><strong>Role:</strong> <span class="role-badge">${role.charAt(0).toUpperCase() + role.slice(1)}</span></p>
                    <p><strong>Email:</strong> ${email}</p>
                </div>
                
                <p>Click the button below to accept your invitation and join the team:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
                </div>
                
                <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                <p style="background-color: #f1f5f9; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px;">
                    ${inviteLink}
                </p>
                
                <div class="expires-note">
                    ⚠️ <strong>Important:</strong> This invitation will expire in 7 days.
                </div>
            </div>
            
            <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// --------------------
// Generate welcome email template
// --------------------
const generateWelcomeEmailHTML = ({ businessName, userName, role }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${businessName}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 0;
                background-color: #f4f4f4;
            }
            .email-container {
                background-color: #ffffff;
                margin: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .business-name {
                color: #48bb78;
                font-weight: 600;
                font-size: 18px;
            }
            .role-badge {
                display: inline-block;
                background-color: #f0fff4;
                color: #22543d;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
                margin: 10px 0;
            }
            .footer {
                background-color: #f8fafc;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e2e8f0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🎊 Welcome to the Team!</h1>
            </div>
            
            <div class="content">
                <p>Hi ${userName},</p>
                
                <p>Welcome to <span class="business-name">${businessName}</span>! We're excited to have you on board as a <span class="role-badge">${role.charAt(0).toUpperCase() + role.slice(1)}</span>.</p>
                
                <p>You now have access to your team dashboard and can start collaborating with your colleagues right away.</p>
                
                <p>If you have any questions or need help getting started, don't hesitate to reach out to your team members.</p>
                
                <p>Welcome aboard! 🚀</p>
            </div>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};
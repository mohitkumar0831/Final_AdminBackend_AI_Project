


export function shortlistedCandidate(candidateName, jdTitle, companyName, applyUrl) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#28a745;">Congratulations! 🎉</h2>
      <p>Dear <strong>${candidateName}</strong>,</p>
      <p>We are thrilled to inform you that you have been <strong>shortlisted</strong> for the position of <strong>${jdTitle}</strong> at <strong>${companyName}</strong>!</p>
      <p>Your profile impressed our recruitment team, and we believe you would be a great fit for this role.</p>
      <h3 style="color:#2b2b2b;margin-top:24px;">Your Examination is Scheduled 📝</h3>
      <p style="padding:16px;background:#e3f2fd;border-left:4px solid #2196F3;border-radius:4px;color:#2b2b2b;margin:16px 0;">
        <strong>Great News!</strong> Your examination has been scheduled. Please log in with your credentials to access your examination section where you will find the examination link and further instructions.
      </p>
      <h3 style="color:#2b2b2b;margin-top:24px;">How to Access Your Examination:</h3>
      <ol style="color:#2b2b2b;line-height:1.8;">
        <li>Visit the examination portal using the link below</li>
        <li>Log in with your registered credentials</li>
        <li>Navigate to your "Examination" section</li>
        <li>Click on the examination link to begin</li>
      </ol>
      <p style="margin-top:24px;text-align:center;">
        <a href="${applyUrl}" style="display:inline-block;padding:12px 24px;background:#28a745;color:white;text-decoration:none;border-radius:4px;font-weight:bold;">Access Your Examination</a>
      </p>
      <p style="margin-top:24px;padding:16px;background:#fff3cd;border-left:4px solid #ffc107;border-radius:4px;color:#2b2b2b;">
        <strong>Important:</strong> Please ensure you have a stable internet connection and clear your browser cache before starting the examination. If you encounter any issues accessing the examination link, please contact our support team.
      </p>
      <p style="margin-top:24px;color:#555;">If you have any questions or concerns, feel free to reach out to us. We wish you the best of luck!</p>
      <hr style="margin:32px 0;">
      <p style="font-size:12px;color:#888;">This is an automated message from our recruitment system. Please do not reply directly.</p>
    </div>
  `;
}

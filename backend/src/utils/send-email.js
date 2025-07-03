const { Resend } = require("resend");
const { env } = require("../config");
const { ApiError } = require("./api-error");

let resend;
try {
    resend = new Resend(env.RESEND_API_KEY);
} catch (error) {
    console.warn("Email service not configured. Emails will not be sent.");
    resend = {
        emails: {
            send: async() => ({ error: null }) // Mock successful email sending
        }
    };
}

const sendMail = async(mailOptions) => {
    try {
        const { error } = await resend.emails.send(mailOptions);
        if (error) {
            console.error("Failed to send email:", error);
            throw new ApiError(500, "Unable to send email");
        }
    } catch (error) {
        console.warn("Email not sent:", mailOptions);
        // Don't throw error in development
        if (process.env.NODE_ENV === "production") {
            throw new ApiError(500, "Unable to send email");
        }
    }
};

module.exports = {
    sendMail,
};
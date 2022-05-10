const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const fromEmail = process.env.SENDGRID_EMAIL;

const registrationTemplateId = process.env.SENDGRID_REGISTRATION_TEMPLATE_ID;

const passwordRecoveryTemplateId =
	process.env.SENDGRID_PASSWORD_RECOVERY_TEMPLATE_ID;

const emailChangeTemplateId = process.env.SENDGRID_EMAIL_CHANGE_TEMPLATE_ID;

const deleteAccountTemplateId = process.env.SENDGRID_DELETE_ACCOUNT_TEMPLATE_ID;

const frontendUrl = process.env.FRONTEND_URL;

module.exports = {
	sgMail,
	fromEmail,
	registrationTemplateId,
	passwordRecoveryTemplateId,
	emailChangeTemplateId,
	deleteAccountTemplateId,
	frontendUrl,
};
